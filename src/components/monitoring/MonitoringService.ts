interface ErrorReport {
  id: string;
  message: string;
  stack: string;
  componentStack: string;
  componentName: string;
  level: 'page' | 'component' | 'section';
  timestamp: string;
  retryCount: number;
  url: string;
  userAgent: string;
  additionalInfo?: any;
}

interface HooksErrorReport extends ErrorReport {
  hooksViolationType: string;
  possibleCause: string;
}

interface PerformanceMetric {
  id: string;
  componentName: string;
  metricType: 'render' | 'operation' | 'api' | 'memory';
  value: number;
  threshold?: number;
  timestamp: string;
  metadata?: any;
}

interface Alert {
  id: string;
  type: 'error' | 'performance' | 'health' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  componentName?: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: any;
}

interface HealthCheck {
  componentName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  metrics: {
    renderTime: number;
    errorRate: number;
    memoryUsage?: number;
    apiResponseTime?: number;
  };
  issues: string[];
}

class MonitoringService {
  private errors: ErrorReport[] = [];
  private hooksErrors: HooksErrorReport[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private alerts: Alert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private subscribers: Set<(data: any) => void> = new Set();
  private alertSubscribers: Set<(alert: Alert) => void> = new Set();
  
  // Configuration
  private config = {
    maxStoredErrors: 1000,
    maxStoredMetrics: 5000,
    maxStoredAlerts: 500,
    performanceThresholds: {
      renderTime: 16, // 60fps
      slowRender: 50,
      criticalRender: 100,
      memoryUsage: 100 * 1024 * 1024, // 100MB
      apiResponseTime: 5000
    },
    alertCooldown: 60000, // 1 minute
    healthCheckInterval: 30000 // 30 seconds
  };

  private lastAlertTimes: Map<string, number> = new Map();

  constructor() {
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Setup performance observers
    this.setupPerformanceObservers();
    
    // Setup memory monitoring
    this.setupMemoryMonitoring();
  }

  // Error Reporting
  reportError(error: ErrorReport): void {
    this.errors.push(error);
    this.trimArray(this.errors, this.config.maxStoredErrors);
    
    // Create alert for error
    this.createAlert({
      type: 'error',
      severity: this.getErrorSeverity(error),
      title: `Error in ${error.componentName}`,
      message: error.message,
      componentName: error.componentName,
      metadata: error
    });

    this.notifySubscribers('error', error);
    this.persistToStorage();
  }

  reportHooksError(hooksError: HooksErrorReport): void {
    this.hooksErrors.push(hooksError);
    this.trimArray(this.hooksErrors, this.config.maxStoredErrors);
    
    // Critical alert for hooks errors
    this.createAlert({
      type: 'error',
      severity: 'critical',
      title: `React Hooks Violation in ${hooksError.componentName}`,
      message: `${hooksError.hooksViolationType}: ${hooksError.possibleCause}`,
      componentName: hooksError.componentName,
      metadata: hooksError
    });

    this.notifySubscribers('hooksError', hooksError);
    this.persistToStorage();
  }

  // Performance Monitoring
  reportPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    this.trimArray(this.performanceMetrics, this.config.maxStoredMetrics);
    
    // Check if metric exceeds thresholds
    this.checkPerformanceThresholds(metric);
    
    this.notifySubscribers('performance', metric);
    this.persistToStorage();
  }

  // Health Checks
  updateHealthCheck(componentName: string, healthData: Partial<HealthCheck>): void {
    const existing = this.healthChecks.get(componentName);
    const updated: HealthCheck = {
      componentName,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      metrics: {
        renderTime: 0,
        errorRate: 0,
        memoryUsage: 0,
        apiResponseTime: 0
      },
      issues: [],
      ...existing,
      ...healthData
    };

    this.healthChecks.set(componentName, updated);
    
    // Create alerts for unhealthy components
    if (updated.status === 'unhealthy') {
      this.createAlert({
        type: 'health',
        severity: 'high',
        title: `Component Health Issue: ${componentName}`,
        message: `Issues detected: ${updated.issues.join(', ')}`,
        componentName,
        metadata: updated
      });
    }

    this.notifySubscribers('health', updated);
  }

