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

  return (
    <div className="space-y-4">
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          <strong>Update Preview:</strong> {changes.length} opportunities will be updated 
          with {totalChanges} field changes
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-2">
        {changesByType.updated && (
          <Badge variant="outline" className="justify-center py-2">
            {changesByType.updated} Updated
          </Badge>
        )}
        {changesByType.added && (
          <Badge variant="outline" className="justify-center py-2 bg-green-50">
            {changesByType.added} Added
          </Badge>
        )}
        {changesByType.cleared && (
          <Badge variant="outline" className="justify-center py-2 bg-red-50">
            {changesByType.cleared} Cleared
          </Badge>
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
                {record.changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm p-2 rounded"
                  >
                    <span className="text-muted-foreground min-w-32 flex-shrink-0">
                      {change.displayName}:
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {change.changeType === 'updated' && (
                        <>
                          <span className="text-muted-foreground line-through truncate">
                            {change.oldValue || '(empty)'}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium bg-yellow-100 px-2 py-0.5 rounded truncate">
                            {change.newValue}
                          </span>
                        </>
                      )}
                      {change.changeType === 'added' && (
                        <span className="font-medium bg-green-100 px-2 py-0.5 rounded truncate">
                          {change.newValue}
                        </span>
                      )}
                      {change.changeType === 'cleared' && (
                        <>
                          <span className="line-through text-red-600 truncate">
                            {change.oldValue}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-red-600">(cleared)</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>
          Proceed with Update ({changes.length} opportunities)
        </Button>
      </div>
    </div>
  );
}
