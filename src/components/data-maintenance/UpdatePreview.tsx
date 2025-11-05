import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface FieldChange {
  field: string;
  displayName: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'updated' | 'cleared';
}

export interface RecordChange {
  id: string;
  recordName: string;
  changes: FieldChange[];
}

interface UpdatePreviewProps {
  changes: RecordChange[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function UpdatePreview({ changes, onConfirm, onCancel }: UpdatePreviewProps) {
  const totalChanges = changes.reduce((sum, record) => sum + record.changes.length, 0);
  
  const changesByType = changes.reduce((acc, record) => {
    record.changes.forEach(change => {
      acc[change.changeType] = (acc[change.changeType] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Group changes for better summary
  const summary = {
    recordsWithChanges: changes.length,
    totalFields: totalChanges,
    added: changesByType.added || 0,
    updated: changesByType.updated || 0,
    cleared: changesByType.cleared || 0
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertDescription>
          <div className="space-y-1">
            <div className="font-semibold text-foreground">
              Update Preview: {summary.recordsWithChanges} {summary.recordsWithChanges === 1 ? 'record' : 'records'} will be updated
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.totalFields} {summary.totalFields === 1 ? 'field' : 'fields'} will be modified
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-2">
        {summary.updated > 0 && (
          <Card className="border-primary/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-primary">{summary.updated}</div>
              <div className="text-xs text-muted-foreground mt-1">Updated</div>
            </CardContent>
          </Card>
        )}
        {summary.added > 0 && (
          <Card className="border-green-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.added}</div>
              <div className="text-xs text-muted-foreground mt-1">Added</div>
            </CardContent>
          </Card>
        )}
        {summary.cleared > 0 && (
          <Card className="border-destructive/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-destructive">{summary.cleared}</div>
              <div className="text-xs text-muted-foreground mt-1">Cleared</div>
            </CardContent>
          </Card>
        )}
      </div>

      <ScrollArea className="h-96 rounded border">
        <div className="p-4 space-y-4">
          {changes.map((record) => (
            <Card key={record.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {record.recordName}
                  <Badge variant="secondary" className="text-xs">
                    {record.changes.length} changes
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  ID: {record.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {record.changes.map((change, idx) => {
                  // Determine styling based on change type
                  let containerClass = "flex items-start gap-2 text-sm p-2 rounded-md ";
                  let valueClass = "";
                  
                  if (change.changeType === 'updated') {
                    containerClass += "bg-primary/5 border border-primary/20";
                    valueClass = "font-medium text-primary px-2 py-0.5 rounded bg-primary/10";
                  } else if (change.changeType === 'added') {
                    containerClass += "bg-green-500/5 border border-green-500/20";
                    valueClass = "font-medium text-green-600 px-2 py-0.5 rounded bg-green-500/10";
                  } else if (change.changeType === 'cleared') {
                    containerClass += "bg-destructive/5 border border-destructive/20";
                    valueClass = "text-destructive";
                  }

                  return (
                    <div key={idx} className={containerClass}>
                      <span className="text-muted-foreground min-w-32 flex-shrink-0 font-medium">
                        {change.displayName}:
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {change.changeType === 'updated' && (
                          <>
                            <span className="text-muted-foreground line-through truncate text-xs">
                              {String(change.oldValue || '(empty)')}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className={valueClass + " truncate"}>
                              {String(change.newValue)}
                            </span>
                          </>
                        )}
                        {change.changeType === 'added' && (
                          <span className={valueClass + " truncate"}>
                            {String(change.newValue)}
                          </span>
                        )}
                        {change.changeType === 'cleared' && (
                          <>
                            <span className="line-through text-muted-foreground truncate text-xs">
                              {String(change.oldValue)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className={valueClass}>(cleared)</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel} size="lg">
          Cancel
        </Button>
        <Button onClick={onConfirm} size="lg" className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Proceed with Update ({summary.recordsWithChanges} {summary.recordsWithChanges === 1 ? 'record' : 'records'})
        </Button>
      </div>
    </div>
  );
}
