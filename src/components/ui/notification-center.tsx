import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Clock,
  Zap,
  Building2,
  ClipboardCheck,
  Wrench,
  Users,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  category: 'inspection' | 'work_order' | 'campaign' | 'system' | 'ai_insight';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
    setupRealtimeSubscriptions();
  }, []);

  const loadNotifications = async () => {
    // Mock notifications - in real app this would come from database
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'AI Insight Available',
        message: 'New cost-saving opportunity identified for your portfolio',
        type: 'ai',
        category: 'ai_insight',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        read: false,
        actionLabel: 'View Insight',
        metadata: { savingsAmount: 2400 }
      },
      {
        id: '2',
        title: 'Inspection Completed',
        message: 'Dallas Corporate Center inspection has been completed',
        type: 'success',
        category: 'inspection',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
        actionLabel: 'View Report'
      },
      {
        id: '3',
        title: 'Work Order Assigned',
        message: 'ABC Roofing has been assigned to Property #1547',
        type: 'info',
        category: 'work_order',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        read: true,
        actionLabel: 'View Order'
      },
      {
        id: '4',
        title: 'Warranty Expiring Soon',
        message: '3 warranties will expire within the next 60 days',
        type: 'warning',
        category: 'system',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        read: false,
        actionLabel: 'Review Warranties'
      },
      {
        id: '5',
        title: 'Campaign Progress Update',
        message: 'Q1 Inspections campaign is now 85% complete',
        type: 'info',
        category: 'campaign',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        read: true,
        actionLabel: 'View Campaign'
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  };

  const setupRealtimeSubscriptions = () => {
    // Set up real-time subscriptions for various events
    const inspectionSubscription = supabase
      .channel('inspection_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inspections' },
        (payload) => {
          handleNewNotification({
            title: 'Inspection Updated',
            message: `Inspection status changed to ${payload.new?.status}`,
            type: 'info',
            category: 'inspection'
          });
        }
      )
      .subscribe();

    const workOrderSubscription = supabase
      .channel('work_order_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'work_orders' },
        (payload) => {
          handleNewNotification({
            title: 'Work Order Updated',
            message: `Work order status changed to ${payload.new?.status}`,
            type: 'info',
            category: 'work_order'
          });
        }
      )
      .subscribe();

    return () => {
      inspectionSubscription.unsubscribe();
      workOrderSubscription.unsubscribe();
    };
  };

  const handleNewNotification = (notification: Partial<Notification>) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
      ...notification
    } as Notification;

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: Notification['type'], category: Notification['category']) => {
    if (type === 'ai') return Sparkles;
    
    switch (category) {
      case 'inspection': return ClipboardCheck;
      case 'work_order': return Wrench;
      case 'campaign': return Users;
      case 'ai_insight': return Sparkles;
      default:
        switch (type) {
          case 'success': return CheckCircle;
          case 'warning': return AlertTriangle;
          case 'error': return X;
          default: return Info;
        }
    }
  };

  const getNotificationIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'ai': return 'text-purple-500';
      default: return 'text-blue-500';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("relative", className)}
          onClick={() => setOpen(!open)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Badge variant="secondary">{notifications.length}</Badge>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type, notification.category);
                  const iconColor = getNotificationIconColor(notification.type);
                  
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                        !notification.read && "bg-accent/20"
                      )}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5", iconColor)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            
                            {notification.actionLabel && (
                              <Button variant="ghost" size="sm" className="text-xs h-6">
                                {notification.actionLabel}
                              </Button>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for programmatically adding notifications
export function useNotifications() {
  const addNotification = (notification: Partial<Notification>) => {
    // This would integrate with the notification center
    console.log('Add notification:', notification);
  };

  return { addNotification };
}