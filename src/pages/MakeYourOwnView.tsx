import { useState } from "react";
import { SqlAgentPrompt } from "@/components/sql-agent/SqlAgentPrompt";
import { DynamicTable } from "@/components/sql-agent/DynamicTable";
import { ProcessingStatus } from "@/components/sql-agent/ProcessingStatus";
import { useResilientRequest } from "@/hooks/useResilientRequest";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";

export function MakeYourOwnView() {
  const [lastQuery, setLastQuery] = useState<{ question: string; limit: number } | null>(null);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const { toast } = useToast();
  
  const requestManager = useResilientRequest('https://inverisllc.app.n8n.cloud/webhook/SQL-Agent');

  const handleQuery = async (question: string, limit: number) => {
    console.log('MakeYourOwnView handleQuery called', { question, limit });
    setLastQuery({ question, limit });
    
    console.log('Calling requestManager.submit with:', { question, limit });
    const result = await requestManager.submit({ question, limit });
    
    if (result && !result.error) {
      setQueryResults(Array.isArray(result) ? result : []);
      
      if (!result || (Array.isArray(result) && result.length === 0)) {
        toast({
          title: "Query completed",
          description: "No results found for your query",
        });
      } else {
        toast({
          title: "Query successful!",
          description: `Found ${result.length.toLocaleString()} results`,
        });
      }
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
    toast({
      title: "Error details copied",
      description: "Diagnostics copied to clipboard",
    });
  };

  return (
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
          isLoading={requestManager.isLoading || requestManager.isProcessing}
          initialValue={lastQuery?.question || ""}
        />
      </div>

      {/* Results Section */}
      {(requestManager.isLoading || requestManager.isProcessing || requestManager.error || queryResults.length > 0) && (
        <div className="mt-4 mx-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
          {(requestManager.isLoading || requestManager.isProcessing) ? (
            <div className="p-6">
              <ProcessingStatus
                isLoading={requestManager.isLoading}
                isProcessing={requestManager.isProcessing}
                getElapsedTime={requestManager.getElapsedTime}
                onCancel={requestManager.cancel}
              />
            </div>
          ) : requestManager.error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">Query Failed</h3>
                    <p className="text-red-800">{requestManager.error}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Try Again</span>
                    </Button>
                    
                    {requestManager.data?.error && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyErrorDetails(requestManager.data.error)}
                        className="flex items-center space-x-2 text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy Diagnostics</span>
                      </Button>
                    )}
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
  );
}