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
import { buildModuleConfiguration } from "@/lib/draftGeneration";
import { useGlobalPhrases } from "@/hooks/usePhraseLibrary";
import { useGlobalInquiries } from "@/hooks/useInquiryLibrary";
import { useSubjectLibrary, selectSubject } from "@/hooks/useSubjectLibrary";
import { useLogPhraseUsage, useLogInquiryUsage } from "@/hooks/useRotationTracking";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";

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

  // Load global libraries
  const { data: masterTemplates } = useMasterTemplates();
  const { data: globalPhrases = [] } = useGlobalPhrases();
  const { data: globalInquiries = [] } = useGlobalInquiries();
  // Map subject_style, defaulting to 'hybrid' for 'mixed' or unknown values
  const subjectStyle = (masterTemplate?.subject_style === 'formal' || masterTemplate?.subject_style === 'casual') 
    ? masterTemplate.subject_style 
    : 'hybrid';
  const { data: subjectLibrary = [] } = useSubjectLibrary(subjectStyle);
  
  // Rotation tracking mutations
  const logPhrase = useLogPhraseUsage();
  const logInquiry = useLogInquiryUsage();

  // Validation - more robust checks
  const canGenerate = contactData && 
    contactData.email && 
    contactData.focus_areas && 
    contactData.focus_areas.length > 0 &&
    masterTemplate;
  
  const hasWarning = deltaType === 'Meeting' && 
    (!contactData?.assistant_emails || contactData.assistant_emails.length === 0);

  const handleGenerateDraft = async () => {
    if (!contactData || !canGenerate || !masterTemplate) return;

    setDraftResult(null);
    setIsGenerating(true);

    try {
      // Get master template defaults
      const masterDefaults = masterTemplates?.find(mt => mt.master_key === masterTemplate.master_key);
      if (!masterDefaults) {
        throw new Error('Master template defaults not found');
      }

      // Build module configuration with tri-state logic and rotation
      const moduleConfig = await buildModuleConfiguration({
        contact: contactData,
        masterTemplate: masterDefaults,
        allPhrases: globalPhrases,
        allInquiries: globalInquiries,
        selectedArticle: selectedArticle?.article_link || null,
      });

      // Check quality control
      if (!moduleConfig.qualityCheck.pass) {
        toast({
          title: "Quality Check Failed",
          description: moduleConfig.qualityCheck.reason,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Select subject from library
      const selectedSubject = selectSubject(subjectLibrary, contactData.focus_areas);

      // Log phrase and inquiry usage for rotation tracking
      if (moduleConfig.inquiry) {
        await logInquiry.mutateAsync({
          contactId: contactData.contact_id,
          inquiryId: moduleConfig.inquiry.id,
          category: moduleConfig.inquiry.category,
        });
      }

      for (const [category, phrase] of Object.entries(moduleConfig.phrases)) {
        if (phrase) {
          await logPhrase.mutateAsync({
            contactId: contactData.contact_id,
            phraseId: phrase.id,
            category,
          });
        }
      }

      // Build payload with library-selected content and convert modules to ModuleStates
      const enhancedModuleStates: ModuleStates = {
        initial_greeting: moduleConfig.modules.initial_greeting ?? false,
        self_personalization: moduleConfig.modules.self_personalization ?? false,
        top_opportunities: moduleConfig.modules.top_opportunities ?? false,
        article_recommendations: moduleConfig.modules.article_recommendations ?? false,
        suggested_talking_points: moduleConfig.modules.suggested_talking_points ?? false,
        platforms: moduleConfig.modules.platforms ?? false,
        addons: moduleConfig.modules.addons ?? false,
        general_org_update: moduleConfig.modules.general_org_update ?? false,
        attachments: moduleConfig.modules.attachments ?? false,
        meeting_request: moduleConfig.modules.meeting_request ?? false,
        ai_backup_personalization: moduleConfig.modules.ai_backup_personalization ?? false,
      };

      const payload = buildDraftPayload(contactData, {
        deltaType,
        moduleStates: enhancedModuleStates,
        selectedArticle,
        masterTemplate,
      });

      // Enhance payload with library selections
      const enhancedPayload = {
        ...payload,
        helpers: {
          ...payload.helpers,
          subjectComputed: selectedSubject,
          inquiryLine: moduleConfig.inquiry?.inquiry_text || null,
          selectedPhrases: Object.fromEntries(
            Object.entries(moduleConfig.phrases)
              .filter(([_, phrase]) => phrase !== null)
              .map(([key, phrase]) => [key, phrase?.phrase_text])
          ),
        },
      };

      console.log('Sending enhanced draft payload to n8n:', enhancedPayload);

      // POST to n8n webhook
      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Email-Builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Received draft from n8n:', result);

      setDraftResult(result as DraftBuilderResult);

      toast({
        title: "Draft Generated Successfully",
        description: result.send
          ? "Email draft is ready to send"
          : result.skip_reason || "Draft generated but marked as do not send",
      });
    } catch (error) {
      console.error('Draft generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate draft",
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