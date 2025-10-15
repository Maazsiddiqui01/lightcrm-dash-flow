import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Email Builder specific Error Boundary
 * Catches errors in the Email Builder page and provides recovery options
 */
export class EmailBuilderErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('❌ Email Builder Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    // Clear error state and attempt recovery
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
          <Card className="max-w-2xl w-full p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Email Builder Error
                </h1>
                <p className="text-sm text-muted-foreground max-w-md">
                  {this.state.error?.message || 'An unexpected error occurred in the Email Builder'}
                </p>
                
                {/* Common issues help text */}
                <div className="pt-4 text-left bg-muted/50 p-4 rounded-lg max-w-md mx-auto">
                  <p className="text-xs font-medium text-foreground mb-2">Common causes:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Empty phrase or subject library</li>
                    <li>Deleted phrases still referenced in settings</li>
                    <li>Invalid module configuration</li>
                    <li>Network connection issues</li>
                  </ul>
                </div>
              </div>

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="w-full text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto max-h-64 font-mono">
                    {this.state.error?.stack}
                    {'\n\n'}
                    Component Stack:
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex flex-wrap gap-3 pt-4 justify-center">
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload}
                  variant="default"
                  size="sm"
                >
                  Reload Page
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="secondary"
                  size="sm"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
