import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MonitoringDashboard,
  AutoRecoveryProvider,
  ErrorBoundary,
  ComponentHealthMonitor,
  useHealthReporting,
  useAutoRecovery,
  monitoringService
} from '@/components/monitoring';
import { AlertTriangle, Zap, Activity, Bug, RefreshCw } from 'lucide-react';

// Demo component that can trigger various monitoring scenarios
const MonitoringTestComponent: React.FC = () => {
  const [renderDelay, setRenderDelay] = useState(0);
  const [shouldError, setShouldError] = useState(false);
  const [forceRerender, setForceRerender] = useState(0);
  
  const { reportApiCall, reportCustomMetric, updateHealthStatus } = useHealthReporting('MonitoringTestComponent');
  const { triggerRecovery, getRecoveryHistory } = useAutoRecovery('MonitoringTestComponent');

  // Simulate slow render
  if (renderDelay > 0) {
    const start = performance.now();
    while (performance.now() - start < renderDelay) {
      // Busy wait to simulate slow render
    }
  }

  // Trigger error for testing
  if (shouldError) {
    throw new Error('Intentional test error for monitoring demo');
  }

  const triggerSlowRender = () => {
    setRenderDelay(100); // 100ms delay
    setTimeout(() => setRenderDelay(0), 1000);
  };

  const triggerError = () => {
    setShouldError(true);
    setTimeout(() => setShouldError(false), 100);
  };

  const simulateApiCall = async () => {
    const start = performance.now();
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    const duration = performance.now() - start;
    reportApiCall(duration);
  };

  const triggerRecoveryTest = async () => {
    const success = await triggerRecovery();
    console.log('Recovery test result:', success);
  };

  const updateHealth = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    const issues = status === 'healthy' ? [] : [`Manual status change to ${status}`];
    updateHealthStatus(status, issues, {
      renderTime: renderDelay,
      errorRate: shouldError ? 1 : 0
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bug className="h-5 w-5" />
          <span>Monitoring Test Component</span>
          <Badge variant="outline">Demo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button onClick={triggerSlowRender} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Slow Render
          </Button>
          
          <Button onClick={triggerError} variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Trigger Error
          </Button>
          
          <Button onClick={simulateApiCall} variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            API Call
          </Button>
          
          <Button onClick={triggerRecoveryTest} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Test Recovery
          </Button>
          
          <Button onClick={() => updateHealth('degraded')} variant="outline" size="sm">
            Set Degraded
          </Button>
          
          <Button onClick={() => updateHealth('healthy')} variant="outline" size="sm">
            Set Healthy
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Render Delay:</strong> {renderDelay}ms
          </div>
          <div>
            <strong>Error State:</strong> {shouldError ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Renders:</strong> {forceRerender}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Recovery History:</h4>
          <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
            {getRecoveryHistory().length === 0 ? (
              'No recovery attempts'
            ) : (
              getRecoveryHistory().slice(0, 3).map((attempt) => (
                <div key={attempt.id} className="mb-1">
                  {attempt.actionName} - {attempt.success ? '✅' : '❌'} - {new Date(attempt.timestamp).toLocaleTimeString()}
                </div>
              ))
            )}
          </div>
        </div>

        <Button 
          onClick={() => setForceRerender(prev => prev + 1)} 
          variant="secondary" 
          size="sm"
          className="w-full"
        >
          Force Re-render ({forceRerender})
        </Button>
      </CardContent>
    </Card>
  );
};

const MonitoredTestComponent = () => (
  <ErrorBoundary componentName="MonitoringTestComponent" level="component">
    <ComponentHealthMonitor
      componentName="MonitoringTestComponent"
      criticalComponent={false}
      performanceThresholds={{
        maxRenderTime: 50,
        maxErrorRate: 0.1,
        maxApiTime: 2000
      }}
    >
      <MonitoringTestComponent />
    </ComponentHealthMonitor>
  </ErrorBoundary>
);

export const MonitoringDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('demo');

  return (
    <AutoRecoveryProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Monitoring System Demo</h1>
            <p className="text-muted-foreground">
              Comprehensive React hooks error tracking, performance monitoring, and auto-recovery demonstration
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="demo">Interactive Demo</TabsTrigger>
              <TabsTrigger value="dashboard">Full Dashboard</TabsTrigger>
              <TabsTrigger value="compact">Compact View</TabsTrigger>
              <TabsTrigger value="integration">Integration Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="demo" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonitoredTestComponent />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Monitoring Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">🛡️ Error Tracking</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• React hooks violation detection</li>
                        <li>• Component error boundaries</li>
                        <li>• Automatic error reporting</li>
                        <li>• Error pattern analysis</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">📊 Performance Monitoring</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Render time tracking</li>
                        <li>• Memory usage monitoring</li>
                        <li>• API response time tracking</li>
                        <li>• Real-time dashboards</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">🚨 Smart Alerting</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Configurable alert rules</li>
                        <li>• Severity-based notifications</li>
                        <li>• Rate limiting and cooldowns</li>
                        <li>• Multiple notification channels</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">🔧 Auto-Recovery</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Component remounting</li>
                        <li>• State reset mechanisms</li>
                        <li>• Conditional recovery triggers</li>
                        <li>• Recovery attempt tracking</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dashboard">
              <MonitoringDashboard />
            </TabsContent>

            <TabsContent value="compact">
              <div className="relative h-96">
                <MonitoringDashboard compactMode={true} />
                <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Compact monitoring view appears in bottom-right corner
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">1. Basic Setup</h3>
                    <Textarea
                      readOnly
                      value={`import { 
  AutoRecoveryProvider, 
  ErrorBoundary, 
  ComponentHealthMonitor,
  MonitoringDashboard 
} from '@/components/monitoring';

// Wrap your app with the auto-recovery provider
function App() {
  return (
    <AutoRecoveryProvider>
      <YourAppContent />
      <MonitoringDashboard compactMode={true} />
    </AutoRecoveryProvider>
  );
}`}
                      className="font-mono text-sm"
                      rows={15}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">2. Component Monitoring</h3>
                    <Textarea
                      readOnly
                      value={`import { 
  ErrorBoundary, 
  ComponentHealthMonitor, 
  useHealthReporting,
  useAutoRecovery 
} from '@/components/monitoring';

function YourComponent() {
  const { reportApiCall, updateHealthStatus } = useHealthReporting('YourComponent');
  const { triggerRecovery } = useAutoRecovery('YourComponent');

  const handleApiCall = async () => {
    const start = performance.now();
    try {
      const result = await api.call();
      reportApiCall(performance.now() - start);
      return result;
    } catch (error) {
      updateHealthStatus('degraded', ['API call failed']);
      throw error;
    }
  };

  return (
    <ErrorBoundary componentName="YourComponent">
      <ComponentHealthMonitor 
        componentName="YourComponent"
        criticalComponent={true}
      >
        {/* Your component content */}
      </ComponentHealthMonitor>
    </ErrorBoundary>
  );
}`}
                      className="font-mono text-sm"
                      rows={20}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">3. InspectionSchedulingModal Integration</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      The InspectionSchedulingModal has been enhanced with comprehensive monitoring:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>• ✅ Error boundary with React hooks error detection</li>
                      <li>• ✅ Performance monitoring with render time tracking</li>
                      <li>• ✅ API call monitoring for property fetching</li>
                      <li>• ✅ Health status reporting and updates</li>
                      <li>• ✅ Auto-recovery mechanisms for performance issues</li>
                      <li>• ✅ Custom recovery actions for modal-specific scenarios</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">4. Monitoring Dashboard Access</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Access the full monitoring dashboard at:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>• <strong>Compact Mode:</strong> Bottom-right floating widget (always visible)</li>
                      <li>• <strong>Full Dashboard:</strong> Dedicated monitoring page</li>
                      <li>• <strong>Alert System:</strong> Real-time notifications for critical issues</li>
                      <li>• <strong>Performance Analytics:</strong> Detailed metrics and trends</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AutoRecoveryProvider>
  );
};