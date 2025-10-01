import { useState, useEffect } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { useRealtimeLibrarySync } from "@/hooks/useRealtimeSync";
import { ContactSelector } from "@/components/email-builder/ContactSelector";
import { ContactInfoPanel } from "@/components/email-builder/ContactInfoPanel";
import { MasterTemplateSelector } from "@/components/email-builder/MasterTemplateSelector";
import { ModulesCard, type ModuleStates, MODULE_DEFAULTS } from "@/components/email-builder/ModulesCard";
import { ArticlePicker } from "@/components/email-builder/ArticlePicker";
import { CCPreviewCard } from "@/components/email-builder/CCPreviewCard";
import { DraftGenerateButton } from "@/components/email-builder/DraftGenerateButton";
import { PreviewModal } from "@/components/email-builder/PreviewModal";
import { LivePreviewPanel } from "@/components/email-builder/LivePreviewPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Save, RotateCcw } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import { useComposerRow } from "@/hooks/useComposer";
import { useContactSettings } from "@/hooks/useContactSettings";
import { useAutoPreview } from "@/hooks/useAutoPreview";
import { routeMaster } from "@/lib/router";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";
import type { Article } from "@/types/emailComposer";
import type { TriState } from "@/types/phraseLibrary";

export function EmailBuilder() {
  // Enable real-time synchronization with Global Libraries
  useRealtimeLibrarySync();
  
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [deltaType, setDeltaType] = useState<'Email' | 'Meeting'>('Email');
  const [showPreview, setShowPreview] = useState(false);
  
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

  // Auto-load saved settings when contact changes
  useEffect(() => {
    if (contactSettings) {
      setModuleStates(contactSettings.module_states as ModuleStates);
      setDeltaType(contactSettings.delta_type);
      if (contactSettings.selected_article_id) {
        // Could load article here if needed
      }
    } else if (masterTemplate) {
      // Fallback to master template defaults
      const defaults = MODULE_DEFAULTS[masterTemplate.master_key];
      if (defaults) {
        setModuleStates(defaults);
      }
    }
  }, [contactSettings, masterTemplate, selectedContact]);

  // Auto-preview hook
  const { previewData, isGenerating } = useAutoPreview(
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
    if (masterTemplate) {
      const defaults = MODULE_DEFAULTS[masterTemplate.master_key];
      if (defaults) {
        setModuleStates(defaults);
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
                isGenerating={isGenerating}
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
            
            <DraftGenerateButton 
              contactData={contactData}
              deltaType={deltaType}
              moduleStates={moduleStates}
              selectedArticle={selectedArticle}
              masterTemplate={masterTemplate}
            />
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