import { useState } from "react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useEmailBuilderDraft } from "@/hooks/useEmailBuilderDraft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Loader2, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";

interface GenerateDraftButtonProps {
  contactId: string;
  template: EmailTemplate;
}

export function GenerateDraftButton({ contactId, template }: GenerateDraftButtonProps) {
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { payload, isLoading, error } = useEmailBuilderData(contactId, template);
  const draftMutation = useEmailBuilderDraft();

  const handleGenerateDraft = async () => {
    if (!payload) {
      toast({
        title: "Error",
        description: "Payload data is not ready",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await draftMutation.mutateAsync(payload);
      setResult(response);
    } catch (error) {
      console.error("Failed to generate draft:", error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;
    
    const emailContent = `Subject: ${result.subject}\n\n${result.body}`;
    
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Email draft copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const isReady = payload && template && !isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Generate Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGenerateDraft}
          disabled={!isReady || draftMutation.isPending}
          className="w-full"
          size="lg"
        >
          {draftMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Draft...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Generate Email Draft
            </>
          )}
        </Button>

        {!isReady && (
          <div className="text-sm text-muted-foreground text-center space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading contact data...
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Error loading data
              </div>
            )}
            {!contactId && !template && (
              <p>Select a contact and template to generate a draft</p>
            )}
            {!contactId && template && (
              <p>Select a contact to generate a draft</p>
            )}
            {contactId && !template && (
              <p>Select a template to generate a draft</p>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Generated Draft</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  {result.send && (
                    <Badge variant="default">Ready to Send</Badge>
                  )}
                  {result.skip_reason && (
                    <Badge variant="secondary">Skipped</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Subject:</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm">
                    {result.subject}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Body:</label>
                  <Textarea
                    value={result.body}
                    readOnly
                    rows={12}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                {result.cc && (
                  <div>
                    <label className="text-sm font-medium">CC:</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {result.cc}
                    </div>
                  </div>
                )}

                {result.skip_reason && (
                  <div>
                    <label className="text-sm font-medium">Skip Reason:</label>
                    <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      {result.skip_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}