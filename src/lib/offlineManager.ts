/**
 * Enhanced Offline Manager for RoofMind Inspector Interface
 * Handles comprehensive offline data storage, sync, photo caching, and connectivity detection
 * Supports critical issue management and real-time synchronization
 */

import { inspectorEventBus, INSPECTOR_EVENTS } from './eventBus';

export interface OfflineData {
  id: string;
  type: 'inspection' | 'photo' | 'deficiency' | 'voice_note';
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

export interface OfflineManagerConfig {
  maxRetries: number;
  retryDelay: number;
  enableAutoSync: boolean;
  cacheDuration: number;
}

class OfflineManager {
  private config: OfflineManagerConfig;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private offlineData: Map<string, OfflineData> = new Map();
  private dbName = 'RoofGuardianOffline';
  private dbVersion = 1;

  constructor(config: Partial<OfflineManagerConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      enableAutoSync: true,
      cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.initializeOfflineManager();
  }

  private async initializeOfflineManager() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Setup connectivity listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Initialize IndexedDB
    await this.initializeDB();

    // Load existing offline data
    await this.loadOfflineData();

    // Setup periodic sync if enabled
    if (this.config.enableAutoSync) {
      setInterval(() => {
        if (this.isOnline && !this.syncInProgress) {
          this.syncOfflineData();
        }
      }, 30000); // Sync every 30 seconds when online
    }
  }

  private async initializeDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline data store
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'id' });
          store.createIndex('type', 'type');
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('synced', 'synced');
        }

        // Create cached responses store
        if (!db.objectStoreNames.contains('cachedResponses')) {
          const store = db.createObjectStore('cachedResponses', { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  private async loadOfflineData() {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.getAll();

      request.onsuccess = () => {
        const data: OfflineData[] = request.result;
        data.forEach(item => {
          this.offlineData.set(item.id, item);
        });
        console.log(`Loaded ${data.length} offline items`);
      };
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }

  private handleOnline() {
    console.log('Connection restored');
    this.isOnline = true;
    
    inspectorEventBus.emit(INSPECTOR_EVENTS.OFFLINE_MODE_DISABLED, {
      queuedItems: this.offlineData.size
    });

    // Trigger sync when coming back online
    if (this.config.enableAutoSync) {
      setTimeout(() => this.syncOfflineData(), 1000);
    }
  }

  private handleOffline() {
    console.log('Connection lost - entering offline mode');
    this.isOnline = false;
    
    inspectorEventBus.emit(INSPECTOR_EVENTS.OFFLINE_MODE_ENABLED, {
      queuedItems: this.offlineData.size
    });
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'OFFLINE_REQUEST_QUEUED':
        this.handleOfflineRequestQueued(data);
        break;
      case 'SYNC_COMPLETED':
        this.handleSyncCompleted(data);
        break;
    }
  }

  private handleOfflineRequestQueued(data: any) {
    inspectorEventBus.emit(INSPECTOR_EVENTS.OFFLINE_DATA_QUEUED, data);
  }

  private handleSyncCompleted(data: any) {
    inspectorEventBus.emit(INSPECTOR_EVENTS.DATA_SYNC_COMPLETED, data);
  }

  /**
   * Store data for offline use
   */
  async storeOfflineData(type: OfflineData['type'], data: any): Promise<string> {
    const offlineItem: OfflineData = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };

    try {
      // Store in memory
      this.offlineData.set(offlineItem.id, offlineItem);

      // Store in IndexedDB
      const db = await this.initializeDB();
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      await store.put(offlineItem);

      inspectorEventBus.emit(INSPECTOR_EVENTS.OFFLINE_DATA_QUEUED, {
        id: offlineItem.id,
        type,
        queueSize: this.offlineData.size
      });

      console.log(`Stored offline data: ${type}`, offlineItem.id);
      return offlineItem.id;
    } catch (error) {
      console.error('Failed to store offline data:', error);
      throw error;
    }
  }

  /**
   * Get all offline data of a specific type
   */
  getOfflineData(type?: OfflineData['type']): OfflineData[] {
    const data = Array.from(this.offlineData.values());
    return type ? data.filter(item => item.type === type) : data;
  }

  /**
   * Get count of unsynced items
   */
  getUnsyncedCount(): number {
    return Array.from(this.offlineData.values()).filter(item => !item.synced).length;
  }

  /**
   * Manually trigger sync
   */
  async syncOfflineData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    inspectorEventBus.emit(INSPECTOR_EVENTS.DATA_SYNC_STARTED, {
      itemCount: this.getUnsyncedCount()
    });

    try {
      const unsyncedItems = Array.from(this.offlineData.values())
        .filter(item => !item.synced && item.retryCount < this.config.maxRetries);

      for (const item of unsyncedItems) {
        try {
          await this.syncItem(item);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount++;
          await this.updateOfflineItem(item);

          if (item.retryCount >= this.config.maxRetries) {
            console.error(`Max retries reached for item ${item.id}`);
            inspectorEventBus.emit(INSPECTOR_EVENTS.DATA_SYNC_FAILED, {
              itemId: item.id,
              error: error.message
            });
          }
        }
      }

      inspectorEventBus.emit(INSPECTOR_EVENTS.DATA_SYNC_COMPLETED, {
        syncedCount: unsyncedItems.length - this.getUnsyncedCount()
      });
    } catch (error) {
      console.error('Sync failed:', error);
      inspectorEventBus.emit(INSPECTOR_EVENTS.DATA_SYNC_FAILED, {
        error: error.message
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: OfflineData): Promise<void> {
    const endpoint = this.getEndpointForType(item.type);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Mark as synced
    item.synced = true;
    await this.updateOfflineItem(item);

    console.log(`Synced item ${item.id} successfully`);
  }

  private async updateOfflineItem(item: OfflineData): Promise<void> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      await store.put(item);
    } catch (error) {
      console.error('Failed to update offline item:', error);
    }
  }

  private getEndpointForType(type: OfflineData['type']): string {
    const endpoints = {
      inspection: '/api/inspections',
      photo: '/api/photos',
      deficiency: '/api/deficiencies',
      voice_note: '/api/voice-notes'
    };

    return endpoints[type] || '/api/data';
  }

  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods used by API layer
  async saveInspectionOffline(data: any): Promise<string> {
    return this.storeOfflineData('inspection', data);
  }

  async savePhotoOffline(data: any): Promise<string> {
    return this.storeOfflineData('photo', data);
  }

  async saveCriticalIssueOffline(data: any): Promise<string> {
    return this.storeOfflineData('deficiency', data);
  }

  async getAllInspectionsOffline(): Promise<any[]> {
    return this.getOfflineData('inspection').map(i => i.data);
  }

  /**
   * Clear synced offline data
   */
  async clearSyncedData(): Promise<void> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(true));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value as OfflineData;
          this.offlineData.delete(item.id);
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to clear synced data:', error);
    }
  }

  /**
   * Get connectivity status
   */
  getConnectivityStatus() {
    return {
      isOnline: this.isOnline,
      queuedItems: this.offlineData.size,
      unsyncedItems: this.getUnsyncedCount(),
      syncInProgress: this.syncInProgress
    };
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();