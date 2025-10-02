import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, CheckCircle2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface EnhancedDraftSectionProps {
  isGenerating: boolean;
  progress: number;
  streamedContent: string;
  result: {
    body: string;
    subject: string;
    greeting: string;
    signature: string;
    ccList: string[];
  } | null;
  onGenerate: () => void;
  onCopyToClipboard: () => void;
  disabled?: boolean;
}

export function EnhancedDraftSection({
  isGenerating,
  progress,
  streamedContent,
  result,
  onGenerate,
  onCopyToClipboard,
  disabled = false,
}: EnhancedDraftSectionProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyToClipboard();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI-Generated Draft</h3>
          </div>
          {result && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </Badge>
          )}
        </div>

        {/* Generate Button */}
        {!isGenerating && !result && (
          <Button
            onClick={onGenerate}
            disabled={disabled}
            size="lg"
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Draft with AI
          </Button>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Generating draft...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Streaming Preview */}
            {streamedContent && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div className="text-sm whitespace-pre-wrap line-clamp-6">
                  {streamedContent}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated Result */}
        {result && !isGenerating && (
          <div className="space-y-4">
            {/* Subject */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Subject
              </label>
              <div className="mt-1 p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm font-medium">{result.subject}</p>
              </div>
            </div>

            {/* CC Recipients */}
            {result.ccList.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  CC Recipients
                </label>
                <div className="mt-1 p-3 bg-muted/30 rounded-lg border border-border">
                  <p className="text-sm">{result.ccList.join('; ')}</p>
                </div>
              </div>
            )}

            {/* Email Body */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email Body
              </label>
              <div className="mt-1 p-4 bg-muted/30 rounded-lg border border-border max-h-96 overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm space-y-2">
                  <p className="font-medium">{result.greeting},</p>
                  <div>{result.body}</div>
                  <p className="font-medium">{result.signature}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button
                onClick={onGenerate}
                variant="secondary"
                className="flex-1"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
