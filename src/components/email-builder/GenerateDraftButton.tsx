import { useState } from "react";
import { useContactEnriched } from "@/hooks/useContactEnriched";
import { useFocusAreaDescriptions } from "@/hooks/useFocusAreaDescriptions";
import { useArticlesByFocusAreas } from "@/hooks/useArticlesByFocusAreas";
import { useEmailBuilderDraft } from "@/hooks/useEmailBuilderDraft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Loader2, Copy, CheckCircle } from "lucide-react";
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

  const { data: enrichedData } = useContactEnriched(contactId);
  const { data: focusAreaDescriptions } = useFocusAreaDescriptions(enrichedData?.focusAreas || []);
  const { data: articles } = useArticlesByFocusAreas(enrichedData?.focusAreas || []);
  const draftMutation = useEmailBuilderDraft();

  const handleGenerateDraft = async () => {
    if (!enrichedData) {
      toast({
        title: "Error",
        description: "Contact data is not loaded",
        variant: "destructive",
      });
      return;
    }

    const { contact, focusAreas, opps, focusMeta, mostRecentContact, OutreachDate, delta_type } = enrichedData;

    // Prepare assistants array
    const assistantNames = Array.from(new Set(
      (focusMeta || [])
        .map(meta => meta.assistant_name)
        .filter(Boolean)
    ));

    // Prepare CC emails
    const lgEmailsCc = Array.from(new Set([
      ...(focusMeta || []).flatMap(meta => [meta.lead1_email, meta.lead2_email, meta.assistant_email]),
      contact.lgEmailsCc
    ].filter(Boolean))).join("; ");

    // Prepare payload
    const payload = {
      contact: {
        firstName: contact.firstName || "",
        fullName: contact.fullName || "",
        email: contact.email || "",
        organization: contact.organization || "",
        lgEmailsCc: lgEmailsCc || "",
      },
      focusAreas: focusAreas || [],
      focusAreaDescriptions: focusAreaDescriptions || [],
      opps: (opps || []).map(opp => opp.deal_name),
      assistantNames,
      delta_type: delta_type || "Email",
      mostRecentContact: mostRecentContact || new Date().toISOString().split('T')[0],
      OutreachDate: OutreachDate || new Date().toISOString().split('T')[0],
      template: {
        id: template.id,
        name: template.name,
        description: template.description || "",
        is_preset: template.is_preset,
        customInstructions: template.custom_instructions || "",
        customInsertion: template.custom_insertion || "before_closing",
      },
      articles: (articles || []).map(article => ({
        focus_area: article.focus_area,
        article_link: article.article_link,
      })),
    };

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

  const isReady = enrichedData && template;

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
          <p className="text-sm text-muted-foreground text-center">
            Select a contact and template to generate a draft
          </p>
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