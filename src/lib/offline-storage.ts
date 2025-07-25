import { useCallback } from 'react';

// IndexedDB wrapper for offline storage
class OfflineStorage {
  private dbName = 'RoofGuardianOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create inspections store
        if (!db.objectStoreNames.contains('inspections')) {
          const inspectionStore = db.createObjectStore('inspections', {
            keyPath: 'id'
          });
          inspectionStore.createIndex('status', 'status', { unique: false });
          inspectionStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Create comments store
        if (!db.objectStoreNames.contains('comments')) {
          const commentStore = db.createObjectStore('comments', {
            keyPath: 'id'
          });
          commentStore.createIndex('entity_type', 'entity_type', { unique: false });
          commentStore.createIndex('entity_id', 'entity_id', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create offline photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', {
            keyPath: 'id'
          });
          photoStore.createIndex('inspection_id', 'inspection_id', { unique: false });
        }
      };
    });
  }

  // Inspection methods
  async saveInspection(inspection: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['inspections'], 'readwrite');
      const store = transaction.objectStore('inspections');
      
      const inspectionData = {
        ...inspection,
        offline: true,
        last_modified: new Date().toISOString()
      };

      const request = store.put(inspectionData);

      request.onsuccess = () => {
        this.addToSyncQueue('CREATE_INSPECTION', inspectionData);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save inspection offline'));
      };
    });
  }

  async getInspections(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['inspections'], 'readonly');
      const store = transaction.objectStore('inspections');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get offline inspections'));
      };
    });
  }

  async updateInspection(id: string, updates: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['inspections'], 'readwrite');
      const store = transaction.objectStore('inspections');
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const inspection = getRequest.result;
        if (inspection) {
          const updatedInspection = {
            ...inspection,
            ...updates,
            last_modified: new Date().toISOString()
          };

          const putRequest = store.put(updatedInspection);
          
          putRequest.onsuccess = () => {
            this.addToSyncQueue('UPDATE_INSPECTION', updatedInspection);
            resolve();
          };

          putRequest.onerror = () => {
            reject(new Error('Failed to update inspection offline'));
          };
        } else {
          reject(new Error('Inspection not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get inspection for update'));
      };
    });
  }

  // Comment methods
  async saveComment(comment: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['comments'], 'readwrite');
      const store = transaction.objectStore('comments');
      
      const commentData = {
        ...comment,
        offline: true,
        created_at: new Date().toISOString()
      };

      const request = store.put(commentData);

      request.onsuccess = () => {
        this.addToSyncQueue('CREATE_COMMENT', commentData);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save comment offline'));
      };
    });
  }

  async getComments(entityType: string, entityId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['comments'], 'readonly');
      const store = transaction.objectStore('comments');
      const index = store.index('entity_type');
      const request = index.getAll(entityType);

      request.onsuccess = () => {
        const comments = request.result.filter(c => c.entity_id === entityId);
        resolve(comments);
      };

      request.onerror = () => {
        reject(new Error('Failed to get offline comments'));
      };
    });
  }

  // Photo methods
  async savePhoto(photo: { id: string; file: File; inspection_id: string }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const photoData = {
          id: photo.id,
          inspection_id: photo.inspection_id,
          data: reader.result as ArrayBuffer,
          name: photo.file.name,
          type: photo.file.type,
          size: photo.file.size,
          created_at: new Date().toISOString()
        };

        const transaction = this.db!.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        const request = store.put(photoData);

        request.onsuccess = () => {
          this.addToSyncQueue('UPLOAD_PHOTO', {
            id: photo.id,
            inspection_id: photo.inspection_id,
            name: photo.file.name
          });
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to save photo offline'));
        };
      };

      reader.onerror = () => {
        reject(new Error('Failed to read photo file'));
      };

      reader.readAsArrayBuffer(photo.file);
    });
  }

  async getPhotos(inspectionId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      const index = store.index('inspection_id');
      const request = index.getAll(inspectionId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get offline photos'));
      };
    });
  }

  // Sync queue methods
  private async addToSyncQueue(action: string, data: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const queueItem = {
        action,
        data,
        timestamp: new Date().toISOString(),
        retries: 0
      };

      const request = store.add(queueItem);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to add to sync queue'));
      };
    });
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get sync queue'));
      };
    });
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear sync queue'));
      };
    });
  }

  async removeSyncItem(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove sync item'));
      };
    });
  }

  // Utility methods
  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return null;
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeNames = ['inspections', 'comments', 'photos', 'sync_queue'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      
      let completed = 0;
      const total = storeNames.length;

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to clear ${storeName} store`));
        };
      });
    });
  }
}

// Singleton instance
const offlineStorage = new OfflineStorage();

// React hook for using offline storage
export function useOfflineStorage() {
  const saveInspection = useCallback((data: any) => offlineStorage.saveInspection(data), []);
  const syncInspections = useCallback(() => Promise.resolve(), []);
  const getInspections = useCallback(() => offlineStorage.getInspections(), []);
  const saveComment = useCallback((data: any) => offlineStorage.saveComment(data), []);
  const getComments = useCallback((entityType: string, entityId: string) => offlineStorage.getComments(entityType, entityId), []);
  const addToSyncQueue = useCallback(async (action: string, data: any) => {}, []);
  const getSyncQueue = useCallback(() => offlineStorage.getSyncQueue(), []);
  const clearSyncQueue = useCallback(() => offlineStorage.clearSyncQueue(), []);
  const clearAllData = useCallback(() => offlineStorage.clearAll(), []);

  return {
    saveInspection,
    syncInspections,
    getInspections,
    saveComment,
    getComments,
    addToSyncQueue,
    getSyncQueue,
    clearSyncQueue,
    clearAllData
  };
}

export default offlineStorage;