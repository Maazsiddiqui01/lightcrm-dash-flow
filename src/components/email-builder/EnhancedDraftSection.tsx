import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, CheckCircle2, Mail, Send, Users, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CopyButton } from "@/components/shared/CopyButton";
import DOMPurify from "dompurify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Pipeline2026Result {
  email_html: string;
  to_email: string;
  cc_emails: string | null;
  bcc_emails: string | null;
}

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
  onGenerate2026?: () => void;
  is2026Generating?: boolean;
  pipeline2026Success?: boolean;
  pipeline2026Result?: Pipeline2026Result | null;
  onCopyToClipboard: () => void;
  disabled?: boolean;
}

export function EnhancedDraftSection({
  isGenerating,
  progress,
  streamedContent,
  result,
  onGenerate,
  onGenerate2026,
  is2026Generating = false,
  pipeline2026Success = false,
  pipeline2026Result = null,
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

  // Extract plain text from HTML for clipboard copy
  const getPlainTextFromHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

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
        {/* Generate Button - Split: Primary = 2026 Pipeline, Dropdown = Legacy */}
        {!isGenerating && !is2026Generating && !result && !pipeline2026Success && (
          <div className="text-center py-12 animate-fade-in">
            <div className="mb-4 flex justify-center">
              <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Button
                onClick={onGenerate2026 || onGenerate}
                disabled={disabled}
                size="lg"
                className="gap-2 hover-scale rounded-r-none"
              >
                <Sparkles className="h-4 w-4" />
                Draft 2026 Pipeline
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={disabled}
                    className="rounded-l-none px-2 border-l-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onGenerate}>
                    Legacy Draft (Email Builder)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Draft will be created in your Outlook drafts folder
            </p>
          </div>
        )}

        {/* 2026 Pipeline Loading State */}
        {is2026Generating && (
          <div className="text-center py-12 space-y-4">
            <div className="mb-4 flex justify-center">
              <div className="p-4 rounded-full bg-primary/10 animate-spin">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="font-medium">Creating draft in Outlook...</p>
            <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
          </div>
        )}

        {/* 2026 Pipeline Success State with Draft Preview */}
        {pipeline2026Success && !isGenerating && !result && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="mb-2 flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="font-semibold text-lg">Draft Created in Outlook</p>
              <p className="text-sm text-muted-foreground">Check your Outlook drafts folder</p>
            </div>

            {/* Show the draft preview if we have it */}
            {pipeline2026Result?.email_html && (
              <>
                <Separator />
                
                {/* To / CC / BCC fields */}
                <div className="space-y-3">
                  {pipeline2026Result.to_email && (
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="shrink-0 mt-0.5">To</Badge>
                      <p className="text-sm text-foreground">{pipeline2026Result.to_email}</p>
                    </div>
                  )}
                  {pipeline2026Result.cc_emails && (
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="shrink-0 mt-0.5">CC</Badge>
                      <p className="text-sm text-foreground">{pipeline2026Result.cc_emails}</p>
                    </div>
                  )}
                  {pipeline2026Result.bcc_emails && (
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="shrink-0 mt-0.5">BCC</Badge>
                      <p className="text-sm text-foreground">{pipeline2026Result.bcc_emails}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Email body rendered as HTML */}
                <div className="space-y-2">
                  <Badge variant="secondary">Email Body</Badge>
                  <div 
                    className="p-4 bg-muted/20 rounded-lg border-2 prose prose-sm max-w-none dark:prose-invert
                      [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-sm [&_p]:text-foreground"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(pipeline2026Result.email_html) 
                    }} 
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <CopyButton
                    textToCopy={getPlainTextFromHtml(pipeline2026Result.email_html)}
                    successMessage="Copied to clipboard!"
                    onCopySuccess={onCopyToClipboard}
                    variant="outline"
                    className="flex-1"
                  >
                    Copy to Clipboard
                  </CopyButton>
                  <Button 
                    onClick={onGenerate2026 || onGenerate} 
                    variant="outline" 
                    className="gap-2 hover-scale"
                  >
                    <Sparkles className="h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </>
            )}

            {/* Fallback if no draft content returned */}
            {!pipeline2026Result?.email_html && (
              <Button
                onClick={onGenerate2026 || onGenerate}
                variant="outline"
                className="gap-2 mt-4 mx-auto block"
              >
                <Sparkles className="h-4 w-4" />
                Generate Another
              </Button>
            )}
          </div>
        )}

        {/* Loading State with Live Streaming (Legacy) */}
        {isGenerating && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Generating...</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full h-2" />
            </div>

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
                      {(parsedStream.body || '').split('\n\n').map((paragraph: string, idx: number) => (
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

        {/* Final Result (Legacy) */}
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
                  
                  {(result.body || '').split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-sm leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                  
                  <p className="font-medium mt-4">{result.signature}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <CopyButton
                textToCopy={`Subject: ${result.subject}\n\nCC: ${result.ccList.join('; ')}\n\n${result.greeting},\n\n${result.body}\n\n${result.signature}`}
                successMessage="Copied to clipboard!"
                onCopySuccess={onCopyToClipboard}
                variant="outline"
                className="flex-1"
              >
                Copy to Clipboard
              </CopyButton>
              <Button onClick={onGenerate} variant="outline" className="gap-2 hover-scale">
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
