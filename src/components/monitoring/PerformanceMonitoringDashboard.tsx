import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  MemoryStick,
  Wifi,
  RefreshCw,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { monitoringService, PerformanceMetric, Alert, HealthCheck } from './MonitoringService';
import { format } from 'date-fns';

interface DashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialTimeRange?: '1h' | '6h' | '24h' | '7d';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const PerformanceMonitoringDashboard: React.FC<DashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  initialTimeRange = '1h'
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>(initialTimeRange);
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [isRealTime, setIsRealTime] = useState(autoRefresh);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Data states
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [componentNames, setComponentNames] = useState<string[]>([]);

  // Load data
  const loadData = React.useCallback(() => {
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(now.getTime() - timeRangeMs[timeRange]);

    // Load performance metrics
    const allMetrics = monitoringService.getPerformanceMetrics();
    const filteredMetrics = allMetrics.filter(m => 
      new Date(m.timestamp) >= startTime &&
      (selectedComponent === 'all' || m.componentName === selectedComponent)
    );
    setPerformanceMetrics(filteredMetrics);

    // Load alerts
    const allAlerts = monitoringService.getAlerts({ type: 'performance' });
    const filteredAlerts = allAlerts.filter(a => 
      new Date(a.timestamp) >= startTime &&
      (selectedComponent === 'all' || a.componentName === selectedComponent)
    );
    setAlerts(filteredAlerts);

    // Load health checks
    const allHealthChecks = monitoringService.getHealthChecks();
    const filteredHealthChecks = selectedComponent === 'all' 
      ? allHealthChecks 
      : allHealthChecks.filter(h => h.componentName === selectedComponent);
    setHealthChecks(filteredHealthChecks);

    // Update component names
    const names = [...new Set(allMetrics.map(m => m.componentName))].sort();
    setComponentNames(names);

    setLastUpdated(new Date());
  }, [timeRange, selectedComponent]);

  // Auto-refresh effect
  useEffect(() => {
    loadData();
    
    let interval: NodeJS.Timeout | null = null;
    if (isRealTime) {
      interval = setInterval(loadData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadData, isRealTime, refreshInterval]);

  // Subscribe to monitoring service updates
  useEffect(() => {
    const unsubscribe = monitoringService.subscribe((event) => {
      if (event.type === 'performance' || event.type === 'alert' || event.type === 'health') {
        loadData();
      }
    });

    return unsubscribe;
  }, [loadData]);

  // Computed analytics
  const analytics = useMemo(() => {
    const renderMetrics = performanceMetrics.filter(m => m.metricType === 'render');
    const memoryMetrics = performanceMetrics.filter(m => m.metricType === 'memory');
    const apiMetrics = performanceMetrics.filter(m => m.metricType === 'api');

    const avgRenderTime = renderMetrics.length > 0 
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
      : 0;

    const slowRenders = renderMetrics.filter(m => m.value > 50).length;
    const criticalRenders = renderMetrics.filter(m => m.value > 100).length;

    const currentMemory = memoryMetrics.length > 0 
      ? memoryMetrics[memoryMetrics.length - 1].value 
      : 0;

    const activeAlerts = alerts.filter(a => !a.resolved).length;
    const healthyComponents = healthChecks.filter(h => h.status === 'healthy').length;
    const unhealthyComponents = healthChecks.filter(h => h.status === 'unhealthy').length;

    return {
      totalRenders: renderMetrics.length,
      avgRenderTime,
      slowRenders,
      criticalRenders,
      slowRenderRate: renderMetrics.length > 0 ? (slowRenders / renderMetrics.length) * 100 : 0,
      currentMemoryMB: currentMemory / (1024 * 1024),
      totalApiCalls: apiMetrics.length,
      avgApiTime: apiMetrics.length > 0 ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length : 0,
      activeAlerts,
      healthyComponents,
      unhealthyComponents,
      totalComponents: healthChecks.length
    };
  }, [performanceMetrics, alerts, healthChecks]);

  // Chart data preparation
  const chartData = useMemo(() => {
    const renderMetrics = performanceMetrics
      .filter(m => m.metricType === 'render')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Group by time intervals based on time range
    const intervalMs = {
      '1h': 5 * 60 * 1000,    // 5 minutes
      '6h': 30 * 60 * 1000,   // 30 minutes
      '24h': 60 * 60 * 1000,  // 1 hour
      '7d': 24 * 60 * 60 * 1000 // 1 day
    };

    const interval = intervalMs[timeRange];
    const grouped: Record<string, PerformanceMetric[]> = {};

    renderMetrics.forEach(metric => {
      const timestamp = new Date(metric.timestamp);
      const roundedTime = new Date(Math.floor(timestamp.getTime() / interval) * interval);
      const key = roundedTime.toISOString();
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(metric);
    });

    return Object.entries(grouped).map(([timestamp, metrics]) => ({
      time: format(new Date(timestamp), timeRange === '7d' ? 'MM/dd HH:mm' : 'HH:mm'),
      avgRenderTime: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
      maxRenderTime: Math.max(...metrics.map(m => m.value)),
      count: metrics.length
    }));
  }, [performanceMetrics, timeRange]);

  const componentPerformanceData = useMemo(() => {
    const byComponent: Record<string, PerformanceMetric[]> = {};
    
    performanceMetrics
      .filter(m => m.metricType === 'render')
      .forEach(metric => {
        if (!byComponent[metric.componentName]) {
          byComponent[metric.componentName] = [];
        }
        byComponent[metric.componentName].push(metric);
      });

    return Object.entries(byComponent)
      .map(([name, metrics]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        avgTime: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
        maxTime: Math.max(...metrics.map(m => m.value)),
        count: metrics.length,
        slowRenders: metrics.filter(m => m.value > 50).length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
  }, [performanceMetrics]);

  const exportData = () => {
    const data = {
      analytics,
      performanceMetrics: performanceMetrics.slice(0, 1000), // Limit export size
      alerts: alerts.slice(0, 100),
      healthChecks,
      timestamp: new Date().toISOString(),
      timeRange,
      selectedComponent
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
          <p className="text-muted-foreground">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="realtime">Real-time</Label>
            <Switch
              id="realtime"
              checked={isRealTime}
              onCheckedChange={setIsRealTime}
            />
          </div>
          
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedComponent} onValueChange={setSelectedComponent}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              {componentNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={loadData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" onClick={exportData} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Render Time</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{analytics.avgRenderTime.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground ml-1">ms</span>
              </div>
            </div>
            <Clock className={`h-8 w-8 ${analytics.avgRenderTime > 50 ? 'text-red-500' : 'text-green-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slow Renders</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{analytics.slowRenders}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  ({analytics.slowRenderRate.toFixed(1)}%)
                </span>
              </div>
            </div>
            <TrendingUp className={`h-8 w-8 ${analytics.slowRenderRate > 10 ? 'text-red-500' : 'text-yellow-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{analytics.currentMemoryMB.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground ml-1">MB</span>
              </div>
            </div>
            <MemoryStick className={`h-8 w-8 ${analytics.currentMemoryMB > 100 ? 'text-red-500' : 'text-blue-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{analytics.activeAlerts}</span>
              </div>
            </div>
            <AlertTriangle className={`h-8 w-8 ${analytics.activeAlerts > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Healthy Components</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{analytics.healthyComponents}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  /{analytics.totalComponents}
                </span>
              </div>
            </div>
            <Activity className={`h-8 w-8 ${analytics.healthyComponents === analytics.totalComponents ? 'text-green-500' : 'text-yellow-500'}`} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">API Avg Time</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{analytics.avgApiTime.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground ml-1">ms</span>
              </div>
            </div>
            <Wifi className={`h-8 w-8 ${analytics.avgApiTime > 2000 ? 'text-red-500' : 'text-green-500'}`} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="components">Component Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Render Time Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgRenderTime" stroke="#8884d8" name="Avg Render Time (ms)" />
                  <Line type="monotone" dataKey="maxRenderTime" stroke="#ff7300" name="Max Render Time (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Component Performance Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={componentPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        name === 'avgTime' ? `${Number(value).toFixed(1)}ms` : value,
                        name === 'avgTime' ? 'Avg Render Time' : name
                      ]}
                      labelFormatter={(label) => componentPerformanceData.find(d => d.name === label)?.fullName || label}
                    />
                    <Bar dataKey="avgTime" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {componentPerformanceData.map((component, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{component.fullName}</div>
                          <div className="text-sm text-muted-foreground">
                            {component.count} renders • {component.slowRenders} slow
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{component.avgTime.toFixed(1)}ms avg</div>
                          <div className="text-sm text-muted-foreground">{component.maxTime.toFixed(1)}ms max</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts ({analytics.activeAlerts} active)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No performance alerts in the selected time range
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className={`p-4 border rounded-lg ${alert.resolved ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              {alert.resolved && <Badge variant="outline">RESOLVED</Badge>}
                              {alert.acknowledged && !alert.resolved && <Badge variant="secondary">ACKNOWLEDGED</Badge>}
                            </div>
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                              {alert.componentName} • {format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {!alert.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => monitoringService.acknowledgeAlert(alert.id)}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {!alert.resolved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => monitoringService.resolveAlert(alert.id)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {healthChecks.map((health) => (
              <Card key={health.componentName}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{health.componentName}</span>
                    <Badge className={getHealthStatusColor(health.status)}>
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
                    {health.metrics.memoryUsage && (
                      <div>
                        <span className="text-muted-foreground">Memory:</span>
                        <div className="font-medium">{(health.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                      </div>
                    )}
                    {health.metrics.apiResponseTime && (
                      <div>
                        <span className="text-muted-foreground">API Time:</span>
                        <div className="font-medium">{health.metrics.apiResponseTime.toFixed(0)}ms</div>
                      </div>
                    )}
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
                    Last check: {format(new Date(health.lastCheck), 'MMM dd, HH:mm:ss')}
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