import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Copy, Download, AlertCircle } from "lucide-react";
import { jsonToCsv, downloadFile } from "@/utils/csvExport";
import { useToast } from "@/hooks/use-toast";

interface SqlAgentResultsTableProps {
  data: Record<string, any>[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function SqlAgentResultsTable({ data, isLoading, error, onRetry }: SqlAgentResultsTableProps) {
  const { toast } = useToast();

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

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
  if (!data || data.length === 0) {
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
            {data.length.toLocaleString()} row{data.length !== 1 ? 's' : ''} × {columns.length} column{columns.length !== 1 ? 's' : ''}
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
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="h-[600px]">
        <div className="min-w-full">
          <Table>
            <TableHeader className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column} 
                    className="font-semibold text-gray-900 bg-gray-50 border-r border-gray-200 last:border-r-0 px-4 py-3 text-left"
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={index}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={`${index}-${column}`}
                      className="px-4 py-3 border-r border-gray-200 last:border-r-0 text-sm"
                    >
                      <div className="max-w-xs truncate" title={String(row[column] ?? '')}>
                        {row[column] != null ? String(row[column]) : '—'}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}