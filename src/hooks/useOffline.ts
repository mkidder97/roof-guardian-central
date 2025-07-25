import { useState, useEffect } from 'react';
import offlineStorage from '@/lib/offline-storage';
import syncService from '@/lib/sync-service';

interface OfflineState {
  isOnline: boolean;
  isInitialized: boolean;
  syncStatus: {
    isRunning: boolean;
    queueLength: number;
    lastSync?: string;
  };
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
  }>;
}

interface OfflineActions {
  saveOffline: (type: 'inspection' | 'comment', data: any) => Promise<void>;
  getOfflineData: (type: 'inspection' | 'comment', params?: any) => Promise<any[]>;
  forcSync: () => Promise<void>;
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;
}

export function useOffline(): OfflineState & OfflineActions {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isRunning: false,
    queueLength: 0,
    lastSync: undefined as string | undefined
  });
  const [notifications, setNotifications] = useState<OfflineState['notifications']>([]);

  // Initialize offline functionality
  useEffect(() => {
    const initializeOffline = async () => {
      try {
        await syncService.initialize();
        await syncService.requestNotificationPermission();
        
        // Update sync status
        const status = await syncService.getSyncStatus();
        setSyncStatus({
          isRunning: status.isRunning,
          queueLength: status.queueLength,
          lastSync: status.lastSync
        });
        
        setIsInitialized(true);
        console.log('[useOffline] Offline functionality initialized');
      } catch (error) {
        console.error('[useOffline] Failed to initialize offline functionality:', error);
        addNotification('Failed to initialize offline functionality', 'error');
      }
    };

    initializeOffline();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification('Connection restored', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      addNotification('You are now offline. Data will be saved locally.', 'warning');
    };

    const handleSyncNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      addNotification(message, type);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncNotification', handleSyncNotification as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncNotification', handleSyncNotification as EventListener);
    };
  }, []);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = async () => {
      if (isInitialized) {
        const status = await syncService.getSyncStatus();
        setSyncStatus({
          isRunning: status.isRunning,
          queueLength: status.queueLength,
          lastSync: status.lastSync
        });
      }
    };

    updateSyncStatus();
    
    // Update every 30 seconds
    const interval = setInterval(updateSyncStatus, 30000);
    
    return () => clearInterval(interval);
  }, [isInitialized]);

  // Helper function to add notifications
  const addNotification = (message: string, type: OfflineState['notifications'][0]['type']) => {
    const notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss success and info notifications after 5 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        dismissNotification(notification.id);
      }, 5000);
    }
  };

  // Save data offline
  const saveOffline = async (type: 'inspection' | 'comment', data: any): Promise<void> => {
    try {
      if (type === 'inspection') {
        await offlineStorage.saveInspection(data);
        addNotification('Inspection saved offline', 'success');
      } else if (type === 'comment') {
        await offlineStorage.saveComment(data);
        addNotification('Comment saved offline', 'success');
      }

      // Update sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus({
        isRunning: status.isRunning,
        queueLength: status.queueLength,
        lastSync: status.lastSync
      });
    } catch (error) {
      console.error('[useOffline] Failed to save offline:', error);
      addNotification(`Failed to save ${type} offline`, 'error');
      throw error;
    }
  };

  // Get offline data
  const getOfflineData = async (type: 'inspection' | 'comment', params?: any): Promise<any[]> => {
    try {
      if (type === 'inspection') {
        return await offlineStorage.getInspections();
      } else if (type === 'comment') {
        return await offlineStorage.getComments(params?.entityType, params?.entityId);
      }
      return [];
    } catch (error) {
      console.error('[useOffline] Failed to get offline data:', error);
      addNotification(`Failed to get offline ${type}s`, 'error');
      return [];
    }
  };

  // Force sync
  const forcSync = async (): Promise<void> => {
    try {
      if (!isOnline) {
        throw new Error('Cannot sync while offline');
      }

      addNotification('Starting manual sync...', 'info');
      await syncService.forcSync();
      
      // Update sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus({
        isRunning: status.isRunning,
        queueLength: status.queueLength,
        lastSync: new Date().toISOString()
      });
      
      localStorage.setItem('lastSyncTime', new Date().toISOString());
      addNotification('Manual sync completed', 'success');
    } catch (error) {
      console.error('[useOffline] Force sync failed:', error);
      addNotification('Manual sync failed', 'error');
      throw error;
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Dismiss specific notification
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return {
    isOnline,
    isInitialized,
    syncStatus,
    notifications,
    saveOffline,
    getOfflineData,
    forcSync,
    clearNotifications,
    dismissNotification
  };
}