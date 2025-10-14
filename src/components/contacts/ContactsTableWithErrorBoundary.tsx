import { Component, ReactNode } from 'react';
import { ContactsTable } from './ContactsTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  filters?: any;
  onOpportunityColumnVisibilityChange?: (visible: boolean) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ContactsTableErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ContactsTable Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Contacts</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>There was an error loading the contacts table.</p>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message || 'Unknown error'}
              </p>
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <ContactsTable
        filters={this.props.filters}
        onOpportunityColumnVisibilityChange={this.props.onOpportunityColumnVisibilityChange}
      />
    );
  }
}

export { ContactsTableErrorBoundary, ContactsTableErrorBoundary as ContactsTableWithErrorBoundary };
