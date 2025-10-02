import { useState, useEffect } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { useRealtimeLibrarySync } from "@/hooks/useRealtimeSync";
import { ContactSelector } from "@/components/email-builder/ContactSelector";
import { ContactInfoPanel } from "@/components/email-builder/ContactInfoPanel";
import { MasterTemplateSelector } from "@/components/email-builder/MasterTemplateSelector";
import { EmailBuilderCoreSettings } from "@/components/email-builder/EmailBuilderCoreSettings";
import { ModulesCard, type ModuleStates, MODULE_DEFAULTS, getModuleDefaultsFromMaster } from "@/components/email-builder/ModulesCard";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";
import { ArticlePicker } from "@/components/email-builder/ArticlePicker";
import { CCPreviewCard } from "@/components/email-builder/CCPreviewCard";
import { EnhancedDraftSection } from "@/components/email-builder/EnhancedDraftSection";
import { PreviewModal } from "@/components/email-builder/PreviewModal";
import { LivePreviewPanel } from "@/components/email-builder/LivePreviewPanel";
import { GroupContactAlert } from "@/components/email-builder/GroupContactAlert";
import { IndividualContactAlert } from "@/components/email-builder/IndividualContactAlert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Save, RotateCcw } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useContactGroupInfo } from "@/hooks/useContactGroupInfo";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import { useComposerRow } from "@/hooks/useComposer";
import { useContactSettings } from "@/hooks/useContactSettings";
import { useAutoPreview } from "@/hooks/useAutoPreview";
import { useEnhancedDraftGenerator } from "@/hooks/useEnhancedDraftGenerator";
import { useGlobalPhrases } from "@/hooks/usePhraseLibrary";
import { useGlobalInquiries } from "@/hooks/useInquiryLibrary";
import { useSubjectLibrary } from "@/hooks/useSubjectLibrary";
import { buildEnhancedDraftPayload } from "@/lib/enhancedPayload";
import { routeMaster } from "@/lib/router";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";
import type { Article } from "@/types/emailComposer";
import type { TriState } from "@/types/phraseLibrary";
import { useToast } from "@/hooks/use-toast";

