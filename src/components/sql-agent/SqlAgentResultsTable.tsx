import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, AlertCircle, Eye, EyeOff } from "lucide-react";
import { jsonToCsv, downloadFile, formatNumber } from "@/utils/csvExport";
import { useToast } from "@/hooks/use-toast";
import { VirtualizedTable } from "./VirtualizedTable";

interface SqlAgentResultsTableProps {
  columns: string[];
  rows: any[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function SqlAgentResultsTable({ columns, rows, isLoading, error, onRetry }: SqlAgentResultsTableProps) {
  const { toast } = useToast();
  const [showRawJson, setShowRawJson] = useState(false);

  const data = useMemo(() => {
    return rows.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach(col => {
        obj[col] = row[col];
      });
      return obj;
    });
  }, [columns, rows]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: "Copied!",
        description: "JSON data copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = jsonToCsv(data);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(csv, `query-results-${timestamp}.csv`, 'text/csv');
      toast({
        title: "Downloaded!",
        description: "CSV file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not generate CSV file",
        variant: "destructive",
      });
    }
  };

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-50 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Query Error
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your query could not be processed. Try being more specific or check column names.
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-50 rounded-full">
              <Copy className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Results Found
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            No results found. Try adding explicit columns or filters 
            (e.g., 'full_name, email_address, interactions_count...').
          </p>
        </div>
      </div>
    );
  }

  // Results table
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with export buttons */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Query Results
          </h3>
          <p className="text-sm text-gray-600">
            {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''} × {columns.length} column{columns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="flex items-center space-x-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy JSON</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center space-x-2"
          >
            {showRawJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showRawJson ? 'Hide' : 'Show'} Raw JSON</span>
          </Button>
        </div>
      </div>

      {/* Table or Raw JSON View */}
      {showRawJson ? (
        <div className="p-4 bg-gray-900 text-green-400 rounded-lg max-h-[600px] overflow-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        <VirtualizedTable
          columns={columns}
          rows={rows}
          className="rounded-lg"
        />
      )}
    </div>
  );
}