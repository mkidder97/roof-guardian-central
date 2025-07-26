import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { PerformanceMonitoringDashboard } from './PerformanceMonitoringDashboard';
import { AlertingSystem } from './AlertingSystem';
import { monitoringService } from './MonitoringService';

interface MonitoringDashboardProps {
  defaultTab?: 'overview' | 'performance' | 'alerts' | 'health' | 'recovery';
  compactMode?: boolean;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  defaultTab = 'overview',
  compactMode = false
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isVisible, setIsVisible] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time stats
  const [stats, setStats] = useState({
    totalErrors: 0,
    hooksErrors: 0,
    activeAlerts: 0,
    healthyComponents: 0,
    totalComponents: 0,
    averagePerformance: 0,
    criticalIssues: 0
  });

  // Load stats
  React.useEffect(() => {
    const loadStats = () => {
      const errors = monitoringService.getErrors();
      const hooksErrors = monitoringService.getHooksErrors();
      const alerts = monitoringService.getAlerts({ resolved: false });
      const healthChecks = monitoringService.getHealthChecks();
      const performanceMetrics = monitoringService.getPerformanceMetrics();

      const renderMetrics = performanceMetrics.filter(m => m.metricType === 'render');
      const avgPerformance = renderMetrics.length > 0 
        ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
        : 0;

      const criticalIssues = alerts.filter(a => a.severity === 'critical').length +
                           hooksErrors.length +
                           healthChecks.filter(h => h.status === 'unhealthy').length;

      setStats({
        totalErrors: errors.length,
        hooksErrors: hooksErrors.length,
        activeAlerts: alerts.length,
        healthyComponents: healthChecks.filter(h => h.status === 'healthy').length,
        totalComponents: healthChecks.length,
        averagePerformance: avgPerformance,
        criticalIssues
      });
    };

    loadStats();

    if (autoRefresh) {
      const interval = setInterval(loadStats, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Subscribe to monitoring updates
  React.useEffect(() => {
    const unsubscribe = monitoringService.subscribe(() => {
      // Reload stats when monitoring data changes
      setStats(prev => ({ ...prev })); // Trigger re-render
    });

    return unsubscribe;
  }, []);

  const getHealthStatus = () => {
    if (stats.criticalIssues > 0) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (stats.activeAlerts > 0) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (stats.totalComponents === stats.healthyComponents && stats.totalComponents > 0) {
      return { status: 'healthy', color: 'text-green-600', bg: 'bg-green-50' };
    }
    return { status: 'unknown', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  const healthStatus = getHealthStatus();

  const exportAllData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      errors: monitoringService.getErrors(),
      hooksErrors: monitoringService.getHooksErrors(),
      alerts: monitoringService.getAlerts(),
      healthChecks: monitoringService.getHealthChecks(),
      performanceMetrics: monitoringService.getPerformanceMetrics().slice(0, 1000), // Limit size
      analytics: {
        errorAnalytics: monitoringService.getErrorAnalytics(),
        performanceAnalytics: monitoringService.getPerformanceAnalytics()
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (compactMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className={`w-80 ${healthStatus.bg} border-2 ${
          healthStatus.status === 'critical' ? 'border-red-200' :
          healthStatus.status === 'warning' ? 'border-yellow-200' :
          healthStatus.status === 'healthy' ? 'border-green-200' :
          'border-gray-200'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Shield className={`h-4 w-4 ${healthStatus.color}`} />
                <span>System Health</span>
                <Badge className={healthStatus.color}>
                  {healthStatus.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(!isVisible)}
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          {isVisible && (
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span className={stats.totalErrors > 0 ? 'text-red-600 font-medium' : ''}>
                    {stats.totalErrors}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hooks Errors:</span>
                  <span className={stats.hooksErrors > 0 ? 'text-red-600 font-medium' : ''}>
                    {stats.hooksErrors}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Alerts:</span>
                  <span className={stats.activeAlerts > 0 ? 'text-yellow-600 font-medium' : ''}>
                    {stats.activeAlerts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Healthy:</span>
                  <span className="text-green-600">
                    {stats.healthyComponents}/{stats.totalComponents}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center text-xs">
                  <span>Avg Render:</span>
                  <span className={stats.averagePerformance > 50 ? 'text-yellow-600' : 'text-green-600'}>
                    {stats.averagePerformance.toFixed(1)}ms
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/monitoring', '_blank')}
                  className="text-xs h-6"
                >
                  Open Dashboard
                </Button>
                <div className="flex items-center space-x-1">
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                    size="sm"
                  />
                  <span className="text-xs">Auto</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        
        {/* Floating Alert System */}
        <div className="mt-2">
          <AlertingSystem 
            maxVisibleAlerts={3}
            autoHideDelay={8000}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Shield className={`h-8 w-8 ${healthStatus.color}`} />
              <span>Monitoring Dashboard</span>
              <Badge className={`${healthStatus.color} ${healthStatus.bg} border-current`}>
                {healthStatus.status.toUpperCase()}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring and alerting for React application health
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
            
            <Button variant="outline" onClick={exportAllData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Errors</p>
              <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hooks Errors</p>
              <div className="text-2xl font-bold text-red-600">{stats.hooksErrors}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
              <div className="text-2xl font-bold text-yellow-600">{stats.activeAlerts}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Healthy Components</p>
              <div className="text-2xl font-bold text-green-600">
                {stats.healthyComponents}/{stats.totalComponents}
              </div>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
              <div className={`text-2xl font-bold ${stats.averagePerformance > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                {stats.averagePerformance.toFixed(1)}ms
              </div>
            </div>
            <TrendingUp className={`h-8 w-8 ${stats.averagePerformance > 50 ? 'text-yellow-500' : 'text-green-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
              <div className={`text-2xl font-bold ${stats.criticalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.criticalIssues}
              </div>
            </div>
            <AlertTriangle className={`h-8 w-8 ${stats.criticalIssues > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Status</p>
              <div className={`text-sm font-bold ${healthStatus.color}`}>
                {healthStatus.status.toUpperCase()}
              </div>
            </div>
            <Shield className={`h-8 w-8 ${healthStatus.color}`} />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monitoringService.getErrors().slice(0, 5).map((error) => (
                    <div key={error.id} className="border-l-4 border-red-500 pl-3 py-2">
                      <div className="font-medium text-sm">{error.componentName}</div>
                      <div className="text-xs text-muted-foreground">{error.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {monitoringService.getErrors().length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No errors recorded
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monitoringService.getHealthChecks().map((health) => (
                    <div key={health.componentName} className="flex items-center justify-between py-2">
                      <span className="font-medium">{health.componentName}</span>
                      <Badge className={
                        health.status === 'healthy' ? 'bg-green-100 text-green-800' :
                        health.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {health.status}
                      </Badge>
                    </div>
                  ))}
                  {monitoringService.getHealthChecks().length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No health checks available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitoringDashboard 
            autoRefresh={autoRefresh}
            refreshInterval={10000}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertingSystem />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitoringService.getHealthChecks().map((health) => (
              <Card key={health.componentName}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{health.componentName}</span>
                    <Badge className={
                      health.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      health.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {health.status.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Render Time:</span>
                      <div className="font-medium">{health.metrics.renderTime.toFixed(1)}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Rate:</span>
                      <div className="font-medium">{(health.metrics.errorRate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  {health.issues.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Issues:</span>
                      <ul className="text-xs text-red-600 mt-1 space-y-1">
                        {health.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Last check: {new Date(health.lastCheck).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};