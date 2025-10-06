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
import { useSubjectLibrary, pickSubject } from "@/hooks/useSubjectLibrary";
import { useLogPhraseUsage, useLogInquiryUsage } from "@/hooks/useRotationTracking";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";
import { logInquiryUse } from "@/hooks/useInquiryLibrary";
import { DebugResolvedLibraries, type DebugData } from "./DebugResolvedLibraries";
import { logger } from "@/lib/logger";

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
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [sessionRotationCounts, setSessionRotationCounts] = useState({ phrases: 0, inquiries: 0 });
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
    if (!contactData || !canGenerate || !masterTemplate) {
      logger.error('❌ Cannot generate - missing required data:', { 
        hasContactData: !!contactData,
        canGenerate,
        hasMasterTemplate: !!masterTemplate 
      });
      return;
    }

    logger.log('🚀 Starting draft generation for:', contactData.email);
    logger.log('📊 Contact data structure:', {
      contact_id: contactData.contact_id,
      email: contactData.email,
      first_name: contactData.first_name,
      focus_areas: contactData.focus_areas,
      has_opps: contactData.has_opps,
      opps_count: contactData.opps?.length || 0,
      articles_count: contactData.articles?.length || 0,
    });

    setDraftResult(null);
    setIsGenerating(true);

    try {
      // Get master template defaults
      const masterDefaults = masterTemplates?.find(mt => mt.master_key === masterTemplate.master_key);
      if (!masterDefaults) {
        throw new Error('Master template defaults not found for: ' + masterTemplate.master_key);
      }

      logger.log('✅ Master template defaults found:', masterDefaults.master_key);

      // Calculate days since most recent contact
      const daysSinceContact = contactData.most_recent_contact 
        ? Math.floor((Date.now() - new Date(contactData.most_recent_contact).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Build module configuration with tri-state logic and rotation
      logger.log('🔧 Building module configuration...');
      const moduleConfig = await buildModuleConfiguration({
        contact: contactData,
        masterTemplate: masterDefaults,
        allPhrases: globalPhrases,
        allInquiries: globalInquiries,
        selectedArticle: selectedArticle?.article_link || null,
        daysSinceContact,
      });

      logger.log('✅ Module config built:', {
        modules: Object.keys(moduleConfig.modules).filter(k => moduleConfig.modules[k as keyof typeof moduleConfig.modules]),
        hasInquiry: !!moduleConfig.inquiry,
        hasSignature: !!moduleConfig.signature,
      });

      // Check quality control
      if (!moduleConfig.qualityCheck.pass) {
        logger.warn('⚠️ Quality check failed:', moduleConfig.qualityCheck.reason);
        toast({
          title: "Quality Check Failed",
          description: moduleConfig.qualityCheck.reason,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      logger.log('✅ Quality check passed');

      // Select subject from library with token replacement
      logger.log('📧 Selecting subject from library...');
      const selectedSubject = await pickSubject({
        tone: subjectStyle,
        org: contactData.organization || '',
        focusAreas: contactData.focus_areas,
        sector: contactData.fa_descriptions[0]?.sector,
        subjects: subjectLibrary,
      });

      logger.log('✅ Subject selected:', selectedSubject);

      // Log phrase and inquiry usage for rotation tracking (non-blocking)
      if (moduleConfig.inquiry) {
        try {
          await logInquiryUse({
            contactId: contactData.contact_id,
            inquiryId: moduleConfig.inquiry.id,
          });
        } catch (e) {
          logger.warn('Non-blocking: failed to log inquiry usage', e);
        }
      }

      for (const [category, phrase] of Object.entries(moduleConfig.phrases)) {
        if (phrase) {
          try {
            await logPhrase.mutateAsync({
              contactId: contactData.contact_id,
              phraseId: phrase.id,
              category,
            });
          } catch (e) {
            logger.warn('Non-blocking: failed to log phrase usage', category, e);
          }
        }
      }

      // Build payload with library-selected content
      // Convert Record<string, boolean> to specific module object type
      const evaluatedModules = {
        initial_greeting: moduleConfig.modules.initial_greeting ?? false,
        self_personalization: moduleConfig.modules.self_personalization ?? false,
        top_opportunities: moduleConfig.modules.top_opportunities ?? false,
        article_recommendations: moduleConfig.modules.article_recommendations ?? false,
        platforms: moduleConfig.modules.platforms ?? false,
        addons: moduleConfig.modules.addons ?? false,
        suggested_talking_points: moduleConfig.modules.suggested_talking_points ?? false,
        general_org_update: moduleConfig.modules.general_org_update ?? false,
        attachments: moduleConfig.modules.attachments ?? false,
        meeting_request: moduleConfig.modules.meeting_request ?? false,
        ai_backup_personalization: moduleConfig.modules.ai_backup_personalization ?? false,
      };

      const payload = buildDraftPayload(contactData, {
        deltaType,
        moduleStates: evaluatedModules,
        selectedArticle,
        masterTemplate,
      });

      // Enhance payload with RESOLVED library selections
      const enhancedPayload = {
        ...payload,
        helpers: {
          ...payload.helpers,
          selectedSubject,
          selectedInquiry: moduleConfig.inquiry 
            ? {
                text: moduleConfig.inquiry.inquiry_text,
                category: moduleConfig.inquiry.category,
              }
            : null,
          assistantClause: moduleConfig.assistantClause,
          selectedSignature: moduleConfig.signature,
          selectedPhrases: Object.fromEntries(
            Object.entries(moduleConfig.phrases)
              .filter(([_, phrase]) => phrase !== null)
              .map(([key, phrase]) => [key, phrase?.phrase_text])
          ),
        },
      };

      logger.log('🌐 Sending payload to n8n webhook...');
      logger.log('📦 Enhanced payload:', JSON.stringify(enhancedPayload, null, 2));

      // POST to n8n webhook
      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Email-Builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedPayload),
      });

      logger.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ n8n webhook error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      logger.log('✅ Received draft from n8n:', result);

      setDraftResult(result as DraftBuilderResult);

      // Update rotation counts
      const phraseCount = Object.values(moduleConfig.phrases).filter(p => p !== null).length;
      const inquiryCount = moduleConfig.inquiry ? 1 : 0;
      setSessionRotationCounts(prev => ({
        phrases: prev.phrases + phraseCount,
        inquiries: prev.inquiries + inquiryCount,
      }));

      // Build debug data
      const masterDefForDebug = masterTemplates?.find(mt => mt.master_key === masterTemplate.master_key);
      const triStateSnapshot: Record<string, { decision: boolean; rule: 'always' | 'sometimes' | 'never' }> = {};
      
      for (const [module, enabled] of Object.entries(moduleConfig.modules)) {
        const masterSetting = masterDefForDebug?.[module as keyof typeof masterDefForDebug];
        const rule = ['always', 'sometimes', 'never'].includes(masterSetting as string) 
          ? (masterSetting as 'always' | 'sometimes' | 'never')
          : 'never';
        triStateSnapshot[module] = { decision: enabled, rule };
      }

      setDebugData({
        resolvedLibraries: {
          selectedSubject: selectedSubject 
            ? { text: selectedSubject, tone: subjectStyle }
            : null,
          selectedInquiry: moduleConfig.inquiry 
            ? { 
                text: moduleConfig.inquiry.inquiry_text, 
                category: moduleConfig.inquiry.category 
              }
            : null,
          selectedSignature: moduleConfig.signature 
            ? { text: moduleConfig.signature, tone: 'professional' }
            : null,
          assistantClause: moduleConfig.assistantClause,
        },
        triStateSnapshot,
        rotationWrites: {
          phrases: sessionRotationCounts.phrases + phraseCount,
          inquiries: sessionRotationCounts.inquiries + inquiryCount,
        },
        payloadPreview: enhancedPayload,
      });

      toast({
        title: "Draft Generated Successfully",
        description: result.send
          ? "Email draft is ready to send"
          : result.skip_reason || "Draft generated but marked as do not send",
      });
    } catch (error) {
      logger.error('❌ Draft generation error:', error);
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
      logger.error('Failed to copy to clipboard:', err);
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

        {/* Debug Panel */}
        {draftResult && (
          <>
            <Separator className="my-6" />
            <DebugResolvedLibraries debugData={debugData} />
          </>
        )}
      </CardContent>
    </Card>
  );
}