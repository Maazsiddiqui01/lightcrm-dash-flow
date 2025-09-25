import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle } from "lucide-react";
import { DraftResult } from "@/hooks/useDraftGenerator";

interface DraftResultCardProps {
  result: DraftResult | null;
}

export function DraftResultCard({ result }: DraftResultCardProps) {
  const formatDraftContent = (result: DraftResult) => {
    const ccList = result.cc && Array.isArray(result.cc) ? result.cc.join(', ') : 'None';
    
    return `Subject: ${result.subject}

${result.body}

---
CC: ${ccList}
${result.skip_reason ? `Skip Reason: ${result.skip_reason}` : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Draft Result
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3">
            {result.skip_reason && (
              <div className="flex items-center gap-2 p-2 bg-warning-light rounded text-warning-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Skip Reason: {result.skip_reason}</span>
              </div>
            )}
            
            <Textarea
              value={formatDraftContent(result)}
              readOnly
              className="min-h-[200px] font-mono text-sm resize-none"
            />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            Click "Generate Draft" to create an email draft
          </div>
        )}
      </CardContent>
    </Card>
  );
}