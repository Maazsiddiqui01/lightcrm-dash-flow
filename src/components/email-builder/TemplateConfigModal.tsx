import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { useCreateTemplate, useUpdateTemplate, type EmailTemplate } from "@/hooks/useEmailTemplates";
import { useTemplateSettings, useUpdateTemplateSettings } from "@/hooks/useTemplateSettings";
import { CoreSettingsPanel } from "./CoreSettingsPanel";
import { ModulesPanel } from "./ModulesPanel";
import { PersonalizationPanel } from "./PersonalizationPanel";
import { InquiryConfigPanel } from "./InquiryConfigPanel";
import { PhraseLibraryPanel } from "./PhraseLibraryPanel";
import { QualityRulesPanel } from "./QualityRulesPanel";

interface TemplateConfigModalProps {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: EmailTemplate) => void;
}

export function TemplateConfigModal({
  template,
  open,
  onOpenChange,
  onSave,
}: TemplateConfigModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [daysSinceContact, setDaysSinceContact] = useState(30);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const updateSettings = useUpdateTemplateSettings();
  
  const { data: settings, isLoading: settingsLoading } = useTemplateSettings(template?.id || null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [template]);

  const handleSave = async () => {
    const templateData = {
      name,
      description,
      is_preset: false,
    };

    if (template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        ...templateData,
      });
      if (settings) {
        await updateSettings.mutateAsync(settings);
      }
      onSave({ ...template, ...templateData });
    } else {
      const newTemplate = await createTemplate.mutateAsync(templateData);
      if (newTemplate && settings) {
        await updateSettings.mutateAsync({
          ...settings,
          template_id: newTemplate.id,
        });
      }
      if (newTemplate) {
        onSave(newTemplate);
      }
    }
  };

  if (!settings || settingsLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Relationship Maintenance"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of when to use this template"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="days">Days Since Most Recent Contact</Label>
              <Input
                id="days"
                type="number"
                value={daysSinceContact}
                onChange={(e) => setDaysSinceContact(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This determines automatic defaults for tone, length, and modules
              </p>
            </div>
          </div>

          {/* Configuration Tabs */}
          <Tabs defaultValue="core" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="core">Core Settings</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="personalization">Personalization</TabsTrigger>
              <TabsTrigger value="inquiry">Inquiry</TabsTrigger>
              <TabsTrigger value="phrases">Phrase Library</TabsTrigger>
              <TabsTrigger value="quality">Quality Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="core" className="mt-4">
              <CoreSettingsPanel
                daysSinceContact={daysSinceContact}
                settings={settings}
                onSettingsChange={(updates) => {
                  updateSettings.mutate({ ...settings, ...updates });
                }}
              />
            </TabsContent>

            <TabsContent value="modules" className="mt-4">
              <ModulesPanel
                settings={settings}
                onSettingsChange={(updates) => {
                  updateSettings.mutate({ ...settings, ...updates });
                }}
              />
            </TabsContent>

            <TabsContent value="personalization" className="mt-4">
              <PersonalizationPanel
                settings={settings}
                onSettingsChange={(updates) => {
                  updateSettings.mutate({ ...settings, ...updates });
                }}
              />
            </TabsContent>

            <TabsContent value="inquiry" className="mt-4">
              <InquiryConfigPanel
                settings={settings}
                onSettingsChange={(updates) => {
                  updateSettings.mutate({ ...settings, ...updates });
                }}
              />
            </TabsContent>

            <TabsContent value="phrases" className="mt-4">
              <PhraseLibraryPanel templateId={template?.id || null} />
            </TabsContent>

            <TabsContent value="quality" className="mt-4">
              <QualityRulesPanel
                settings={settings}
                onSettingsChange={(updates) => {
                  updateSettings.mutate({ ...settings, ...updates });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}