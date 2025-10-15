import { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  pageName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`${this.props.pageName} Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              {this.props.pageName} Error
            </AlertTitle>
            <AlertDescription className="space-y-4 mt-3">
              <p>This page encountered an error and couldn't load properly.</p>
              <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {this.state.error?.message || 'Unknown error'}
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Link to="/dashboard">
                  <Button variant="default">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