export function EmailBuilder() {
  // Enable real-time synchronization with Global Libraries
  useRealtimeLibrarySync();
  
  const { toast } = useToast();
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [deltaType, setDeltaType] = useState<'Email' | 'Meeting'>('Email');
  const [showPreview, setShowPreview] = useState(false);
  
  // Core Settings state
  const [daysSinceContact, setDaysSinceContact] = useState<number>(0);
  const [toneOverride, setToneOverride] = useState<'casual' | 'hybrid' | 'formal' | null>(null);
  const [lengthOverride, setLengthOverride] = useState<'brief' | 'medium' | 'detailed' | null>(null);
  const [subjectPoolOverride, setSubjectPoolOverride] = useState<string[]>([]);
  
  // Module states for email builder
  const [moduleStates, setModuleStates] = useState<ModuleStates>({
    initial_greeting: 'always',
    self_personalization: 'always',
    top_opportunities: 'always',
    article_recommendations: 'always',
    platforms: 'never',
    addons: 'never',
    suggested_talking_points: 'sometimes',
    general_org_update: 'never',
    attachments: 'never',
    meeting_request: 'always',
    ai_backup_personalization: 'always',
  });
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Get contact data from new composer view
  const { data: contactData } = useComposerRow(selectedContact?.email || null);
  
  // Get group contact info from contacts_raw
  const { data: groupInfo } = useContactGroupInfo(selectedContact?.contact_id || null);
  
  // Load library data
  const { data: allPhrases = [] } = useGlobalPhrases();
  const { data: allInquiries = [] } = useGlobalInquiries();
  const { data: allSubjects = [] } = useSubjectLibrary();
  
  // Enhanced draft generator
  const {
    generateDraft,
    isGenerating,
    progress,
    streamedContent,
  } = useEnhancedDraftGenerator();
  
  const [draftResult, setDraftResult] = useState<any | null>(null);
  
  // Auto-set days since contact when contact changes
  useEffect(() => {
    if (contactData?.most_recent_contact) {
      const days = Math.floor(
        (Date.now() - new Date(contactData.most_recent_contact).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysSinceContact(days);
    }
  }, [contactData?.most_recent_contact]);
  
  // Auto-set module defaults when master template changes
  const masterTemplate = contactData ? routeMaster(contactData.most_recent_contact) : null;
  
  // Load and save contact-specific settings
  const {
    settings: contactSettings,
    isLoading: isLoadingSettings,
    saveSettings,
    isSaving,
    resetSettings,
    isResetting,
  } = useContactSettings(selectedContact?.contact_id || null);

  // Load master templates from database
  const { data: masterTemplates } = useMasterTemplates();
  
  // Auto-load saved settings when contact changes
  useEffect(() => {
    if (contactSettings) {
      setModuleStates(contactSettings.module_states as ModuleStates);
      setDeltaType(contactSettings.delta_type);
      if (contactSettings.selected_article_id) {
        // Could load article here if needed
      }
    } else if (masterTemplate && masterTemplates) {
      // Load defaults from database-driven master template
      const defaults = getModuleDefaultsFromMaster(masterTemplate.master_key, masterTemplates);
      if (defaults) {
        setModuleStates(defaults);
      } else {
        // Fallback to hardcoded defaults
        const fallback = MODULE_DEFAULTS[masterTemplate.master_key];
        if (fallback) {
          setModuleStates(fallback);
        }
      }
    }
  }, [contactSettings, masterTemplate, masterTemplates, selectedContact]);

  // Auto-preview hook
  const { previewData, isGenerating: isAutoGenerating } = useAutoPreview(
    contactData,
    deltaType,
    moduleStates,
    selectedArticle,
    masterTemplate
  );
  
  const handleModuleChange = (module: keyof ModuleStates, value: TriState) => {
    setModuleStates(prev => ({ ...prev, [module]: value }));
  };
  
  const handleResetToDefaults = () => {
    if (masterTemplate && masterTemplates) {
      // Load defaults from database-driven master template
      const defaults = getModuleDefaultsFromMaster(masterTemplate.master_key, masterTemplates);
      if (defaults) {
        setModuleStates(defaults);
      } else {
        // Fallback to hardcoded defaults
        const fallback = MODULE_DEFAULTS[masterTemplate.master_key];
        if (fallback) {
          setModuleStates(fallback);
        }
      }
    }
  };

  const handleSaveSettings = () => {
    if (!selectedContact?.contact_id) return;
    
    saveSettings({
      contactId: selectedContact.contact_id,
      moduleStates,
      deltaType,
      selectedArticleId: selectedArticle?.article_link,
    });
  };

  const handleResetSettings = () => {
    if (!selectedContact?.contact_id) return;
    
    resetSettings(selectedContact.contact_id);
    // Reset to template defaults
    handleResetToDefaults();
  };

  // Enhanced draft generation handler
  const handleGenerateDraft = async () => {
    if (!contactData || !masterTemplate) {
      toast({
        title: 'Missing Data',
        description: 'Please select a contact first',
        variant: 'destructive',
      });
      return;
    }

    // Get full master template from database
    const fullMasterTemplate = masterTemplates?.find(
      t => t.master_key === masterTemplate.master_key
    );
    
    if (!fullMasterTemplate) {
      toast({
        title: 'Template Not Found',
        description: 'Master template not found in database',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Build enhanced payload
      const payload = await buildEnhancedDraftPayload(
        contactData,
        fullMasterTemplate,
        allPhrases,
        allInquiries,
        allSubjects,
        daysSinceContact,
        selectedArticle?.article_link,
        toneOverride || undefined,
        subjectPoolOverride
      );

      // Generate draft
      const result = await generateDraft(payload);
      
      if (result) {
        setDraftResult(result);
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = () => {
    if (!draftResult) return;

    const fullEmail = `Subject: ${draftResult.subject}

${draftResult.greeting},

${draftResult.body}

${draftResult.signature}`;

    navigator.clipboard.writeText(fullEmail);
    toast({
      title: 'Copied!',
      description: 'Email draft copied to clipboard',
    });
  };
  
  // Legacy support - remove when fully migrated
  const { contact, lag, opportunities, payload, isLoading } = useEmailBuilderData(selectedContact?.contact_id || null, null);

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Email Builder</h1>
            <p className="text-muted-foreground">Generate personalized email drafts with AI</p>
          </div>
        </div>

        {/* Alert Section - Show Group Alert if in group, otherwise Individual Alert */}
        {groupInfo?.group_contact ? (
          <GroupContactAlert
            groupName={groupInfo.group_contact}
            contactFullName={contactData?.full_name || groupInfo.full_name}
            groupLastContactDate={groupInfo.most_recent_group_contact || null}
            deltaDays={groupInfo.delta || 30}
          />
        ) : (
          selectedContact && contactData?.most_recent_contact && (
            <IndividualContactAlert
              contactFullName={contactData.full_name}
              lastContactDate={contactData.most_recent_contact}
              deltaType={deltaType}
            />
          )
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Left Column - Contact Selection & Info */}
          <div className="flex flex-col gap-6">
            <ContactSelector
              selectedContact={selectedContact}
              onContactSelect={setSelectedContact}
            />
            {selectedContact && (
              <ContactInfoPanel contactId={selectedContact.contact_id} />
            )}

            {/* Live Preview Section */}
            {selectedContact && (
              <LivePreviewPanel
                isGenerating={isAutoGenerating}
                subject={previewData?.subject}
                inquiry={previewData?.inquiry}
                assistantClause={previewData?.assistantClause}
                bodyPreview={previewData?.bodyPreview}
              />
            )}
          </div>

          {/* Right Column - Template, Preview & Generation */}
          <div className="flex flex-col gap-6">
            <MasterTemplateSelector
              selectedContactId={selectedContact?.contact_id || null}
              selectedContactEmail={selectedContact?.email || null}
              deltaType={deltaType}
              onDeltaTypeChange={setDeltaType}
            />
            
            <EmailBuilderCoreSettings
              daysSinceContact={daysSinceContact}
              onDaysSinceContactChange={setDaysSinceContact}
              toneOverride={toneOverride}
              onToneOverrideChange={setToneOverride}
              lengthOverride={lengthOverride}
              onLengthOverrideChange={setLengthOverride}
              subjectPoolOverride={subjectPoolOverride}
              onSubjectPoolOverrideChange={setSubjectPoolOverride}
            />
            
            <ModulesCard
              masterTemplate={masterTemplate}
              moduleStates={moduleStates}
              onModuleChange={handleModuleChange}
              onResetToDefaults={handleResetToDefaults}
            />
            
            <ArticlePicker
              contactData={contactData}
              selectedArticle={selectedArticle}
              onArticleSelect={setSelectedArticle}
            />
            
            <CCPreviewCard
              contactData={contactData}
              deltaType={deltaType}
            />

            {/* Settings Controls */}
            {selectedContact && (
              <div className="flex items-center gap-2 flex-wrap">
                {contactSettings && (
                  <Badge variant="secondary" className="gap-1">
                    <Save className="h-3 w-3" />
                    Custom Settings
                  </Badge>
                )}
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving || !selectedContact}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
                {contactSettings && (
                  <Button
                    onClick={handleResetSettings}
                    disabled={isResetting}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                )}
              </div>
            )}
            
            {/* Enhanced Draft Section - replaces old DraftGenerateButton */}
            {selectedContact && contactData && masterTemplate && (
              <EnhancedDraftSection
                isGenerating={isGenerating}
                progress={progress}
                streamedContent={streamedContent}
                result={draftResult}
                onGenerate={handleGenerateDraft}
                onCopyToClipboard={handleCopyToClipboard}
                disabled={!contactData}
              />
            )}
          </div>
        </div>
      </ResponsiveContainer>

      <PreviewModal 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={null}
        contactId={selectedContact?.contact_id || null}
        focusAreas={contactData?.focus_areas || []}
        hasOpps={contactData?.has_opps || false}
        lagDays={0}
      />
    </div>
  );
}