import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
  props?: any;
}

/**
 * Hook for monitoring component performance
 * Tracks render times and identifies performance bottlenecks
 */
export function usePerformanceMonitor(componentName: string, props?: any) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);

  // Start performance measurement
  renderStartTime.current = performance.now();
  renderCount.current++;

  useEffect(() => {
    // Calculate render time
    const renderTime = performance.now() - renderStartTime.current;
    totalRenderTime.current += renderTime;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
      props
    };

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      if (renderTime > 16) { // More than one frame (60 FPS)
        console.warn(`🐌 Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
          averageRenderTime: `${(totalRenderTime.current / renderCount.current).toFixed(2)}ms`
        });
      }

      // Log every 10th render for tracking
      if (renderCount.current % 10 === 0) {
        console.log(`📊 Performance stats for ${componentName}:`, {
          totalRenders: renderCount.current,
          averageRenderTime: `${(totalRenderTime.current / renderCount.current).toFixed(2)}ms`,
          totalTime: `${totalRenderTime.current.toFixed(2)}ms`
        });
      }
    }

    // Send metrics to analytics in production
    if (process.env.NODE_ENV === 'production' && renderTime > 50) {
      // Only send metrics for significantly slow renders
      sendPerformanceMetrics(metrics);
    }
  });

  const markStart = useCallback((label: string) => {
    performance.mark(`${componentName}-${label}-start`);
  }, [componentName]);

  const markEnd = useCallback((label: string) => {
    performance.mark(`${componentName}-${label}-end`);
    performance.measure(
      `${componentName}-${label}`,
      `${componentName}-${label}-start`,
      `${componentName}-${label}-end`
    );
  }, [componentName]);

  return {
    markStart,
    markEnd,
    renderCount: renderCount.current,
    averageRenderTime: totalRenderTime.current / renderCount.current
  };
}

/**
 * Higher-order component for performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    usePerformanceMonitor(name, props);
    
    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for measuring async operations
 */
export function useAsyncPerformanceMonitor() {
  const measureAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now();
    const startMark = `${operationName}-start`;
    const endMark = `${operationName}-end`;
    
    performance.mark(startMark);
    
    try {
      const result = await operation();
      performance.mark(endMark);
      
      const duration = performance.now() - startTime;
      performance.measure(operationName, startMark, endMark);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName} completed in ${duration.toFixed(2)}ms`);
      }
      
      if (duration > 1000) {
        console.warn(`🐌 Slow async operation: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      performance.mark(endMark);
      performance.measure(`${operationName}-error`, startMark, endMark);
      
      console.error(`❌ ${operationName} failed:`, error);
      throw error;
    }
  }, []);

  return { measureAsync };
}

/**
 * Hook for monitoring memory usage
 */
export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    if ('memory' in performance && process.env.NODE_ENV === 'development') {
      const memory = (performance as any).memory;
      
      const logMemory = () => {
        console.log(`🧠 Memory usage for ${componentName}:`, {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      };

      // Log memory usage on mount and unmount
      logMemory();
      
      return () => {
        logMemory();
      };
    }
  }, [componentName]);
}

// Utility function to send metrics to analytics
function sendPerformanceMetrics(metrics: PerformanceMetrics) {
  // In a real application, you would send this to your analytics service
  // For example: analytics.track('component_performance', metrics);
  
  // For now, we'll just store it locally for debugging
  if (typeof window !== 'undefined') {
    const existingMetrics = JSON.parse(
      localStorage.getItem('performance_metrics') || '[]'
    );
    existingMetrics.push(metrics);
    
    // Keep only the last 100 metrics
    if (existingMetrics.length > 100) {
      existingMetrics.splice(0, existingMetrics.length - 100);
    }
    
    localStorage.setItem('performance_metrics', JSON.stringify(existingMetrics));
  }
}

/**
 * Utility to get stored performance metrics for debugging
 */
export function getStoredPerformanceMetrics(): PerformanceMetrics[] {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('performance_metrics') || '[]');
  }
  return [];
}

/**
 * Utility to clear stored performance metrics
 */
export function clearPerformanceMetrics() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('performance_metrics');
  }
}