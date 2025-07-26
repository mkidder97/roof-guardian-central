import React, { useEffect, useRef, useCallback, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  slowRenders: number;
  totalRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  componentName?: string;
  slowRenderThreshold?: number;
  enableLogging?: boolean;
  onSlowRender?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const {
    componentName = 'Component',
    slowRenderThreshold = 16, // 16ms for 60fps
    enableLogging = process.env.NODE_ENV === 'development',
    onSlowRender
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    totalRenderTime: 0
  });

  const renderStartTimeRef = useRef<number>(0);
  const [, forceUpdate] = useState({});

  // Start measuring render time
  const startMeasure = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  // End measuring and update metrics
  const endMeasure = useCallback(() => {
    const renderTime = performance.now() - renderStartTimeRef.current;
    const metrics = metricsRef.current;
    
    metrics.renderCount += 1;
    metrics.lastRenderTime = renderTime;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
    
    if (renderTime > slowRenderThreshold) {
      metrics.slowRenders += 1;
      
      if (enableLogging) {
        console.warn(`🐌 Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          threshold: `${slowRenderThreshold}ms`,
          renderCount: metrics.renderCount,
          slowRenders: metrics.slowRenders
        });
      }
      
      onSlowRender?.(metrics);
    }
    
    if (enableLogging && metrics.renderCount % 10 === 0) {
      console.log(`📊 ${componentName} performance:`, {
        renders: metrics.renderCount,
        avgTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
        slowRenders: metrics.slowRenders,
        slowRenderRate: `${((metrics.slowRenders / metrics.renderCount) * 100).toFixed(1)}%`
      });
    }
  }, [componentName, slowRenderThreshold, enableLogging, onSlowRender]);

  // Measure this render
  useEffect(() => {
    startMeasure();
    return endMeasure;
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      slowRenders: 0,
      totalRenderTime: 0
    };
    forceUpdate({});
  }, []);

  // Get current metrics
  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);

  return {
    metrics: getMetrics(),
    resetMetrics,
    startMeasure,
    endMeasure
  };
}

// Higher order component for easy wrapping
export function withPerformanceMonitor<P extends object>(
  Component: React.ComponentType<P>,
  options: UsePerformanceMonitorOptions = {}
) {
  return function PerformanceMonitoredComponent(props: P) {
    const { startMeasure, endMeasure } = usePerformanceMonitor(options);
    
    useEffect(() => {
      startMeasure();
      return endMeasure;
    });
    
    return <Component {...props} />;
  };
}

// Hook for measuring specific operations
export function useOperationTimer() {
  const timersRef = useRef<Map<string, number>>(new Map());
  
  const startTimer = useCallback((operationName: string) => {
    timersRef.current.set(operationName, performance.now());
  }, []);
  
  const endTimer = useCallback((operationName: string) => {
    const startTime = timersRef.current.get(operationName);
    if (startTime) {
      const duration = performance.now() - startTime;
      timersRef.current.delete(operationName);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }, []);
  
  return { startTimer, endTimer };
}