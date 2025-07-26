// Core monitoring services
export { monitoringService } from './MonitoringService';
export type { 
  ErrorReport, 
  HooksErrorReport, 
  PerformanceMetric, 
  Alert, 
  HealthCheck 
} from './MonitoringService';

// Error boundary and error tracking
export { ErrorBoundary, withErrorBoundary, useErrorReporting } from './ErrorBoundary';

// Performance monitoring
export { PerformanceMonitoringDashboard } from './PerformanceMonitoringDashboard';

// Alerting system
export { AlertingSystem } from './AlertingSystem';

// Health monitoring
export { 
  ComponentHealthMonitor, 
  withHealthMonitoring, 
  useHealthReporting 
} from './ComponentHealthMonitor';

// Auto-recovery system
export { 
  AutoRecoveryProvider, 
  useAutoRecovery, 
  withAutoRecovery, 
  recoveryManager,
  DEFAULT_RECOVERY_ACTIONS 
} from './AutoRecoverySystem';
export type { RecoveryAction, RecoveryAttempt } from './AutoRecoverySystem';

// Main dashboard
export { MonitoringDashboard } from './MonitoringDashboard';

// Utility function to set up comprehensive monitoring for any component
export const setupComponentMonitoring = (
  componentName: string,
  options: {
    criticalComponent?: boolean;
    performanceThresholds?: {
      maxRenderTime?: number;
      maxErrorRate?: number;
      maxMemoryUsage?: number;
      maxApiTime?: number;
    };
    customRecoveryActions?: Array<any>;
    autoRecovery?: boolean;
  } = {}
) => {
  const {
    criticalComponent = false,
    performanceThresholds = {
      maxRenderTime: 50,
      maxErrorRate: 0.05,
      maxMemoryUsage: 100 * 1024 * 1024,
      maxApiTime: 5000
    },
    customRecoveryActions = [],
    autoRecovery = true
  } = options;

  return {
    componentName,
    criticalComponent,
    performanceThresholds,
    customRecoveryActions,
    autoRecovery,
    // Monitoring hooks that can be used in the component
    hooks: {
      useHealthReporting: () => useHealthReporting(componentName),
      useAutoRecovery: () => useAutoRecovery(componentName, customRecoveryActions),
      useErrorReporting
    }
  };
};