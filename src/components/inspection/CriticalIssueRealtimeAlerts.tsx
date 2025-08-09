import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Shield,
  Zap,
  Users,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { inspectorEventBus, INSPECTOR_EVENTS } from '@/lib/eventBus';
import { roofmindApi } from '@/lib/api/roofmindApi';

interface CriticalAlert {
  id: string;
  inspectionId: string;
  propertyName: string;
  inspectorName: string;
  issue: string;
  severity: 'high' | 'critical' | 'emergency';
  location: string;
  estimatedCost?: number;
  photos: string[];
  timestamp: Date;
  acknowledged: boolean;
  escalated: boolean;
  supervisorNotified: boolean;
  clientNotified: boolean;
}

interface CriticalIssueRealtimeAlertsProps {
  onAlertAction?: (alertId: string, action: string) => void;
  maxVisible?: number;
  autoHide?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

export function CriticalIssueRealtimeAlerts({ 
  onAlertAction,
  maxVisible = 3,
  autoHide = false,
  position = 'top-right'
}: CriticalIssueRealtimeAlertsProps) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);

  useEffect(() => {
    // Subscribe to critical issue events
    const unsubscribe = inspectorEventBus.on(INSPECTOR_EVENTS.DEFICIENCY_ADDED, handleNewCriticalIssue);
    
    // Load existing critical alerts
    loadExistingAlerts();
    
    // Setup real-time subscription
    const subscription = roofmindApi.subscribeToCriticalIssues(handleRealtimeCriticalIssue);
    
    return () => {
      unsubscribe();
      subscription.unsubscribe();
    };
  }, []);

  const loadExistingAlerts = async () => {
    try {
      const response = await roofmindApi.getCriticalIssues();
      const criticalAlerts = response.data
        .filter((issue: any) => !issue.acknowledged && issue.severity !== 'low')
        .map((issue: any) => transformToCriticalAlert(issue));
      
      setAlerts(criticalAlerts.slice(0, maxVisible));
    } catch (error) {
      console.error('Failed to load existing alerts:', error);
    }
  };

  const handleNewCriticalIssue = useCallback((event: any) => {
    const { payload } = event;
    const alert = transformToCriticalAlert(payload.issue);
    
    // Add to alerts if not already present
    setAlerts(prev => {
      if (prev.find(a => a.id === alert.id)) return prev;
      
      const updated = [alert, ...prev].slice(0, maxVisible);
      
      // Play sound notification
      if (soundEnabled && Date.now() - lastAlertTime > 5000) {
        playAlertSound(alert.severity);
        setLastAlertTime(Date.now());
      }
      
      // Show toast notification
      toast({
        title: `🚨 Critical Issue Detected`,
        description: `${alert.propertyName}: ${alert.issue}`,
        variant: "destructive",
        duration: 8000,
      });
      
      // Auto-escalate emergency issues
      if (alert.severity === 'emergency') {
        setTimeout(() => escalateToSupervisor(alert.id), 30000); // 30 seconds
      }
      
      return updated;
    });
  }, [soundEnabled, lastAlertTime, maxVisible, toast]);

  const handleRealtimeCriticalIssue = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      handleNewCriticalIssue({ payload: { issue: payload.new } });
    }
  }, [handleNewCriticalIssue]);

  const transformToCriticalAlert = (issue: any): CriticalAlert => ({
    id: issue.id,
    inspectionId: issue.inspection_id || issue.inspectionId,
    propertyName: issue.property_name || issue.inspections?.roofs?.property_name || 'Unknown Property',
    inspectorName: issue.inspector_name || issue.users?.first_name + ' ' + issue.users?.last_name || 'Unknown Inspector',
    issue: issue.description || issue.issue,
    severity: issue.severity,
    location: issue.location,
    estimatedCost: issue.estimated_cost,
    photos: issue.photos || [],
    timestamp: new Date(issue.created_at || issue.timestamp),
    acknowledged: issue.acknowledged || false,
    escalated: issue.escalated || false,
    supervisorNotified: issue.supervisor_notified || false,
    clientNotified: issue.client_notified || false
  });

  const playAlertSound = (severity: string) => {
    try {
      // Create audio context for different alert sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different severities
      oscillator.frequency.value = severity === 'emergency' ? 800 : severity === 'critical' ? 600 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      // Update in database
      await roofmindApi.updateInspection(alertId, { 
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      });
      
      // Remove from local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      onAlertAction?.(alertId, 'acknowledge');
      
      toast({
        title: "Alert Acknowledged",
        description: "Critical issue has been acknowledged",
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const escalateToSupervisor = async (alertId: string) => {
    try {
      const alert = alerts.find(a => a.id === alertId);
      if (!alert) return;
      
      // Trigger supervisor notification workflow
      await roofmindApi.triggerWorkflow('supervisor-notification', {
        alertId,
        propertyName: alert.propertyName,
        severity: alert.severity,
        issue: alert.issue,
        inspectorName: alert.inspectorName,
        timestamp: alert.timestamp.toISOString()
      });
      
      // Update alert state
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, escalated: true, supervisorNotified: true }
          : a
      ));
      
      onAlertAction?.(alertId, 'escalate');
      
      toast({
        title: "Alert Escalated",
        description: "Supervisor has been notified of critical issue",
      });
    } catch (error) {
      console.error('Failed to escalate alert:', error);
    }
  };

  const notifyClient = async (alertId: string) => {
    try {
      const alert = alerts.find(a => a.id === alertId);
      if (!alert) return;
      
      // Trigger client notification workflow
      await roofmindApi.triggerWorkflow('client-notification', {
        alertId,
        propertyName: alert.propertyName,
        issue: alert.issue,
        severity: alert.severity,
        inspectorName: alert.inspectorName
      });
      
      // Update alert state
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, clientNotified: true }
          : a
      ));
      
      onAlertAction?.(alertId, 'notify-client');
      
      toast({
        title: "Client Notified",
        description: "Property manager has been informed of the issue",
      });
    } catch (error) {
      console.error('Failed to notify client:', error);
    }
  };

  const viewInspection = (inspectionId: string) => {
    window.open(`/inspection/${inspectionId}`, '_blank');
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return {
          bgColor: 'bg-red-100 border-red-500',
          textColor: 'text-red-800',
          icon: Zap,
          badgeVariant: 'destructive' as const,
          priority: 3
        };
      case 'critical':
        return {
          bgColor: 'bg-orange-100 border-orange-500',
          textColor: 'text-orange-800',
          icon: AlertTriangle,
          badgeVariant: 'destructive' as const,
          priority: 2
        };
      case 'high':
        return {
          bgColor: 'bg-yellow-100 border-yellow-500',
          textColor: 'text-yellow-800',
          icon: AlertTriangle,
          badgeVariant: 'default' as const,
          priority: 1
        };
      default:
        return {
          bgColor: 'bg-gray-100 border-gray-500',
          textColor: 'text-gray-800',
          icon: AlertTriangle,
          badgeVariant: 'secondary' as const,
          priority: 0
        };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isVisible || alerts.length === 0) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50 w-96 max-w-[calc(100vw-32px)] space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-lg border border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="font-medium text-red-800">Critical Alerts</span>
          <Badge variant="destructive">{alerts.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-blue-600' : 'text-gray-400'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert Cards */}
      {alerts
        .sort((a, b) => getSeverityConfig(b.severity).priority - getSeverityConfig(a.severity).priority)
        .map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;
          
          return (
            <Card key={alert.id} className={`${config.bgColor} border-l-4 shadow-lg animate-in slide-in-from-right`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.textColor}`} />
                    <Badge variant={config.badgeVariant} className="uppercase text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <h4 className={`font-medium ${config.textColor}`}>
                    {alert.propertyName}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {alert.issue}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {alert.inspectorName}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {alert.location}
                    </div>
                  </div>
                  
                  {alert.estimatedCost && (
                    <div className="text-sm font-medium text-green-700">
                      Est. Cost: ${alert.estimatedCost.toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Status Indicators */}
                <div className="flex items-center gap-2 mb-4 text-xs">
                  {alert.supervisorNotified && (
                    <Badge variant="outline" className="text-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Supervisor Notified
                    </Badge>
                  )}
                  {alert.clientNotified && (
                    <Badge variant="outline" className="text-green-600">
                      <Mail className="h-3 w-3 mr-1" />
                      Client Notified
                    </Badge>
                  )}
                  {alert.escalated && (
                    <Badge variant="outline" className="text-orange-600">
                      <Zap className="h-3 w-3 mr-1" />
                      Escalated
                    </Badge>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Acknowledge
                  </Button>
                  
                  {!alert.supervisorNotified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => escalateToSupervisor(alert.id)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Escalate
                    </Button>
                  )}
                  
                  {!alert.clientNotified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => notifyClient(alert.id)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Notify Client
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewInspection(alert.inspectionId)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      
      {/* Show collapsed indicator if more alerts exist */}
      {alerts.length >= maxVisible && (
        <Card className="bg-gray-100 border border-gray-300">
          <CardContent className="p-3 text-center">
            <span className="text-sm text-gray-600">
              + More critical alerts available in admin dashboard
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}