import React, { useEffect, useCallback, useRef, useState } from 'react';
import { monitoringService } from './MonitoringService';

interface HealthMetrics {
  renderCount: number;
  errorCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage?: number;
  apiCalls: number;
  lastApiTime?: number;
  mountTime: number;
  lastUpdate: number;
}

interface ComponentHealthMonitorProps {
  componentName: string;
  children: React.ReactNode;
  healthCheckInterval?: number;
  performanceThresholds?: {
    maxRenderTime: number;
    maxErrorRate: number;
    maxMemoryUsage?: number;
    maxApiTime?: number;
  };
  criticalComponent?: boolean;
  onHealthChange?: (status: 'healthy' | 'degraded' | 'unhealthy', metrics: HealthMetrics, issues: string[]) => void;
}

export const ComponentHealthMonitor: React.FC<ComponentHealthMonitorProps> = ({
  componentName,
  children,
  healthCheckInterval = 30000, // 30 seconds
  performanceThresholds = {
    maxRenderTime: 50,
    maxErrorRate: 0.05, // 5%
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxApiTime: 2000
  },
  criticalComponent = false,
  onHealthChange
}) => {
  const metricsRef = useRef<HealthMetrics>({
    renderCount: 0,
    errorCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    apiCalls: 0,
    mountTime: Date.now(),
    lastUpdate: Date.now()
  });

  const [isMonitoring, setIsMonitoring] = useState(true);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const renderTimerRef = useRef<number>(0);

  // Track component renders
  useEffect(() => {
    const startTime = performance.now();
    renderTimerRef.current = startTime;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - renderTimerRef.current;
      
      const metrics = metricsRef.current;
      metrics.renderCount++;
      metrics.lastRenderTime = renderTime;
      metrics.averageRenderTime = (
        (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / 
        metrics.renderCount
      );
      metrics.lastUpdate = Date.now();

      // Report performance metric
      monitoringService.reportPerformanceMetric({
        id: `health_${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        componentName,
        metricType: 'render',
        value: renderTime,
        threshold: performanceThresholds.maxRenderTime,
        timestamp: new Date().toISOString(),
        metadata: {
          renderCount: metrics.renderCount,
          critical: criticalComponent
        }
      });
    };
  });

  // Memory monitoring for critical components
  useEffect(() => {
    if (criticalComponent && 'memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        if (memory) {
          metricsRef.current.memoryUsage = memory.usedJSHeapSize;
          
          monitoringService.reportPerformanceMetric({
            id: `memory_${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            componentName,
            metricType: 'memory',
            value: memory.usedJSHeapSize,
            threshold: performanceThresholds.maxMemoryUsage,
            timestamp: new Date().toISOString(),
            metadata: {
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit
            }
          });
        }
      };

      const memoryInterval = setInterval(checkMemory, 60000); // Check every minute
      return () => clearInterval(memoryInterval);
    }
  }, [componentName, criticalComponent, performanceThresholds.maxMemoryUsage]);

  // Health assessment function
  const assessHealth = useCallback(() => {
    const metrics = metricsRef.current;
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check render performance
    if (metrics.averageRenderTime > performanceThresholds.maxRenderTime) {
      issues.push(`Average render time (${metrics.averageRenderTime.toFixed(1)}ms) exceeds threshold (${performanceThresholds.maxRenderTime}ms)`);
      status = 'degraded';
    }

    if (metrics.lastRenderTime > performanceThresholds.maxRenderTime * 2) {
      issues.push(`Last render time (${metrics.lastRenderTime.toFixed(1)}ms) is critically slow`);
      status = 'unhealthy';
    }

    // Check error rate
    const errorRate = metrics.renderCount > 0 ? metrics.errorCount / metrics.renderCount : 0;
    if (errorRate > performanceThresholds.maxErrorRate) {
      issues.push(`Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(performanceThresholds.maxErrorRate * 100).toFixed(1)}%)`);
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    // Check memory usage for critical components
    if (criticalComponent && metrics.memoryUsage && performanceThresholds.maxMemoryUsage) {
      if (metrics.memoryUsage > performanceThresholds.maxMemoryUsage) {
        issues.push(`Memory usage (${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds threshold`);
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
      }
    }

    // Check API performance
    if (metrics.lastApiTime && performanceThresholds.maxApiTime) {
      if (metrics.lastApiTime > performanceThresholds.maxApiTime) {
        issues.push(`API response time (${metrics.lastApiTime.toFixed(0)}ms) exceeds threshold`);
        status = status === 'healthy' ? 'degraded' : status;
      }
    }

    // Check if component is inactive
    const timeSinceLastUpdate = Date.now() - metrics.lastUpdate;
    if (timeSinceLastUpdate > healthCheckInterval * 2) {
      issues.push(`Component inactive for ${Math.round(timeSinceLastUpdate / 1000)}s`);
      status = 'degraded';
    }

    // Additional checks for critical components
    if (criticalComponent) {
      if (metrics.renderCount === 0) {
        issues.push('Critical component has not rendered');
        status = 'unhealthy';
      }

      if (issues.length > 2) {
        status = 'unhealthy';
      }
    }

    // Update health check in monitoring service
    monitoringService.updateHealthCheck(componentName, {
      status,
      lastCheck: new Date().toISOString(),
      metrics: {
        renderTime: metrics.averageRenderTime,
        errorRate,
        memoryUsage: metrics.memoryUsage,
        apiResponseTime: metrics.lastApiTime
      },
      issues
    });

    // Notify parent component
    onHealthChange?.(status, metrics, issues);

    return { status, metrics, issues };
  }, [componentName, performanceThresholds, healthCheckInterval, criticalComponent, onHealthChange]);

  // Start health monitoring
  useEffect(() => {
    if (isMonitoring) {
      // Initial health check
      assessHealth();

      // Schedule periodic health checks
      healthCheckIntervalRef.current = setInterval(assessHealth, healthCheckInterval);
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isMonitoring, assessHealth, healthCheckInterval]);

  // Error tracking
  useEffect(() => {
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      metricsRef.current.errorCount++;
      assessHealth();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [assessHealth]);

  // API call tracking
  const trackApiCall = useCallback((responseTime: number) => {
    const metrics = metricsRef.current;
    metrics.apiCalls++;
    metrics.lastApiTime = responseTime;

    monitoringService.reportPerformanceMetric({
      id: `api_${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentName,
      metricType: 'api',
      value: responseTime,
      threshold: performanceThresholds.maxApiTime,
      timestamp: new Date().toISOString(),
      metadata: {
        apiCallCount: metrics.apiCalls
      }
    });
  }, [componentName, performanceThresholds.maxApiTime]);

  // Expose health monitoring controls through context or ref
  const healthControls = {
    getMetrics: () => ({ ...metricsRef.current }),
    assessHealth,
    trackApiCall,
    setMonitoring: setIsMonitoring,
    isMonitoring
  };

  // Add health controls to window for debugging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any)[`healthMonitor_${componentName}`] = healthControls;
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        delete (window as any)[`healthMonitor_${componentName}`];
      }
    };
  }, [componentName, healthControls]);

  return (
    <>
      {children}
    </>
  );
};

// HOC for easy component wrapping
export const withHealthMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ComponentHealthMonitorProps, 'children' | 'componentName'> & {
    componentName?: string;
  } = {}
) => {
  return function HealthMonitoredComponent(props: P) {
    const componentName = options.componentName || Component.displayName || Component.name || 'Component';
    
    return (
      <ComponentHealthMonitor componentName={componentName} {...options}>
        <Component {...props} />
      </ComponentHealthMonitor>
    );
  };
};

// Hook for components to report their own health metrics
export const useHealthReporting = (componentName: string) => {
  const reportApiCall = useCallback((responseTime: number) => {
    monitoringService.reportPerformanceMetric({
      id: `api_${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentName,
      metricType: 'api',
      value: responseTime,
      timestamp: new Date().toISOString()
    });
  }, [componentName]);

  const reportCustomMetric = useCallback((metricType: string, value: number, metadata?: any) => {
    monitoringService.reportPerformanceMetric({
      id: `custom_${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentName,
      metricType: metricType as any,
      value,
      timestamp: new Date().toISOString(),
      metadata
    });
  }, [componentName]);

  const updateHealthStatus = useCallback((
    status: 'healthy' | 'degraded' | 'unhealthy',
    issues: string[] = [],
    metrics: any = {}
  ) => {
    monitoringService.updateHealthCheck(componentName, {
      status,
      lastCheck: new Date().toISOString(),
      metrics: {
        renderTime: 0,
        errorRate: 0,
        ...metrics
      },
      issues
    });
  }, [componentName]);

  return {
    reportApiCall,
    reportCustomMetric,
    updateHealthStatus
  };
};