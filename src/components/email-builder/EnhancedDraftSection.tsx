import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, CheckCircle2, Mail, Send, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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

  // Parse streamed content to show live updates
  let parsedStream: any = null;
  if (streamedContent) {
    try {
      const parsed = JSON.parse(streamedContent);
      parsedStream = Array.isArray(parsed) && parsed.length > 0 ? parsed[0].output : parsed;
    } catch {
      // Still streaming, not valid JSON yet
    }
  }

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Generated Draft
        </CardTitle>
        <CardDescription>
          Real-time AI-powered email generation with streaming
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Generate Button */}
        {!isGenerating && !result && (
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <Button onClick={onGenerate} disabled={disabled} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Draft with AI
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Click to generate a personalized email using AI
            </p>
          </div>
        )}

        {/* Loading State with Live Streaming */}
        {isGenerating && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Generating...</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full h-2" />
            </div>

            {/* Live Stream Preview */}
            {parsedStream && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {parsedStream.subject && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <Badge variant="secondary">Subject Line</Badge>
                    </div>
                    <p className="font-semibold text-lg p-3 bg-primary/5 rounded-lg border">
                      {parsedStream.subject}
                    </p>
                  </div>
                )}

                {parsedStream.to && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-primary" />
                      <Badge variant="secondary">To</Badge>
                    </div>
                    <p className="text-sm p-2 bg-muted/30 rounded">
                      {parsedStream.to}
                    </p>
                  </div>
                )}

                {parsedStream.cc && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <Badge variant="secondary">CC</Badge>
                    </div>
                    <p className="text-sm p-2 bg-muted/30 rounded">
                      {parsedStream.cc}
                    </p>
                  </div>
                )}

                {parsedStream.body && (
                  <div className="space-y-2">
                    <Badge variant="secondary">Email Body</Badge>
                    <div className="p-4 bg-muted/20 rounded-lg border space-y-3">
                      {parsedStream.body.split('\n\n').map((paragraph: string, idx: number) => (
                        <p key={idx} className="text-sm leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!parsedStream && streamedContent && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {streamedContent.substring(0, 200)}...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Final Result */}
        {result && !isGenerating && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <Badge variant="secondary">Subject Line</Badge>
                </div>
                <p className="font-semibold text-lg p-3 bg-primary/5 rounded-lg border">
                  {result.subject}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <Badge variant="secondary">CC Recipients</Badge>
                </div>
                <p className="text-sm p-3 bg-muted/30 rounded-lg">
                  {result.ccList.join('; ')}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Badge variant="secondary">Email Body</Badge>
                <div className="p-4 bg-muted/20 rounded-lg border-2 space-y-4">
                  <p className="font-medium">{result.greeting},</p>
                  
                  {result.body.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-sm leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                  
                  <p className="font-medium mt-4">{result.signature}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleCopy} 
                variant="outline" 
                className="flex-1 gap-2"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button onClick={onGenerate} variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
