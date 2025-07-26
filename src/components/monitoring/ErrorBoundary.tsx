import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { monitoringService } from './MonitoringService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'section';
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to monitoring service
    this.reportError(error, errorInfo);

    // Auto-retry for certain error types
    this.scheduleAutoRetry(error);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Reset error state if children change
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.clearError();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      id: this.state.errorId || 'unknown',
      message: error.message,
      stack: error.stack || '',
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName || 'Unknown',
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalInfo: {
        reactVersion: React.version,
        errorBoundaryLevel: this.props.level
      }
    };

    // Report to monitoring service
    monitoringService.reportError(errorReport);

    // Check if this is a React hooks error
    if (this.isHooksError(error)) {
      monitoringService.reportHooksError({
        ...errorReport,
        hooksViolationType: this.detectHooksViolationType(error),
        possibleCause: this.analyzeHooksError(error)
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error (${errorReport.id})`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Name:', this.props.componentName);
      console.error('Level:', this.props.level);
      console.groupEnd();
    }
  };

  private isHooksError = (error: Error): boolean => {
    const hooksErrorPatterns = [
      /hooks? can only be called/i,
      /invalid hook call/i,
      /rendered (more|fewer) hooks than expected/i,
      /hooks? cannot be called/i,
      /rendered (more|fewer) hooks than during the previous render/i,
      /hooks order/i
    ];

    return hooksErrorPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.stack || '')
    );
  };

  private detectHooksViolationType = (error: Error): string => {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    const content = message + ' ' + stack;

    if (content.includes('rendered more hooks') || content.includes('rendered fewer hooks')) {
      return 'conditional_hooks';
    }
    if (content.includes('cannot be called') && content.includes('component')) {
      return 'hooks_outside_component';
    }
    if (content.includes('loop') || content.includes('nested')) {
      return 'hooks_in_loop';
    }
    if (content.includes('event handler') || content.includes('callback')) {
      return 'hooks_in_callback';
    }
    
    return 'unknown_hooks_violation';
  };

  private analyzeHooksError = (error: Error): string => {
    const message = error.message;
    
    if (message.includes('rendered more hooks')) {
      return 'Likely cause: Conditional hook usage or early returns before hooks. Check for if statements or early returns before all hook calls.';
    }
    if (message.includes('rendered fewer hooks')) {
      return 'Likely cause: Conditional hook usage or new hooks added after conditional logic. Ensure all hooks are called in the same order every render.';
    }
    if (message.includes('cannot be called')) {
      return 'Likely cause: Hooks called outside React function component or outside component render cycle. Move hooks to component body.';
    }
    
    return 'Check React hooks rules: 1) Only call hooks at top level, 2) Only call hooks from React functions, 3) Maintain consistent hook call order.';
  };

  private scheduleAutoRetry = (error: Error) => {
    // Only auto-retry for certain error types and within retry limit
    if (this.state.retryCount < this.maxRetries && this.shouldAutoRetry(error)) {
      const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff
      
      this.retryTimeoutId = setTimeout(() => {
        console.log(`🔄 Auto-retrying after error (attempt ${this.state.retryCount + 1}/${this.maxRetries})`);
        this.handleRetry();
      }, retryDelay);
    }
  };

  private shouldAutoRetry = (error: Error): boolean => {
    // Don't auto-retry hooks errors as they usually require code fixes
    if (this.isHooksError(error)) {
      return false;
    }

    // Auto-retry for network errors, timeouts, etc.
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /fetch/i,
      /load/i,
      /connection/i
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.stack || '')
    );
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
      showDetails: false
    }));

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };

  private clearError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false
    });

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };

  private getErrorSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
    if (!this.state.error) return 'low';

    if (this.isHooksError(this.state.error)) return 'critical';
    if (this.props.level === 'page') return 'high';
    if (this.state.retryCount >= this.maxRetries) return 'high';
    
    return 'medium';
  };

  private getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const isHooksError = this.state.error ? this.isHooksError(this.state.error) : false;

      return (
        <Card className="m-4 border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">
                  {isHooksError ? 'React Hooks Error' : 'Component Error'}
                </span>
                <Badge className={this.getSeverityColor(severity)}>
                  {severity.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {this.state.errorId && (
                  <Badge variant="outline" className="text-xs">
                    ID: {this.state.errorId.slice(-8)}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-xs"
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Summary */}
            <div className="space-y-2">
              <div className="text-sm text-red-700">
                <strong>Component:</strong> {this.props.componentName || 'Unknown'}
              </div>
              <div className="text-sm text-red-700">
                <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
              </div>
              {isHooksError && this.state.error && (
                <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                  <strong>Hooks Analysis:</strong> {this.analyzeHooksError(this.state.error)}
                </div>
              )}
            </div>

            {/* Detailed Error Information */}
            {this.state.showDetails && (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <label className="text-sm font-medium text-red-700">Error Stack:</label>
                  <Textarea
                    readOnly
                    value={this.state.error?.stack || 'No stack trace available'}
                    className="mt-1 text-xs font-mono bg-red-50 border-red-200"
                    rows={8}
                  />
                </div>
                
                {this.state.errorInfo && (
                  <div>
                    <label className="text-sm font-medium text-red-700">Component Stack:</label>
                    <Textarea
                      readOnly
                      value={this.state.errorInfo.componentStack}
                      className="mt-1 text-xs font-mono bg-red-50 border-red-200"
                      rows={6}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-red-600">
                  <div>
                    <strong>Retry Count:</strong> {this.state.retryCount}/{this.maxRetries}
                  </div>
                  <div>
                    <strong>Level:</strong> {this.props.level || 'component'}
                  </div>
                  <div>
                    <strong>Time:</strong> {new Date().toLocaleTimeString()}
                  </div>
                  <div>
                    <strong>React Version:</strong> {React.version}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={this.handleRetry}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={this.state.retryCount >= this.maxRetries}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry ({this.state.retryCount}/{this.maxRetries})
                </Button>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify({
                      error: this.state.error?.message,
                      stack: this.state.error?.stack,
                      componentStack: this.state.errorInfo?.componentStack,
                      componentName: this.props.componentName,
                      errorId: this.state.errorId
                    }, null, 2));
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Copy Debug Info
                </Button>
              )}
            </div>

            {/* Recovery Suggestions */}
            {isHooksError && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Recovery Suggestions:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Check that all hooks are called at the top level of the component</li>
                  <li>• Ensure hooks are not called inside loops, conditions, or nested functions</li>
                  <li>• Verify that hooks are only called from React function components</li>
                  <li>• Check for early returns before hook calls</li>
                  <li>• Review recent changes to component hook usage</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<Props, 'children'> = {}
) => {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for error reporting from within components
export const useErrorReporting = () => {
  const reportError = React.useCallback((error: Error, context?: any) => {
    monitoringService.reportError({
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack || '',
      componentStack: '',
      componentName: context?.componentName || 'Manual Report',
      level: context?.level || 'component',
      timestamp: new Date().toISOString(),
      retryCount: 0,
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalInfo: context
    });
  }, []);

  return { reportError };
};