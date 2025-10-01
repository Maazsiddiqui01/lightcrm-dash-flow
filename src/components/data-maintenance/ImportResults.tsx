import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Upload, X } from "lucide-react";
import type { ImportResults as ImportResultsType } from "@/hooks/useCsvImport";

interface ImportResultsProps {
  results: ImportResultsType;
  entityType: 'contacts' | 'opportunities';
  onClose: () => void;
  onImportMore: () => void;
}

export function ImportResults({ results, entityType, onClose, onImportMore }: ImportResultsProps) {
  const successRate = results.total > 0 
    ? Math.round((results.successful / results.total) * 100) 
    : 0;

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

      {/* Errors List */}
      {results.errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm">Import Errors</CardTitle>
            <CardDescription>
              The following rows could not be imported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.errors.map((error, idx) => (
                <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="font-medium text-red-800">Row {error.row}</p>
                  <p className="text-red-600 text-xs">{error.error}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onImportMore}>
          <Upload className="h-4 w-4 mr-2" />
          Import More
        </Button>
        <Button onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    </div>
  );
}
