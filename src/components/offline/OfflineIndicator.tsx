import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOffline } from '@/hooks/useOffline';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const {
    isOnline,
    isInitialized,
    syncStatus,
    notifications,
    forcSync,
    dismissNotification,
    clearNotifications
  } = useOffline();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus.queueLength > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus.isRunning) return 'Syncing...';
    if (syncStatus.queueLength > 0) return `${syncStatus.queueLength} pending`;
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.isRunning) return <Loader2 className="h-4 w-4 animate-spin" />;
    return <Wifi className="h-4 w-4" />;
  };

  const handleForceSync = async () => {
    try {
      await forcSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSync) return 'Never';
    const date = new Date(syncStatus.lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Notifications */}
      {notifications.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <AlertTriangle className="h-4 w-4" />
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500"
                variant="destructive"
              >
                {notifications.length}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Notifications</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearNotifications}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
              
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <Card key={notification.id} className="p-0">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissNotification(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Sync Status */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "flex items-center gap-2",
              !isOnline && "border-red-200 bg-red-50",
              syncStatus.queueLength > 0 && isOnline && "border-yellow-200 bg-yellow-50"
            )}
          >
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
            <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sync Status</h4>
              {isOnline && syncStatus.queueLength > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleForceSync}
                  disabled={syncStatus.isRunning}
                  className="h-6 px-2 text-xs"
                >
                  {syncStatus.isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Syncing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Connection:</span>
                <Badge variant={isOnline ? "default" : "destructive"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending items:</span>
                <Badge variant={syncStatus.queueLength > 0 ? "secondary" : "outline"}>
                  {syncStatus.queueLength}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last sync:</span>
                <span>{formatLastSync()}</span>
              </div>
              
              {syncStatus.isRunning && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-blue-700">Synchronizing data...</span>
                </div>
              )}
            </div>

            {!isOnline && (
              <div className="p-2 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  You're working offline. Changes will be saved locally and synced when connection is restored.
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}