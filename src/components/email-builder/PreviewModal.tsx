import { useState } from "react";
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
import { Loader2 } from "lucide-react";

interface PreviewModalProps {
  template: EmailTemplate | null;
  open: boolean;
  onClose: () => void;
}

export function PreviewModal({ template, open, onClose }: PreviewModalProps) {
  const [previewContent, setPreviewContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generatePreview = async () => {
    if (!template) return;
    
    setIsLoading(true);
    
    // Mock preview generation for now
    // TODO: Implement actual TemplatePreviewLLM call
    setTimeout(() => {
      const mockPreview = `
Subject: Following up on our conversation about ${template.name}

Dear [Contact Name],

I hope this email finds you well. Following up on our recent ${template.delta_type?.toLowerCase() === 'meeting' ? 'meeting' : 'email exchange'}, I wanted to share some relevant insights about opportunities in [Focus Area].

${template.has_opps ? '• Based on your portfolio, I see potential synergies with our current deals' : '• Looking forward to exploring potential collaboration opportunities'}
${template.gb_present ? '• Our General BD team has identified some exciting prospects' : ''}
${template.hs_present || template.ls_present ? '• Our specialized teams have insights that might be valuable' : ''}

${template.custom_instructions ? `Custom notes: ${template.custom_instructions}` : ''}

Best regards,
[LG Team Member]

---
This is a sample preview. Actual generation will use TemplatePreviewLLM.
Template: ${template.name}
Configuration: FA:${template.fa_bucket}, ${template.delta_type}, ${template.subject_mode}
      `.trim();
      
      setPreviewContent(mockPreview);
      setIsLoading(false);
    }, 1000);
  };

  const handleOpen = () => {
    if (template) {
      generatePreview();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogDescription>
            Sample email generated using "{template?.name}" template
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Using sample focus areas and contact data
            </p>
            <Button onClick={generatePreview} disabled={isLoading} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Regenerate Preview
            </Button>
          </div>
          
          <Textarea
            value={previewContent}
            readOnly
            className="min-h-[400px] font-mono text-sm"
            placeholder={isLoading ? "Generating preview..." : "Preview will appear here"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}