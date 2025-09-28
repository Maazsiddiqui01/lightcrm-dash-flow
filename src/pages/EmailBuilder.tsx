import { useState } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { ContactSelector } from "@/components/email-builder/ContactSelector";
import { ContactInfoPanel } from "@/components/email-builder/ContactInfoPanel";
import { TemplateSwitcher } from "@/components/email-builder/TemplateSwitcher";
import { GenerateDraftButton } from "@/components/email-builder/GenerateDraftButton";
import { DraftPreviewPanel } from "@/components/email-builder/DraftPreviewPanel";
import { PreviewModal } from "@/components/email-builder/PreviewModal";
import { Button } from "@/components/ui/button";
import { Mail, Eye } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";

export function EmailBuilder() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const { contact, lag, opportunities, payload, isLoading } = useEmailBuilderData(selectedContactId, selectedTemplate);
  
  // Get resolved template data when we have template and contact
  const resolvedInput = selectedTemplate && selectedContactId && contact ? {
    template_id: selectedTemplate.id,
    contact_id: selectedContactId,
    faList: contact.lg_focus_areas_comprehensive_list?.split(',').map(fa => fa.trim()).filter(fa => fa) || [],
    hasOpps: (contact.all_opps || 0) > 0,
    lagDays: lag?.lag_days || 0
  } : null;
  
  const { data: resolved, isLoading: isResolvingTemplate } = useResolvedTemplateQuery(resolvedInput);

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
              selectedContactId={selectedContactId}
              onContactSelect={setSelectedContactId}
            />
            {selectedContactId && (
              <ContactInfoPanel contactId={selectedContactId} />
            )}
          </div>

          {/* Right Column - Template, Preview & Generation */}
          <div className="flex flex-col gap-6">
            <TemplateSwitcher
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
            />
            
            <div className="flex flex-col gap-4">
              {selectedContactId && selectedTemplate && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(true)}
                  disabled={isLoading || isResolvingTemplate}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Template Config
                </Button>
              )}
            </div>
            
            <DraftPreviewPanel 
              contact={contact}
              resolved={resolved}
              payload={payload}
              template={selectedTemplate}
              isLoading={isLoading || isResolvingTemplate}
            />
          </div>
        </div>
      </ResponsiveContainer>

      <PreviewModal 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={selectedTemplate}
        contactId={selectedContactId}
        focusAreas={contact?.lg_focus_areas_comprehensive_list?.split(',').map(fa => fa.trim()).filter(fa => fa) || []}
        hasOpps={(contact?.all_opps || 0) > 0}
        lagDays={lag?.lag_days || 0}
      />
    </div>
  );
}