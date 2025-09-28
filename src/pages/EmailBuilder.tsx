import { useState } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { ContactSelector } from "@/components/email-builder/ContactSelector";
import { ContactInfoPanel } from "@/components/email-builder/ContactInfoPanel";
import { MasterTemplateSelector } from "@/components/email-builder/MasterTemplateSelector";
import { GenerateDraftButton } from "@/components/email-builder/GenerateDraftButton";
import { DraftPreviewPanel } from "@/components/email-builder/DraftPreviewPanel";
import { PreviewModal } from "@/components/email-builder/PreviewModal";
import { Button } from "@/components/ui/button";
import { Mail, Eye } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import { useComposerRow } from "@/hooks/useComposer";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";

export function EmailBuilder() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);
  const [deltaType, setDeltaType] = useState<'Email' | 'Meeting'>('Email');
  const [showPreview, setShowPreview] = useState(false);
  
  // Get contact data from new composer view
  const { data: contactData } = useComposerRow(selectedContactEmail);
  
  // Legacy support - remove when fully migrated
  const { contact, lag, opportunities, payload, isLoading } = useEmailBuilderData(selectedContactId, null);

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
              onContactSelect={(id) => {
                setSelectedContactId(id);
                // Get email from existing contact data for now
                if (contact?.email_address) {
                  setSelectedContactEmail(contact.email_address);
                }
              }}
            />
            {selectedContactId && (
              <ContactInfoPanel contactId={selectedContactId} />
            )}
          </div>

          {/* Right Column - Template, Preview & Generation */}
          <div className="flex flex-col gap-6">
            <MasterTemplateSelector
              selectedContactId={selectedContactId}
              selectedContactEmail={selectedContactEmail}
              deltaType={deltaType}
              onDeltaTypeChange={setDeltaType}
            />
            
            <DraftPreviewPanel 
              contact={contactData || contact}
              resolved={null}
              payload={payload}
              template={null}
              isLoading={isLoading}
            />
          </div>
        </div>
      </ResponsiveContainer>

      <PreviewModal 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={null}
        contactId={selectedContactId}
        focusAreas={contactData?.focus_areas || []}
        hasOpps={contactData?.has_opps || false}
        lagDays={0}
      />
    </div>
  );
}