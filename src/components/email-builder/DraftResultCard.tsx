import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, AlertCircle, Mail, MessageSquare } from "lucide-react";
import { DraftResult } from "@/hooks/useDraftGenerator";
import { DraftLoadingState } from "./DraftLoadingState";

interface DraftResultCardProps {
  result: DraftResult | null;
  isLoading?: boolean;
}

export function DraftResultCard({ result, isLoading = false }: DraftResultCardProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Draft Result
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <DraftLoadingState />
        ) : result ? (
          <div className="space-y-3">
            {result.skip_reason && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 rounded text-warning-foreground border border-warning/20">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Skip Reason: {result.skip_reason}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Subject
                </Label>
                <Input
                  value={result.subject || ''}
                  readOnly
                  className="font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Email Body
                </Label>
                <Textarea
                  value={result.body || ''}
                  readOnly
                  className="min-h-[200px] text-sm resize-none"
                />
              </div>
              
              {result.cc && result.cc.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">CC Recipients</Label>
                  <div className="flex flex-wrap gap-1">
                    {result.cc.map((email, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
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