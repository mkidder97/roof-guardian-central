import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  Settings,
  Zap,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
import { monitoringService, Alert } from './MonitoringService';
import { format } from 'date-fns';

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    type: 'performance' | 'error' | 'hooks' | 'health';
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'contains';
    threshold: number | string;
    timeWindow: number; // minutes
    minOccurrences: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: {
    toast: boolean;
    console: boolean;
    email: boolean;
    webhook: boolean;
  };
  cooldown: number; // minutes
}

interface AlertingSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisibleAlerts?: number;
  autoHideDelay?: number;
  soundEnabled?: boolean;
}

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'slow-render',
    name: 'Slow Render Time',
    enabled: true,
    condition: {
      type: 'performance',
      metric: 'renderTime',
      operator: 'gt',
      threshold: 50,
      timeWindow: 5,
      minOccurrences: 3
    },
    severity: 'medium',
    actions: {
      toast: true,
      console: true,
      email: false,
      webhook: false
    },
    cooldown: 5
  },
  {
    id: 'critical-render',
    name: 'Critical Render Time',
    enabled: true,
    condition: {
      type: 'performance',
      metric: 'renderTime',
      operator: 'gt',
      threshold: 100,
      timeWindow: 1,
      minOccurrences: 1
    },
    severity: 'critical',
    actions: {
      toast: true,
      console: true,
      email: true,
      webhook: false
    },
    cooldown: 2
  },
  {
    id: 'hooks-error',
    name: 'React Hooks Error',
    enabled: true,
    condition: {
      type: 'hooks',
      metric: 'error',
      operator: 'contains',
      threshold: 'hook',
      timeWindow: 1,
      minOccurrences: 1
    },
    severity: 'critical',
    actions: {
      toast: true,
      console: true,
      email: true,
      webhook: true
    },
    cooldown: 0
  },
  {
    id: 'component-unhealthy',
    name: 'Component Unhealthy',
    enabled: true,
    condition: {
      type: 'health',
      metric: 'status',
      operator: 'eq',
      threshold: 'unhealthy',
      timeWindow: 1,
      minOccurrences: 1
    },
    severity: 'high',
    actions: {
      toast: true,
      console: true,
      email: false,
      webhook: false
    },
    cooldown: 10
  },
  {
    id: 'high-memory',
    name: 'High Memory Usage',
    enabled: true,
    condition: {
      type: 'performance',
      metric: 'memory',
      operator: 'gt',
      threshold: 100 * 1024 * 1024, // 100MB
      timeWindow: 5,
      minOccurrences: 2
    },
    severity: 'medium',
    actions: {
      toast: true,
      console: true,
      email: false,
      webhook: false
    },
    cooldown: 15
  }
];

