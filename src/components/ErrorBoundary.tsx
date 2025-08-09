import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Application Error Boundary caught error:', error);
    console.error('📊 Error details:', errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isEnvError = error?.message?.includes('environment variable') || 
                        error?.message?.includes('supabaseUrl') ||
                        error?.message?.includes('VITE_');

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🚨</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600">
                {isEnvError ? 
                  'Configuration Error: Missing environment variables' :
                  'Something went wrong while loading the application'
                }
              </p>
            </div>

            {isEnvError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h2 className="font-semibold text-red-800 mb-2">Environment Configuration Issue</h2>
                <p className="text-red-700 text-sm mb-3">
                  The application is missing required environment variables. This usually happens when:
                </p>
                <ul className="text-red-700 text-sm space-y-1 ml-4">
                  <li>• The .env file is missing or not loaded properly</li>
                  <li>• Environment variables don't start with VITE_</li>
                  <li>• The development server needs to be restarted</li>
                  <li>• There's a syntax error in the .env file</li>
                </ul>
              </div>
            )}

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Error Details:</h3>
              <code className="text-sm text-red-600 block break-all">
                {error?.message || 'Unknown error occurred'}
              </code>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Reload Application
              </button>
              
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                🔧 Try Again
              </button>
            </div>

            {import.meta.env.DEV && (
              <details className="mt-6">
                <summary className="cursor-pointer text-gray-600 text-sm">
                  🔍 Developer Details (click to expand)
                </summary>
                <div className="mt-3 bg-gray-100 rounded p-3">
                  <pre className="text-xs text-gray-800 overflow-auto">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}