import { useState } from "react";
import { SqlAgentPrompt } from "@/components/sql-agent/SqlAgentPrompt";
import { SqlAgentResultsTable } from "@/components/sql-agent/SqlAgentResultsTable";
import { LoadingStatus } from "@/components/sql-agent/LoadingStatus";
import { normalizeAgentResponse } from "@/utils/csvExport";
import { useToast } from "@/hooks/use-toast";

interface QueryState {
  columns: string[];
  rows: any[];
  isLoading: boolean;
  error?: string;
  hasQueried: boolean;
}

export function MakeYourOwnView() {
  const [queryState, setQueryState] = useState<QueryState>({
    columns: [],
    rows: [],
    isLoading: false,
    error: undefined,
    hasQueried: false,
  });
  const [lastQuestion, setLastQuestion] = useState("");
  const { toast } = useToast();

  const runSqlAgent = async (question: string, limit: number = 500) => {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 30000);
    
    try {
      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook-test/SQL-Agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, limit }),
        signal: ctrl.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json().catch(() => ({}));
      return normalizeAgentResponse(data);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleQuery = async (question: string, limit: number) => {
    setQueryState(prev => ({ ...prev, isLoading: true, error: undefined, hasQueried: true }));
    setLastQuestion(question);

    try {
      const { columns, rows } = await runSqlAgent(question, limit);

      setQueryState({
        columns,
        rows,
        isLoading: false,
        error: undefined,
        hasQueried: true,
      });

      if (rows.length === 0) {
        toast({
          title: "Query completed",
          description: "No results found for your query",
        });
      } else {
        toast({
          title: "Query successful!",
          description: `Found ${rows.length.toLocaleString()} results`,
        });
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setQueryState({
        columns: [],
        rows: [],
        isLoading: false,
        error: errorMessage,
        hasQueried: true,
      });

      toast({
        title: "Query failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    if (lastQuestion) {
      handleQuery(lastQuestion, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Make Your Own View
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Ask questions in natural language and get custom data views from your CRM. 
            Be specific about what columns, filters, and limits you want to see.
          </p>
        </div>

        {/* Prompt Panel */}
        <div className="mb-8">
          <SqlAgentPrompt
            onSubmit={handleQuery}
            isLoading={queryState.isLoading}
            initialValue={lastQuestion}
          />
        </div>

        {/* Results Section */}
        {queryState.hasQueried && (
          <div className="space-y-6">
            {queryState.isLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <LoadingStatus />
              </div>
            ) : (
              <SqlAgentResultsTable
                columns={queryState.columns}
                rows={queryState.rows}
                error={queryState.error}
                onRetry={handleRetry}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}