  // Alerting
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): void {
    const alertKey = `${alertData.type}_${alertData.componentName}_${alertData.severity}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(alertKey) || 0;

    // Rate limiting
    if (now - lastAlert < this.config.alertCooldown) {
      return;
    }

    const alert: Alert = {
      id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);
    this.trimArray(this.alerts, this.config.maxStoredAlerts);
    this.lastAlertTimes.set(alertKey, now);

    // Notify alert subscribers
    this.alertSubscribers.forEach(callback => callback(alert));
    this.notifySubscribers('alert', alert);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifySubscribers('alertAcknowledged', alert);
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.acknowledged = true;
      this.notifySubscribers('alertResolved', alert);
    }
  }

  // Data Access
  getErrors(filter?: { componentName?: string; level?: string; severity?: string }): ErrorReport[] {
    let filtered = [...this.errors];
    
    if (filter?.componentName) {
      filtered = filtered.filter(e => e.componentName.includes(filter.componentName!));
    }
    if (filter?.level) {
      filtered = filtered.filter(e => e.level === filter.level);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getHooksErrors(): HooksErrorReport[] {
    return [...this.hooksErrors].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getPerformanceMetrics(filter?: { componentName?: string; metricType?: string }): PerformanceMetric[] {
    let filtered = [...this.performanceMetrics];
    
    if (filter?.componentName) {
      filtered = filtered.filter(m => m.componentName.includes(filter.componentName!));
    }
    if (filter?.metricType) {
      filtered = filtered.filter(m => m.metricType === filter.metricType);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getAlerts(filter?: { type?: string; severity?: string; acknowledged?: boolean; resolved?: boolean }): Alert[] {
    let filtered = [...this.alerts];
    
    if (filter?.type) {
      filtered = filtered.filter(a => a.type === filter.type);
    }
    if (filter?.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }
    if (filter?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === filter.acknowledged);
    }
    if (filter?.resolved !== undefined) {
      filtered = filtered.filter(a => a.resolved === filter.resolved);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values()).sort((a, b) => 
      new Date(b.lastCheck).getTime() - new Date(a.lastCheck).getTime()
    );
  }

  // Analytics
  getErrorAnalytics(timeRange?: { start: Date; end: Date }) {
    const errors = timeRange 
      ? this.errors.filter(e => {
          const errorTime = new Date(e.timestamp);
          return errorTime >= timeRange.start && errorTime <= timeRange.end;
        })
      : this.errors;

    const totalErrors = errors.length;
    const hooksErrors = this.hooksErrors.filter(e => 
      !timeRange || (new Date(e.timestamp) >= timeRange.start && new Date(e.timestamp) <= timeRange.end)
    ).length;

    const errorsByComponent = errors.reduce((acc, error) => {
      acc[error.componentName] = (acc[error.componentName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByLevel = errors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors,
      hooksErrors,
      errorsByComponent,
      errorsByLevel,
      errorRate: errors.length / Math.max(1, this.getTotalRenders()),
      criticalErrors: errors.filter(e => this.getErrorSeverity(e) === 'critical').length
    };
  }

  getPerformanceAnalytics(componentName?: string) {
    const metrics = componentName 
      ? this.performanceMetrics.filter(m => m.componentName === componentName)
      : this.performanceMetrics;

    const renderMetrics = metrics.filter(m => m.metricType === 'render');
    const avgRenderTime = renderMetrics.length > 0 
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
      : 0;

    const slowRenders = renderMetrics.filter(m => m.value > this.config.performanceThresholds.slowRender);
    const criticalRenders = renderMetrics.filter(m => m.value > this.config.performanceThresholds.criticalRender);

    return {
      totalRenders: renderMetrics.length,
      avgRenderTime,
      slowRenders: slowRenders.length,
      criticalRenders: criticalRenders.length,
      slowRenderRate: renderMetrics.length > 0 ? (slowRenders.length / renderMetrics.length) * 100 : 0,
      p95RenderTime: this.calculatePercentile(renderMetrics.map(m => m.value), 95),
      p99RenderTime: this.calculatePercentile(renderMetrics.map(m => m.value), 99)
    };
  }

  // Subscriptions
  subscribe(callback: (data: any) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  subscribeToAlerts(callback: (alert: Alert) => void): () => void {
    this.alertSubscribers.add(callback);
    return () => this.alertSubscribers.delete(callback);
  }

  // Private methods
  private getErrorSeverity(error: ErrorReport): 'low' | 'medium' | 'high' | 'critical' {
    if (error.message.toLowerCase().includes('hook') || 
        error.stack.toLowerCase().includes('hook')) {
      return 'critical';
    }
    if (error.level === 'page') return 'high';
    if (error.retryCount >= 3) return 'high';
    return 'medium';
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const { metricType, value, componentName } = metric;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let message = '';

    switch (metricType) {
      case 'render':
        if (value > this.config.performanceThresholds.criticalRender) {
          severity = 'critical';
          message = `Render time ${value.toFixed(1)}ms exceeds critical threshold (${this.config.performanceThresholds.criticalRender}ms)`;
        } else if (value > this.config.performanceThresholds.slowRender) {
          severity = 'high';
          message = `Render time ${value.toFixed(1)}ms exceeds slow threshold (${this.config.performanceThresholds.slowRender}ms)`;
        }
        break;
      case 'memory':
        if (value > this.config.performanceThresholds.memoryUsage) {
          severity = 'high';
          message = `Memory usage ${(value / 1024 / 1024).toFixed(1)}MB exceeds threshold`;
        }
        break;
      case 'api':
        if (value > this.config.performanceThresholds.apiResponseTime) {
          severity = 'medium';
          message = `API response time ${value.toFixed(0)}ms exceeds threshold`;
        }
        break;
    }

    if (severity !== 'low') {
      this.createAlert({
        type: 'performance',
        severity,
        title: `Performance Issue: ${componentName}`,
        message,
        componentName,
        metadata: metric
      });
    }
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private performHealthChecks(): void {
    // Check for components that haven't reported in a while
    const now = Date.now();
    this.healthChecks.forEach((health, componentName) => {
      const lastCheckTime = new Date(health.lastCheck).getTime();
      const timeSinceLastCheck = now - lastCheckTime;
      
      if (timeSinceLastCheck > this.config.healthCheckInterval * 3) {
        this.updateHealthCheck(componentName, {
          status: 'degraded',
          issues: [...health.issues.filter(i => !i.includes('No recent activity')), 'No recent activity detected']
        });
      }
    });
  }

  private setupPerformanceObservers(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.startsWith('React')) {
              this.reportPerformanceMetric({
                id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                componentName: entry.name,
                metricType: 'render',
                value: entry.duration,
                timestamp: new Date().toISOString()
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  private setupMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.reportPerformanceMetric({
            id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            componentName: 'Global',
            metricType: 'memory',
            value: memory.usedJSHeapSize,
            timestamp: new Date().toISOString(),
            metadata: {
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit
            }
          });
        }
      }, 60000); // Every minute
    }
  }

  private notifySubscribers(type: string, data: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback({ type, data });
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  private trimArray<T>(array: T[], maxLength: number): void {
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength);
    }
  }

  private getTotalRenders(): number {
    return this.performanceMetrics.filter(m => m.metricType === 'render').length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private persistToStorage(): void {
    try {
      const data = {
        errors: this.errors.slice(-100), // Keep last 100 errors
        alerts: this.alerts.slice(-50),  // Keep last 50 alerts
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('monitoring_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist monitoring data:', error);
    }
  }

  // Recovery methods
  clearOldData(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    
    this.errors = this.errors.filter(e => new Date(e.timestamp) > cutoff);
    this.hooksErrors = this.hooksErrors.filter(e => new Date(e.timestamp) > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => new Date(m.timestamp) > cutoff);
    this.alerts = this.alerts.filter(a => new Date(a.timestamp) > cutoff);
    
    this.notifySubscribers('dataCleared', { cutoff });
  }
}

export const monitoringService = new MonitoringService();
export type { ErrorReport, HooksErrorReport, PerformanceMetric, Alert, HealthCheck };