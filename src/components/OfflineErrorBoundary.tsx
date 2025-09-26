import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  isOnline: boolean;
}

class OfflineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      isOnline: navigator.onLine 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      isOnline: navigator.onLine 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OfflineErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a network-related error
    const isNetworkError = error.message.includes('Failed to fetch') ||
                          error.message.includes('dynamically imported module') ||
                          error.message.includes('Loading chunk') ||
                          error.message.includes('net::ERR');
    
    if (isNetworkError && !navigator.onLine) {
      console.log('Network error detected while offline - showing offline fallback');
    }
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
    // Automatically retry when coming back online
    if (this.state.hasError) {
      this.handleRetry();
    }
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const isNetworkError = this.state.error?.message.includes('dynamically imported module') ||
                            this.state.error?.message.includes('Failed to fetch') ||
                            this.state.error?.message.includes('Loading chunk');

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {!this.state.isOnline ? (
                  <WifiOff className="h-12 w-12 text-muted-foreground" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 text-xl font-bold">!</span>
                  </div>
                )}
              </div>
              <CardTitle className="text-xl">
                {!this.state.isOnline ? 'You\'re Offline' : (fallbackTitle || 'Something went wrong')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                {!this.state.isOnline ? (
                  'This page requires an internet connection. Please check your connection and try again.'
                ) : (
                  fallbackMessage || 'We\'re sorry, but something unexpected happened. Please try refreshing the page.'
                )}
              </p>

              {!this.state.isOnline && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Visit the <strong>Offline Learning</strong> tab to access your downloaded courses while offline.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={this.handleRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-sm font-medium cursor-pointer text-muted-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default OfflineErrorBoundary;
