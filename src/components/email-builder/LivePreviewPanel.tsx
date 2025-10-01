import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Sparkles, MessageSquare, Users } from "lucide-react";

interface LivePreviewPanelProps {
  isGenerating: boolean;
  subject?: string;
  inquiry?: { text: string; category: string };
  assistantClause?: string;
  bodyPreview?: string;
}

export function LivePreviewPanel({
  isGenerating,
  subject,
  inquiry,
  assistantClause,
  bodyPreview,
}: LivePreviewPanelProps) {
  if (isGenerating) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Generating Preview...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject Line */}
        {subject && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-3 w-3" />
              Subject
            </label>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-sm font-medium">{subject}</p>
            </div>
          </div>
        )}

        {/* Inquiry */}
        {inquiry && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-3 w-3" />
              Inquiry
            </label>
            <div className="p-3 rounded-lg bg-background border border-border flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">
                {inquiry.category}
              </Badge>
              <p className="text-sm flex-1">{inquiry.text}</p>
            </div>
          </div>
        )}

        {/* Assistant Clause */}
        {assistantClause && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3 w-3" />
              Assistant Coordination
            </label>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-sm italic text-muted-foreground">{assistantClause}</p>
            </div>
          </div>
        )}

        {/* Body Preview */}
        {bodyPreview && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Preview</label>
            <div className="p-4 rounded-lg bg-background border border-border">
              <p className="text-sm whitespace-pre-wrap">{bodyPreview}</p>
            </div>
          </div>
        )}

        {!subject && !inquiry && !bodyPreview && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a contact to see preview</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
