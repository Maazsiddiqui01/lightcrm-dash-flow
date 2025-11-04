import { Component, ReactNode } from 'react';
import { OpportunitiesTable } from './OpportunitiesTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  filters: any;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedRows?: string[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class OpportunitiesErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('OpportunitiesTable Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Opportunities Table Error</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Failed to load opportunities table. This could be due to:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Network connectivity issues</li>
                <li>Database query errors</li>
                <li>Invalid filter parameters</li>
              </ul>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export function OpportunitiesTableWithErrorBoundary({ filters, onSelectionChange, selectedRows }: Omit<Props, 'children'>) {
  return (
    <OpportunitiesErrorBoundary filters={filters}>
      <OpportunitiesTable 
        filters={filters} 
        onSelectionChange={onSelectionChange}
        selectedRows={selectedRows}
      />
    </OpportunitiesErrorBoundary>
  );
}
