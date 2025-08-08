/**
 * Enhanced Service Worker for Offline-First Inspector Interface
 * Enables comprehensive field inspections without internet connectivity
 * Supports photo caching, inspection data sync, and critical issue management
 */

const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : Date.now().toString();
const CACHE_NAME = `roofmind-inspector-${BUILD_VERSION}`;
const PHOTO_CACHE = `roofmind-photos-${BUILD_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Critical resources to cache for offline functionality
const CRITICAL_RESOURCES = [
  '/',
  '/inspector',
  '/manifest.json',
  '/offline.html',
  // Add your main JS/CSS bundles here
  // These will be populated by your build process
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/properties/,
  /\/api\/inspections/,
  /\/api\/roofs/,
  /\/api\/inspection-reports/
];

// React chunks that should NOT be cached to prevent dispatcher corruption
const REACT_CHUNKS = ['/node_modules/.vite/deps/chunk-', 'react', 'ReactDOM'];

// Check if request is a React chunk that should not be cached
function isReactChunk(url) {
  return REACT_CHUNKS.some(chunk => url.includes(chunk));
}

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - implement offline-first strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return cached version or offline page
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle API requests with cache-first strategy for GET requests
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET' && shouldCacheAPIRequest(url.pathname)) {
      event.respondWith(
        caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              // Return cached version and update in background
              fetchAndCache(request);
              return cachedResponse;
            }
            
            // No cache, try network
            return fetchAndCache(request);
          })
      );
    } else if (request.method !== 'GET') {
      // Handle POST/PUT/DELETE requests for offline sync
      event.respondWith(
        handleOfflineWrite(request)
      );
    }
    return;
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    
    // Don't cache React chunks that can cause dispatcher corruption
    if (isReactChunk(request.url)) {
      event.respondWith(fetch(request));
      return;
    }
    
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          return cachedResponse || fetch(request)
            .then(response => {
              // Cache the response for future use
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'inspection-sync') {
    event.waitUntil(syncInspectionData());
  } else if (event.tag === 'photo-sync') {
    event.waitUntil(syncPhotoData());
  }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_INSPECTION_DATA':
      cacheInspectionData(data);
      break;
      
    case 'GET_OFFLINE_STATUS':
      (async () => {
        const count = await getQueuedItemsCount();
        event.ports[0].postMessage({
          isOffline: !navigator.onLine,
          queuedItems: count,
        });
      })();
      break;
      
    case 'FORCE_SYNC':
      triggerBackgroundSync();
      break;
  }
});

// Utility functions
function shouldCacheAPIRequest(pathname) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(pathname));
}

async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('Network request failed:', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function handleOfflineWrite(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Network failed, queue for later sync
    console.log('Queueing offline request:', request.url);
    
    const requestData = {
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    await queueOfflineRequest(requestData);
    
    // Register for background sync if available
    if ('sync' in self.registration) {
      await self.registration.sync.register('inspection-sync');
    }
    
    // Return a success response for the UI
    return new Response(
      JSON.stringify({ 
        success: true, 
        offline: true, 
        message: 'Data queued for sync when online' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function queueOfflineRequest(requestData) {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction(['requests'], 'readwrite');
    const store = transaction.objectStore('requests');
    await store.add(requestData);
  } catch (error) {
    console.error('Failed to queue offline request:', error);
  }
}

async function syncInspectionData() {
  console.log('Syncing inspection data...');
  
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction(['requests'], 'readonly');
    const store = transaction.objectStore('requests');
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          // Remove from queue
          const deleteTransaction = db.transaction(['requests'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('requests');
          await deleteStore.delete(requestData.id);
          
          console.log('Synced request:', requestData.url);
        }
      } catch (error) {
        console.error('Failed to sync request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

async function syncPhotoData() {
  console.log('Syncing photo data...');
  // Implementation for photo sync
}

async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofGuardianOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('requests')) {
        const requestStore = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        requestStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        photoStore.createIndex('inspectionId', 'inspectionId');
      }
      
      if (!db.objectStoreNames.contains('inspections')) {
        db.createObjectStore('inspections', { keyPath: 'id' });
      }
    };
  });
}

async function getQueuedItemsCount() {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction(['requests'], 'readonly');
    const store = transaction.objectStore('requests');
    return new Promise((resolve, reject) => {
      const countRequest = store.getAllKeys();
      countRequest.onsuccess = () => resolve(countRequest.result.length || 0);
      countRequest.onerror = () => reject(0);
    });
  } catch (e) {
    return 0;
  }
}

function triggerBackgroundSync() {
  if ('sync' in self.registration) {
    self.registration.sync.register('inspection-sync');
    self.registration.sync.register('photo-sync');
  }
}

async function cacheInspectionData(data) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/inspections/${data.id}`, response);
  } catch (error) {
    console.error('Failed to cache inspection data:', error);
  }
}