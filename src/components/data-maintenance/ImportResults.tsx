import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Upload, X, Download, AlertTriangle } from "lucide-react";
import type { ImportResults as ImportResultsType } from "@/hooks/useCsvImport";
import { Badge } from "@/components/ui/badge";

interface ImportResultsProps {
  results: ImportResultsType;
  entityType: 'contacts' | 'opportunities';
  onClose: () => void;
  onImportMore: () => void;
  onRetryFailed?: (failedRows: any[]) => void;
}

export function ImportResults({ results, entityType, onClose, onImportMore, onRetryFailed }: ImportResultsProps) {
  const successRate = results.total > 0 
    ? Math.round((results.successful / results.total) * 100) 
    : 0;

  // Categorize errors
  const validationErrors = results.errors.filter(e => 
    e.error.includes(':') || e.error.startsWith('⚠️')
  );
  const systemErrors = results.errors.filter(e => 
    e.error.startsWith('❌ System Error')
  );
  const importErrors = results.errors.filter(e => 
    !validationErrors.includes(e) && !systemErrors.includes(e)
  );
  
  // Calculate diagnostics
  const duration = results.endTime && results.startTime 
    ? (results.endTime - results.startTime) / 1000 
    : 0;
  const rowsPerSecond = duration > 0 ? Math.round(results.successful / duration) : 0;

  const handleExportErrors = () => {
    const csvContent = [
      ['Row', 'Error'],
      ...results.errors.map(e => [e.row, e.error])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const handleRetryFailedRows = () => {
    const failedRowsData = results.errors
      .filter(e => e.data)
      .map(e => e.data);
    
    if (onRetryFailed && failedRowsData.length > 0) {
      onRetryFailed(failedRowsData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Indicator */}
      <div className="text-center py-6">
        {results.successful > 0 ? (
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
        ) : (
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        )}
        <h3 className="text-2xl font-bold mb-2">
          {results.successful > 0 ? 'Import Completed!' : 'Import Failed'}
        </h3>
        <p className="text-muted-foreground">
          {results.successful} of {results.total} {entityType} imported successfully
        </p>
        {results.failed > 0 && (
          <div className="mt-2 flex gap-2 justify-center items-center">
            <Badge variant="destructive">{results.failed} failed</Badge>
            {validationErrors.length > 0 && (
              <Badge variant="outline">{validationErrors.length} validation errors</Badge>
            )}
            {importErrors.length > 0 && (
              <Badge variant="outline">{importErrors.length} import errors</Badge>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{results.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{results.successful}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{results.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostics */}
      {duration > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📊 Import Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-bold">{duration.toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Speed</p>
                <p className="font-bold">{rowsPerSecond} rows/sec</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Batches</p>
                <p className="font-bold">
                  {results.batches?.successful || 0}/{results.batches?.total || 0} succeeded
                </p>
              </div>
            </div>
            {results.skipped && results.skipped > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ⏭️ Skipped {results.skipped} duplicate{results.skipped !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Errors List - Categorized */}
      {results.errors.length > 0 && (
        <div className="space-y-4">
          {/* System Errors */}
          {systemErrors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  System Errors
                </CardTitle>
                <CardDescription>
                  Critical errors that prevented the import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-visible">
                  {systemErrors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                      <p className="text-destructive font-medium">{error.error}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <div className="flex flex-row items-center justify-between w-full">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Validation Errors
                    </CardTitle>
                    <CardDescription>
                      These rows have data quality issues and were skipped
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportErrors}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Errors
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-visible">
                  {validationErrors.map((error, idx) => (
                    <div key={idx} className="p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0">Row {error.row}</Badge>
                        <p className="text-orange-900 dark:text-orange-100 text-xs flex-1">{error.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Errors */}
          {importErrors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Import Errors
                </CardTitle>
                <CardDescription>
                  These rows failed during database import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-visible">
                  {importErrors.map((error, idx) => (
                    <div key={idx} className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0">Row {error.row}</Badge>
                        <p className="text-red-900 dark:text-red-100 text-xs flex-1">{error.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t gap-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onImportMore}>
            <Upload className="h-4 w-4 mr-2" />
            Import More
          </Button>
          {importErrors.length > 0 && onRetryFailed && results.errors.some(e => e.data) && (
            <Button variant="outline" onClick={handleRetryFailedRows} className="border-orange-300">
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
              Retry {importErrors.length} Failed Row{importErrors.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
        <Button onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    </div>
  );
}
