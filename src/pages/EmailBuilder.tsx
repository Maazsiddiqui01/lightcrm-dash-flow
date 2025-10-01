import { useState } from "react";
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
import { Mail } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import { useComposerRow } from "@/hooks/useComposer";
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