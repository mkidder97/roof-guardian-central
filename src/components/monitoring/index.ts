// Monitoring system index - simplified exports
export { ComponentHealthMonitor } from './ComponentHealthMonitor';
export { DatabasePerformanceMonitor } from './DatabasePerformanceMonitor';
export { AlertingSystem } from './AlertingSystem';
export { MonitoringDashboard } from './MonitoringDashboard';
export { ErrorBoundary } from './ErrorBoundary';
export { AutoRecoverySystem } from './AutoRecoverySystem';
export { PerformanceMonitoringDashboard } from './PerformanceMonitoringDashboard';

// Simplified monitoring service exports
export const MonitoringService = {
  init: () => console.log('Monitoring initialized'),
  track: (event: string, data?: any) => console.log('Event tracked:', event, data),
  error: (error: Error, context?: any) => console.error('Error tracked:', error, context)
};

// Simplified hook exports
export const usePerformanceMonitor = () => ({
  metrics: {},
  isLoading: false,
  error: null
});

export const useHealthMonitor = () => ({
  health: { status: 'healthy' },
  isLoading: false,
  error: null
});

export const useAlertSystem = () => ({
  alerts: [],
  isLoading: false,
  error: null,
  addAlert: () => {},
  removeAlert: () => {}
});