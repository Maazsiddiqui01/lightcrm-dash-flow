import { useState } from "react";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { SqlAgentPrompt } from "@/components/sql-agent/SqlAgentPrompt";
import { DynamicTable } from "@/components/sql-agent/DynamicTable";
import { ProcessingStatus } from "@/components/sql-agent/ProcessingStatus";
import { useResilientRequest } from "@/hooks/useResilientRequest";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { callN8nProxy } from '@/lib/n8nProxy';

export function MakeYourOwnView() {
  const [lastQuery, setLastQuery] = useState<{ question: string; limit: number } | null>(null);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleQuery = async (question: string, limit: number) => {
    console.log('MakeYourOwnView handleQuery called', { question, limit });
    setLastQuery({ question, limit });
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await callN8nProxy<any>('sql-agent', { question, limit });
      
      const normalized = Array.isArray(result) ? result : (result?.data || [result]);
      setQueryResults(normalized);
      
      if (!normalized || normalized.length === 0) {
        toast({ title: "Query completed", description: "No results found for your query" });
      } else {
        toast({ title: "Query successful!", description: `Found ${normalized.length.toLocaleString()} results` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleQuery(lastQuery.question, lastQuery.limit);
    }
  };

  const copyErrorDetails = (errorDetails: any) => {
    const details = JSON.stringify(errorDetails, null, 2);
    navigator.clipboard.writeText(details);
    toast({ title: "Error details copied", description: "Diagnostics copied to clipboard" });
  };

  return (
    <PageErrorBoundary pageName="Make Your Own View">
      <section className="h-full flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">AI Agent</h1>
          <p className="text-muted-foreground">
            Ask questions in natural language and get custom data views from your CRM
          </p>
        </div>

        {/* Prompt Panel */}
        <SqlAgentPrompt
          onSubmit={handleQuery}
          isLoading={isLoading}
          initialValue={lastQuery?.question || ""}
        />
      </div>

      {/* Results Section */}
      {(isLoading || error || queryResults.length > 0) && (
        <div className="mt-4 mx-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="p-6">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Processing your query...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">Query Failed</h3>
                    <p className="text-red-800">{error}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Try Again</span>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <DynamicTable data={queryResults} />
            </div>
          )}
        </div>
      )}
    </section>
    </PageErrorBoundary>
  );
}
