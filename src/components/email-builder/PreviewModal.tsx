import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmailTemplate } from "@/hooks/useEmailTemplates";
import { useResolvedTemplate, ResolveTemplateInput } from "@/hooks/useResolvedTemplate";
import { Loader2 } from "lucide-react";

interface PreviewModalProps {
  template: EmailTemplate | null;
  contactId: string | null;
  focusAreas: string[];
  hasOpps: boolean;
  lagDays: number;
  open: boolean;
  onClose: () => void;
}

export function PreviewModal({ template, contactId, focusAreas, hasOpps, lagDays, open, onClose }: PreviewModalProps) {
  const [previewContent, setPreviewContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resolveTemplateMutation = useResolvedTemplate();

  const generatePreview = async () => {
    if (!template || !contactId) return;
    
    setIsLoading(true);
    
    try {
      const resolveInput: ResolveTemplateInput = {
        template_id: template.id,
        contact_id: contactId,
        faList: focusAreas,
        hasOpps,
        lagDays
      };

      const resolved = await resolveTemplateMutation.mutateAsync(resolveInput);
      
      // Format resolved template into preview text
      const moduleContent: string[] = [];
      
      if (resolved.included_modules.includes('Top Opportunities') && hasOpps) {
        moduleContent.push('• Current opportunities that might align with your portfolio');
      }
      
      if (resolved.included_modules.includes('Article Recommendations')) {
        moduleContent.push('• Recent industry insights and market updates');
      }
      
      if (resolved.included_modules.includes('Platforms') || resolved.included_modules.includes('Add-ons')) {
        moduleContent.push('• Platform and add-on opportunities in your focus areas');
      }
      
      if (resolved.included_modules.includes('Suggested Talking Points')) {
        moduleContent.push('• Key discussion points for our next conversation');
      }
      
      if (resolved.included_modules.includes('General Org Update')) {
        moduleContent.push('• Updates from our team and recent activities');
      }

      const preview = `
Subject: ${resolved.chosen_subject}

Dear [Contact Name],

${resolved.chosen_greeting}

${moduleContent.join('\n')}

${resolved.fa_defaults.map(fa => `${fa.focus_area_label}: ${fa.text_value}`).join('\n')}

${resolved.chosen_meeting_req}

Best regards,
[LG Team Member]

---
Template Configuration:
• Tone: ${resolved.tone}
• Length: ${resolved.length}
• Modules: ${resolved.included_modules.join(', ')}
• Lag-based adjustments applied (${lagDays} days)
      `.trim();
      
      setPreviewContent(preview);
    } catch (error) {
      console.error('Preview failed:', error);
      setPreviewContent(`Preview generation failed. Please try again.\n\nError: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && template && contactId) {
      generatePreview();
    }
  }, [open, template, contactId, focusAreas, hasOpps, lagDays]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Resolved template configuration with deterministic phrase selection
            </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Lag: {lagDays} days | Focus Areas: {focusAreas.join(', ')} | Has Opps: {hasOpps ? 'Yes' : 'No'}
            </p>
            <Button onClick={generatePreview} disabled={isLoading || !contactId} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resolve Template
            </Button>
          </div>
          
          <Textarea
            value={previewContent}
            readOnly
            className="min-h-[400px] font-mono text-sm"
            placeholder={isLoading ? "Resolving template..." : "Select a contact and template to see resolved configuration"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}