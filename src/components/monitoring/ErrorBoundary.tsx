import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call the onError prop if provided
    this.props.onError?.(error, errorInfo);
    
    // Schedule auto-retry for certain error types
    if (this.shouldAutoRetry(error) && this.state.retryCount < 3) {
      this.scheduleAutoRetry();
    }
  }

  private shouldAutoRetry = (error: Error): boolean => {
    const retryableErrors = [
      'ChunkLoadError',
      'Loading chunk',
      'Network Error',
      'TypeError: null is not an object (evaluating \'dispatcher.useState\')',
    ];
    
    return retryableErrors.some(errorType => 
      error.message.includes(errorType) || error.name.includes(errorType)
    );
  };

  private scheduleAutoRetry = () => {
    const delay = Math.pow(2, this.state.retryCount) * 1000; // Exponential backoff
    
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      showDetails: false,
    }));
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">
                  Application Error
                </CardTitle>
              </div>
              <CardDescription>
                {this.props.componentName
                  ? `An error occurred in ${this.props.componentName}`
                  : 'Something went wrong'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error?.message || 'An unexpected error occurred'}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.toggleDetails}
                  variant="outline"
                  size="sm"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>

              {showDetails && (
                <div className="space-y-2">
                  <details className="text-sm">
                    <summary className="font-medium cursor-pointer">
                      Error Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {error?.stack}
                    </pre>
                  </details>
                  
                  {errorInfo && (
                    <details className="text-sm">
                      <summary className="font-medium cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Retry attempts: {this.state.retryCount}/3
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};