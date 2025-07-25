const CACHE_NAME = 'roof-guardian-v1';
const STATIC_CACHE_NAME = 'roof-guardian-static-v1';
const DATA_CACHE_NAME = 'roof-guardian-data-v1';

const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

const API_ENDPOINTS = [
  '/rest/v1/inspections',
  '/rest/v1/roofs',
  '/rest/v1/profiles'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - network first, then cache for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with network first strategy
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }
  
  // Handle static files with cache first strategy
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'manifest') {
    event.respondWith(
      cacheFirstStrategy(request)
    );
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstStrategy(request)
        .catch(() => {
          return caches.match('/');
        })
    );
    return;
  }
  
  // Default: try network, fallback to cache
  event.respondWith(
    networkFirstStrategy(request)
  );
});

// Network first strategy - for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DATA_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an API request and we have no cache, return a custom offline response
    if (request.url.includes('/rest/v1/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This data is not available offline',
          offline: true 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache first strategy - for static files
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  }
  
  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

// Sync offline inspection data when connection restored
async function syncInspections() {
  try {
    console.log('[SW] Syncing offline inspections...');
    
    // Get offline data from IndexedDB
    const offlineData = await getOfflineInspections();
    
    for (const inspection of offlineData) {
      try {
        await fetch('/rest/v1/inspections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(inspection)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineInspection(inspection.id);
        console.log('[SW] Synced inspection:', inspection.id);
      } catch (error) {
        console.error('[SW] Failed to sync inspection:', inspection.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync offline comments when connection restored
async function syncComments() {
  try {
    console.log('[SW] Syncing offline comments...');
    
    const offlineComments = await getOfflineComments();
    
    for (const comment of offlineComments) {
      try {
        await fetch('/rest/v1/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(comment)
        });
        
        await removeOfflineComment(comment.id);
        console.log('[SW] Synced comment:', comment.id);
      } catch (error) {
        console.error('[SW] Failed to sync comment:', comment.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Comment sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineInspections() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofGuardianOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['inspections'], 'readonly');
      const store = transaction.objectStore('inspections');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };
      
      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function getOfflineComments() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofGuardianOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['comments'], 'readonly');
      const store = transaction.objectStore('comments');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };
      
      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function removeOfflineInspection(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofGuardianOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['inspections'], 'readwrite');
      const store = transaction.objectStore('inspections');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function removeOfflineComment(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoofGuardianOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['comments'], 'readwrite');
      const store = transaction.objectStore('comments');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'roof-guardian-notification',
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Roof Guardian', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});