export const AlertingSystem: React.FC<AlertingSystemProps> = ({
  position = 'top-right',
  maxVisibleAlerts = 5,
  autoHideDelay = 10000,
  soundEnabled = true
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);
  const [isEnabled, setIsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lastRuleTrigger, setLastRuleTrigger] = useState<Map<string, number>>(new Map());
  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    acknowledged: 0,
    resolved: 0
  });

  // Load alerts and subscribe to updates
  useEffect(() => {
    const loadAlerts = () => {
      const allAlerts = monitoringService.getAlerts();
      setAlerts(allAlerts.slice(0, 50)); // Keep last 50 alerts
      
      // Update stats
      const stats = allAlerts.reduce((acc, alert) => {
        acc.total++;
        acc[alert.severity]++;
        if (alert.acknowledged) acc.acknowledged++;
        if (alert.resolved) acc.resolved++;
        return acc;
      }, {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        acknowledged: 0,
        resolved: 0
      });
      setAlertStats(stats);
    };

    loadAlerts();

    const unsubscribe = monitoringService.subscribeToAlerts((alert) => {
      if (isEnabled) {
        processNewAlert(alert);
      }
      loadAlerts();
    });

    return unsubscribe;
  }, [isEnabled]);

  // Subscribe to monitoring events to check rules
  useEffect(() => {
    const unsubscribe = monitoringService.subscribe((event) => {
      if (!isEnabled) return;
      
      checkRules(event);
    });

    return unsubscribe;
  }, [isEnabled, rules, lastRuleTrigger]);

  const checkRules = useCallback((event: any) => {
    const now = Date.now();
    
    rules.forEach(rule => {
      if (!rule.enabled) return;
      
      // Check cooldown
      const lastTrigger = lastRuleTrigger.get(rule.id) || 0;
      if (now - lastTrigger < rule.cooldown * 60 * 1000) return;
      
      let shouldTrigger = false;
      
      switch (rule.condition.type) {
        case 'performance':
          if (event.type === 'performance') {
            const metric = event.data;
            if (metric.metricType === rule.condition.metric || 
                (rule.condition.metric === 'renderTime' && metric.metricType === 'render')) {
              shouldTrigger = evaluateCondition(metric.value, rule.condition);
            }
          }
          break;
          
        case 'error':
          if (event.type === 'error') {
            const error = event.data;
            shouldTrigger = evaluateCondition(error.message, rule.condition);
          }
          break;
          
        case 'hooks':
          if (event.type === 'hooksError') {
            shouldTrigger = true; // Always trigger for hooks errors
          }
          break;
          
        case 'health':
          if (event.type === 'health') {
            const health = event.data;
            shouldTrigger = evaluateCondition(health.status, rule.condition);
          }
          break;
      }
      
      if (shouldTrigger) {
        triggerRule(rule, event.data);
        setLastRuleTrigger(prev => new Map(prev.set(rule.id, now)));
      }
    });
  }, [rules, lastRuleTrigger]);

  const evaluateCondition = (value: any, condition: AlertRule['condition']): boolean => {
    switch (condition.operator) {
      case 'gt':
        return typeof value === 'number' && value > Number(condition.threshold);
      case 'lt':
        return typeof value === 'number' && value < Number(condition.threshold);
      case 'eq':
        return value === condition.threshold;
      case 'contains':
        return typeof value === 'string' && 
               value.toLowerCase().includes(String(condition.threshold).toLowerCase());
      default:
        return false;
    }
  };

  const triggerRule = (rule: AlertRule, data: any) => {
    const alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'> = {
      type: 'performance',
      severity: rule.severity,
      title: rule.name,
      message: generateAlertMessage(rule, data),
      componentName: data.componentName || 'System',
      metadata: { rule: rule.id, data }
    };

    // Execute actions
    if (rule.actions.toast) {
      showToastAlert(alert);
    }
    
    if (rule.actions.console) {
      console.warn(`🚨 Alert: ${alert.title}`, alert);
    }
    
    if (rule.actions.email) {
      // In a real implementation, this would send an email
      console.log('📧 Email alert would be sent:', alert);
    }
    
    if (rule.actions.webhook) {
      // In a real implementation, this would call a webhook
      console.log('🔗 Webhook alert would be sent:', alert);
    }

    // Play sound if enabled
    if (soundEnabled && (rule.severity === 'critical' || rule.severity === 'high')) {
      playAlertSound();
    }
  };

  const generateAlertMessage = (rule: AlertRule, data: any): string => {
    switch (rule.condition.type) {
      case 'performance':
        if (rule.condition.metric === 'renderTime' || data.metricType === 'render') {
          return `Render time of ${data.value?.toFixed(1)}ms exceeds threshold of ${rule.condition.threshold}ms`;
        }
        if (rule.condition.metric === 'memory') {
          return `Memory usage of ${(data.value / 1024 / 1024).toFixed(1)}MB exceeds threshold`;
        }
        return `Performance metric ${rule.condition.metric} triggered alert`;
      case 'hooks':
        return `React Hooks violation detected: ${data.hooksViolationType || 'Unknown violation'}`;
      case 'health':
        return `Component health status changed to ${data.status}. Issues: ${data.issues?.join(', ') || 'None'}`;
      default:
        return `Alert condition met for ${rule.name}`;
    }
  };

  const processNewAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev.slice(0, maxVisibleAlerts - 1)]);
  };

  const showToastAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>) => {
    const toastConfig = {
      duration: autoHideDelay,
      action: {
        label: 'Dismiss',
        onClick: () => {}
      }
    };

    switch (alert.severity) {
      case 'critical':
        toast.error(alert.title, {
          description: alert.message,
          ...toastConfig
        });
        break;
      case 'high':
        toast.error(alert.title, {
          description: alert.message,
          ...toastConfig
        });
        break;
      case 'medium':
        toast.warning(alert.title, {
          description: alert.message,
          ...toastConfig
        });
        break;
      case 'low':
        toast.info(alert.title, {
          description: alert.message,
          ...toastConfig
        });
        break;
    }
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const updateRule = (ruleId: string, updates: Partial<AlertRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  const addRule = (rule: Omit<AlertRule, 'id'>) => {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setRules(prev => [...prev, newRule]);
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  if (showSettings) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Alert Settings</span>
            </div>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rules">
            <TabsList>
              <TabsTrigger value="rules">Alert Rules</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rules" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="alerts-enabled">Enable Alerts</Label>
                  <Switch
                    id="alerts-enabled"
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                  />
                </div>
                <Button onClick={() => addRule({
                  name: 'New Rule',
                  enabled: false,
                  condition: {
                    type: 'performance',
                    metric: 'renderTime',
                    operator: 'gt',
                    threshold: 50,
                    timeWindow: 5,
                    minOccurrences: 1
                  },
                  severity: 'medium',
                  actions: {
                    toast: true,
                    console: true,
                    email: false,
                    webhook: false
                  },
                  cooldown: 5
                })}>
                  Add Rule
                </Button>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <Card key={rule.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(enabled) => updateRule(rule.id, { enabled })}
                            />
                            <input
                              type="text"
                              value={rule.name}
                              onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                              className="font-medium bg-transparent border-none outline-none"
                            />
                            <Badge className={getSeverityColor(rule.severity)}>
                              {rule.severity}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label>Condition</Label>
                              <div className="text-muted-foreground">
                                {rule.condition.type} {rule.condition.metric} {rule.condition.operator} {rule.condition.threshold}
                              </div>
                            </div>
                            <div>
                              <Label>Actions</Label>
                              <div className="text-muted-foreground">
                                {Object.entries(rule.actions).filter(([_, enabled]) => enabled).map(([action, _]) => action).join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-2xl font-bold">{alertStats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Alerts</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-red-600">{alertStats.critical}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-green-600">{alertStats.resolved}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{alertStats.acknowledged}</div>
                  <div className="text-sm text-muted-foreground">Acknowledged</div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {/* Alert header */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span>Alerts ({alerts.filter(a => !a.resolved).length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                size="sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Active alerts */}
      {isEnabled && alerts.filter(a => !a.resolved).slice(0, maxVisibleAlerts).map((alert) => (
        <Card key={alert.id} className={`bg-white shadow-lg border-l-4 ${
          alert.severity === 'critical' ? 'border-l-red-600' :
          alert.severity === 'high' ? 'border-l-red-500' :
          alert.severity === 'medium' ? 'border-l-yellow-500' :
          'border-l-blue-500'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {getSeverityIcon(alert.severity)}
                  <span className="font-medium text-sm">{alert.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{alert.componentName}</span>
                  <span>{format(new Date(alert.timestamp), 'HH:mm:ss')}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                {!alert.acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => monitoringService.acknowledgeAlert(alert.id)}
                    className="text-xs h-6"
                  >
                    Ack
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => monitoringService.resolveAlert(alert.id)}
                  className="text-xs h-6"
                >
                  Resolve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};