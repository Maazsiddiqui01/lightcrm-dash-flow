import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Upload, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ValidationResults } from "@/hooks/useCsvImport";

interface ImportPreviewProps {
  data: any[];
  validationResults: ValidationResults;
  entityType: 'contacts' | 'opportunities';
  onImport: () => void;
  onCancel: () => void;
}

export function ImportPreview({ data, validationResults, entityType, onImport, onCancel }: ImportPreviewProps) {
  const { valid, invalid, warnings, normalized } = validationResults;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Valid Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{valid.length}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warnings.length}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Invalid Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{invalid.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Normalized Changes */}
      {normalized.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Auto-Corrections Applied</CardTitle>
            <CardDescription>
              These values were automatically normalized to match your data standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {normalized.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="text-sm flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{item.field}:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through">{item.original}</span>
                      <span>→</span>
                      <span className="font-medium">{item.corrected}</span>
                    </div>
                  </div>
                ))}
                {normalized.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ...and {normalized.length - 10} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Invalid Rows Details */}
      {invalid.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Invalid Rows (Will Be Skipped)
            </CardTitle>
            <CardDescription>
              These rows have errors and will not be imported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {invalid.map((item, idx) => (
                  <div key={idx} className="p-3 border border-destructive/30 rounded-md bg-destructive/5">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="destructive" className="text-xs">
                        Row {item.row}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-destructive">
                        • <strong>{item.field}:</strong> {item.message}
                        {item.value && <span className="text-muted-foreground ml-1">(value: "{String(item.value).substring(0, 50)}{String(item.value).length > 50 ? '...' : ''}")</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Warnings Details */}
      {warnings.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings (Can Still Import)
            </CardTitle>
            <CardDescription>
              These rows have minor issues but can be imported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {warnings.map((item, idx) => (
                  <div key={idx} className="p-2 border border-yellow-500/30 rounded-md bg-yellow-500/5">
                    <Badge variant="outline" className="text-xs mb-1 border-yellow-500/50">
                      Row {item.row}
                    </Badge>
                    <p className="text-xs text-yellow-700">{item.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel} size="lg">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={onImport} 
          disabled={valid.length === 0}
          size="lg"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Import {valid.length} Valid {entityType === 'contacts' ? 'Contact' : 'Opportunit'}
          {valid.length !== 1 ? (entityType === 'contacts' ? 's' : 'ies') : 'y'}
        </Button>
      </div>
    </div>
  );
}
