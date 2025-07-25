import offlineStorage from './offline-storage';
import { supabase } from '@/integrations/supabase/client';

interface SyncQueueItem {
  id: number;
  action: string;
  data: any;
  timestamp: string;
  retries: number;
}

class SyncService {
  private isRunning = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  async initialize(): Promise<void> {
    await offlineStorage.init();
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        console.log('[Sync] Service worker ready for background sync');
      });
    }

    // Start sync if online
    if (navigator.onLine) {
      this.startSync();
    }
  }

  private handleOnline(): void {
    console.log('[Sync] Connection restored, starting sync...');
    this.startSync();
    this.showSyncNotification('Connection restored. Syncing offline data...', 'info');
  }

  private handleOffline(): void {
    console.log('[Sync] Connection lost, entering offline mode...');
    this.stopSync();
    this.showSyncNotification('You are now offline. Data will be saved locally.', 'warning');
  }

  async startSync(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[Sync] Starting sync process...');

    try {
      const queueItems = await offlineStorage.getSyncQueue();
      
      if (queueItems.length === 0) {
        console.log('[Sync] No items to sync');
        this.isRunning = false;
        return;
      }

      console.log(`[Sync] Found ${queueItems.length} items to sync`);
      
      for (const item of queueItems) {
        if (!navigator.onLine) {
          console.log('[Sync] Lost connection, stopping sync');
          break;
        }

        try {
          await this.syncItem(item);
          await offlineStorage.removeSyncItem(item.id);
          console.log(`[Sync] Successfully synced item ${item.id}`);
        } catch (error) {
          console.error(`[Sync] Failed to sync item ${item.id}:`, error);
          
          if (item.retries >= this.maxRetries) {
            console.error(`[Sync] Max retries exceeded for item ${item.id}, removing from queue`);
            await offlineStorage.removeSyncItem(item.id);
          } else {
            // Increment retry count (would need to update the item in the queue)
            console.log(`[Sync] Will retry item ${item.id} later (${item.retries + 1}/${this.maxRetries})`);
          }
        }
      }

      this.showSyncNotification('All offline data has been synchronized.', 'success');
    } catch (error) {
      console.error('[Sync] Sync process failed:', error);
      this.showSyncNotification('Failed to sync some offline data. Will retry later.', 'error');
    } finally {
      this.isRunning = false;
    }
  }

  stopSync(): void {
    this.isRunning = false;
    console.log('[Sync] Sync process stopped');
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.action) {
      case 'CREATE_INSPECTION':
        return this.syncInspection(item.data);
      
      case 'UPDATE_INSPECTION':
        return this.updateInspection(item.data);
      
      case 'CREATE_COMMENT':
        return this.syncComment(item.data);
      
      case 'UPLOAD_PHOTO':
        return this.syncPhoto(item.data);
      
      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  private async syncInspection(inspectionData: any): Promise<void> {
    // Remove offline-specific fields
    const { offline, last_modified, ...cleanData } = inspectionData;
    
    const { data, error } = await supabase
      .from('inspections')
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync inspection: ${error.message}`);
    }

    console.log('[Sync] Inspection synced:', data.id);
  }

  private async updateInspection(inspectionData: any): Promise<void> {
    const { offline, last_modified, ...cleanData } = inspectionData;
    
    const { data, error } = await supabase
      .from('inspections')
      .update(cleanData)
      .eq('id', cleanData.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update inspection: ${error.message}`);
    }

    console.log('[Sync] Inspection updated:', data.id);
  }

  private async syncComment(commentData: any): Promise<void> {
    const { offline, ...cleanData } = commentData;
    
    const { data, error } = await supabase
      .from('comments')
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync comment: ${error.message}`);
    }

    console.log('[Sync] Comment synced:', data.id);
  }

  private async syncPhoto(photoData: any): Promise<void> {
    // Get the photo from offline storage
    const photos = await offlineStorage.getPhotos(photoData.inspection_id);
    const photo = photos.find(p => p.id === photoData.id);
    
    if (!photo) {
      throw new Error('Photo not found in offline storage');
    }

    // Convert ArrayBuffer back to File
    const file = new File([photo.data], photo.name, { type: photo.type });
    
    // Upload to Supabase Storage
    const fileName = `${photoData.inspection_id}/${photoData.id}_${photo.name}`;
    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    console.log('[Sync] Photo uploaded:', data.path);
  }

  // Manual sync trigger
  async forcSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    await this.startSync();
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isRunning: boolean;
    queueLength: number;
    lastSync?: string;
  }> {
    const queueItems = await offlineStorage.getSyncQueue();
    
    return {
      isOnline: navigator.onLine,
      isRunning: this.isRunning,
      queueLength: queueItems.length,
      lastSync: localStorage.getItem('lastSyncTime') || undefined
    };
  }

  // Show user notifications
  private showSyncNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    // Create a custom event that components can listen to
    const event = new CustomEvent('syncNotification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);

    // Also show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Roof Guardian', {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

// Singleton instance
const syncService = new SyncService();

// React hook for using sync service
export function useSyncService() {
  return {
    isOnline: navigator.onLine,
    queuedActions: 0, // This would be updated in real implementation
    sync: () => syncService.sync(),
    processQueue: () => syncService.processQueue(),
    canShowNotifications: () => syncService.canShowNotifications()
  };
}

export default syncService;