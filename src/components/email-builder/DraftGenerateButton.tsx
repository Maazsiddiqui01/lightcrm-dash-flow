import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Send, AlertTriangle } from "lucide-react";
import { buildDraftPayload } from "@/lib/payload";
import { buildCc } from "@/lib/buildCc";
import { useToast } from "@/hooks/use-toast";
import type { ContactEmailComposer } from "@/types/emailComposer";
import type { ModuleStates } from "@/components/email-builder/ModulesCard";
import type { Article } from "@/types/emailComposer";
import type { MasterTemplate } from "@/lib/router";

// Response type from n8n Email-Builder webhook
export interface DraftBuilderResult {
  subject: string;
  body: string;
  cc?: string;
  send: boolean;
  skip_reason?: string;
}

interface DraftGenerateButtonProps {
  contactData: ContactEmailComposer | null;
  deltaType: 'Email' | 'Meeting';
  moduleStates: ModuleStates;
  selectedArticle: Article | null;
  masterTemplate: MasterTemplate | null;
}

export function DraftGenerateButton({
  contactData,
  deltaType,
  moduleStates,
  selectedArticle,
  masterTemplate
}: DraftGenerateButtonProps) {
  const [draftResult, setDraftResult] = useState<DraftBuilderResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Validation - more robust checks
  const canGenerate = contactData && 
    contactData.email && 
    contactData.focus_areas && 
    contactData.focus_areas.length > 0 &&
    masterTemplate;
  
  const hasWarning = deltaType === 'Meeting' && 
    (!contactData?.assistant_emails || contactData.assistant_emails.length === 0);

  const handleGenerateDraft = async () => {
    if (!contactData || !canGenerate) return;

    // Clear previous result
    setDraftResult(null);
    setIsGenerating(true);

    try {
      // Build complete payload with all helpers
      const payload = buildDraftPayload(contactData, {
        deltaType,
        moduleStates,
        selectedArticle,
        masterTemplate,
      });

      console.log('Sending enriched payload to n8n Email-Builder webhook:', payload);

      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Email-Builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Received response from n8n Email-Builder webhook:', result);
      
      setDraftResult(result as DraftBuilderResult);
      
      toast({
        title: "Draft Generated Successfully",
        description: `Email draft created${result.send ? ' and ready to send' : ''}`,
      });
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast({
        title: "Draft Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate email draft",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!draftResult) return;

    const ccList = contactData ? buildCc(
      contactData.lg_emails_cc,
      contactData.lead_emails || [],
      contactData.assistant_emails || [],
      deltaType,
      contactData.email
    ) : '';

    const emailContent = [
      `Subject: ${draftResult.subject}`,
      `To: ${contactData?.email || ''}`,
      ccList ? `CC: ${ccList}` : '',
      '',
      draftResult.body
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(emailContent);
      toast({
        title: "Copied to Clipboard",
        description: "Email draft has been copied to your clipboard",
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Email Preview
          {draftResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Warnings */}
        {!canGenerate && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {!contactData && "Please select a contact. "}
              {contactData && !contactData.email && "Contact email required. "}
              {contactData && (!contactData.focus_areas || contactData.focus_areas.length === 0) && "At least one focus area required. "}
              {!masterTemplate && "Template routing required."}
            </span>
          </div>
        )}

        {hasWarning && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Meeting selected but no assistant emails found. CC list may be incomplete.
            </span>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateDraft}
          disabled={!canGenerate || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            "Generating Draft..."
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Generate Draft
            </>
          )}
        </Button>

        {/* Draft Result */}
        {isGenerating && (
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        )}

        {draftResult && (
          <div className="space-y-4">
            <Separator />
            
            {/* Send Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={
                draftResult.skip_reason ? "secondary" :
                draftResult.send ? "default" : "destructive"
              }>
                {draftResult.skip_reason ? "Blackout" :
                 draftResult.send ? "Ready to Send" : "Draft Only"}
              </Badge>
            </div>

            {/* Skip Reason */}
            {draftResult.skip_reason && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Skip Reason:</strong> {draftResult.skip_reason}
                </p>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject:</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{draftResult.subject}</p>
              </div>
            </div>

            {/* CC Preview */}
            {contactData && (
              <div className="space-y-2">
                <label className="text-sm font-medium">CC:</label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {draftResult.cc || buildCc(
                      contactData.lg_emails_cc,
                      contactData.lead_emails || [],
                      contactData.assistant_emails || [],
                      deltaType,
                      contactData.email
                    ) || "No CC recipients"}
                  </p>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Body:</label>
              <div className="p-3 bg-muted rounded-lg max-h-80 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {draftResult.body}
                </pre>
              </div>
            </div>

            {/* Article Insertion Preview */}
            {selectedArticle && moduleStates.article_recommendations && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Article insertion:</strong> I came across this and thought to share: {selectedArticle.article_link}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}