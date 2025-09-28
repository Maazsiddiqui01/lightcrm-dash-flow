import { useState, useEffect } from "react";
import { EmailTemplate, useCreateTemplateMutation, useUpdateTemplateMutation } from "@/hooks/useEmailTemplates";
import { useTemplateSettings, useUpdateTemplateSettings, usePhraseLibrary, useUpdatePhraseLibrary, TemplateSettings, PhraseLibraryItem } from "@/hooks/useTemplateSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoreSettingsPanel } from "./template-editor/CoreSettingsPanel";
import { ModulesPanel } from "./template-editor/ModulesPanel";
import { PhraseLibraryPanel } from "./template-editor/PhraseLibraryPanel";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateEditorModalProps {
  open: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  onSaved?: (template: EmailTemplate) => void;
}

export function TemplateEditorModal({ open, onClose, template, onSaved }: TemplateEditorModalProps) {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({});
  const [settings, setSettings] = useState<TemplateSettings | null>(null);
  const [phrases, setPhrases] = useState<PhraseLibraryItem[]>([]);
  const [isValid, setIsValid] = useState(false);

  const { toast } = useToast();
  const isEditing = template && template.id !== 'new';
  
  const { data: existingSettings } = useTemplateSettings(isEditing ? template.id : null);
  const { data: existingPhrases } = usePhraseLibrary(isEditing ? template.id : null);
  
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();
  const updateSettingsMutation = useUpdateTemplateSettings();
  const updatePhrasesMutation = useUpdatePhraseLibrary();

  // Initialize form data
  useEffect(() => {
    if (template) {
      setFormData({
        id: template.id,
        name: template.name || '',
        description: template.description || '',
        is_preset: template.is_preset || false,
        gb_present: template.gb_present || false,
        fa_bucket: template.fa_bucket || 1,
        has_opps: template.has_opps || false,
        delta_type: template.delta_type || 'Email',
        subject_mode: template.subject_mode || 'lg_first',
        hs_present: template.hs_present || false,
        ls_present: template.ls_present || false,
        max_opps: template.max_opps || 3,
        custom_instructions: template.custom_instructions || '',
        custom_insertion: template.custom_insertion || 'before_closing',
      });
    }
  }, [template]);

  // Initialize settings
  useEffect(() => {
    if (existingSettings) {
      setSettings(existingSettings);
    } else if (template && !isEditing) {
      // Default settings for new template
      setSettings({
        template_id: template.id,
        core_overrides: {
          maxLagDays: 30,
          tone: 'auto',
          length: 'auto',
          subjectPools: ['formal'],
          meetingRequest: 'Sometimes'
        },
        modules: {
          order: [
            'Top Opportunities',
            'Article Recommendations', 
            'Platforms',
            'Add-ons',
            'Suggested Talking Points',
            'General Org Update',
            'Attachments'
          ],
          triState: {
            'Top Opportunities': 'Sometimes',
            'Article Recommendations': 'Sometimes',
            'Platforms': 'Never',
            'Add-ons': 'Never',
            'Suggested Talking Points': 'Sometimes',
            'General Org Update': 'Sometimes',
            'Attachments': 'Never'
          }
        },
        personalization: {},
        sometimes_weights: {}
      });
    }
  }, [existingSettings, template, isEditing]);

  // Initialize phrases
  useEffect(() => {
    if (existingPhrases) {
      setPhrases(existingPhrases);
    } else if (template && !isEditing) {
      // Default phrases for new template
      setPhrases([
        {
          id: 'new-1',
          template_id: template.id,
          scope: 'subject_formal',
          text_value: 'Following up on our conversation',
          tri_state: 'Always',
          weight: 1,
          active: true
        }
      ]);
    }
  }, [existingPhrases, template, isEditing]);

  // Validation
  useEffect(() => {
    const hasName = formData.name && formData.name.trim().length > 0;
    const hasSubjectPhrases = phrases.some(p => p.scope.startsWith('subject_') && p.active);
    setIsValid(hasName && hasSubjectPhrases);
  }, [formData.name, phrases]);

  const handleSave = async () => {
    if (!isValid || !settings) return;

    try {
      let templateId: string;

      if (isEditing) {
        // Update existing template
        const updatedTemplate = await updateMutation.mutateAsync({
          id: template.id,
          ...formData
        } as EmailTemplate);
        templateId = updatedTemplate.id;
        onSaved?.(updatedTemplate);
      } else {
        // Create new template
        const newTemplate = await createMutation.mutateAsync(formData as Omit<EmailTemplate, 'id'>);
        templateId = newTemplate.id;
        onSaved?.(newTemplate);
      }

      // Update settings
      const updatedSettings = { ...settings, template_id: templateId };
      await updateSettingsMutation.mutateAsync(updatedSettings);

      // Update phrases
      const updatedPhrases = phrases.map(p => ({ ...p, template_id: templateId }));
      await updatePhrasesMutation.mutateAsync({ templateId, phrases: updatedPhrases });

      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  if (!template || !settings) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditing ? 'Edit Template' : 'New Template'}</span>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!isValid || createMutation.isPending || updateMutation.isPending}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left Column - Basic Info & Core Settings */}
          <div className="space-y-6 overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                  className={!formData.name?.trim() ? "border-destructive" : ""}
                />
                {!formData.name?.trim() && (
                  <p className="text-sm text-destructive mt-1">Template name is required</p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when to use this template"
                  rows={3}
                />
              </div>
            </div>

            {/* Core Settings */}
            <CoreSettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
            />

            {/* Modules */}
            <ModulesPanel
              settings={settings}
              onSettingsChange={setSettings}
            />
          </div>

          {/* Right Column - Phrase Libraries */}
          <div className="overflow-hidden">
            <PhraseLibraryPanel
              phrases={phrases}
              onPhrasesChange={setPhrases}
              templateId={template.id}
            />
          </div>
        </div>

        {/* Validation Summary */}
        {!isValid && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              Please fix the following issues before saving:
            </p>
            <ul className="text-sm text-destructive mt-1 list-disc list-inside">
              {!formData.name?.trim() && <li>Template name is required</li>}
              {!phrases.some(p => p.scope.startsWith('subject_') && p.active) && (
                <li>At least one active subject phrase is required</li>
              )}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}