import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { EmailTemplate, useCreateTemplateMutation, useUpdateTemplateMutation } from "@/hooks/useEmailTemplates";
import { PreviewModal } from "./PreviewModal";
import { useTemplatePreviewLLM, TemplatePreviewInput } from "@/hooks/useTemplatePreviewLLM";
import { useDebounce } from "@/hooks/useDebounce";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_preset: z.boolean().optional(),
  gb_present: z.boolean().optional(),
  fa_bucket: z.number().min(1).max(10).optional(),
  has_opps: z.boolean().optional(),
  delta_type: z.string().optional(),
  subject_mode: z.string().optional(),
  hs_present: z.boolean().optional(),
  ls_present: z.boolean().optional(),
  max_opps: z.number().min(1).max(10).optional(),
  custom_instructions: z.string().optional(),
  custom_insertion: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  template: EmailTemplate | null;
  onTemplateChange: (template: EmailTemplate | null) => void;
}

export function TemplateEditor({ template, onTemplateChange }: TemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();
  const previewMutation = useTemplatePreviewLLM();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      is_preset: false,
      gb_present: false,
      fa_bucket: 1,
      has_opps: false,
      delta_type: 'Email',
      subject_mode: 'lg_first',
      hs_present: false,
      ls_present: false,
      max_opps: 3,
      custom_instructions: '',
      custom_insertion: 'before_closing',
    },
  });

  const watchedValues = form.watch();
  const debouncedValues = useDebounce(watchedValues, 1000);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
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
  }, [template, form]);

  // Auto-save when form values change
  useEffect(() => {
    if (!template || Object.keys(form.formState.dirtyFields).length === 0) return;

    const saveTemplate = async () => {
      try {
        if (template.id) {
          await updateMutation.mutateAsync({
            id: template.id,
            ...debouncedValues,
          });
        } else {
          const newTemplate = await createMutation.mutateAsync({
            ...debouncedValues,
            name: debouncedValues.name || 'Untitled Template',
            is_preset: debouncedValues.is_preset || false
          } as Omit<EmailTemplate, 'created_at' | 'id'>);
          onTemplateChange(newTemplate);
        }
      } catch (error) {
        console.error('Failed to save template:', error);
      }
    };

    saveTemplate();
  }, [debouncedValues, template, updateMutation, createMutation, onTemplateChange, form.formState.dirtyFields]);

  const handlePreview = async () => {
    if (!template) return;
    
    const previewInput: TemplatePreviewInput = {
      firstName: "Alex",
      organization: "SampleCo", 
      focusAreas: ["Healthcare Services"],
      descriptions: { "Healthcare Services": "businesses that serve hospitals and health systems as key end markets." },
      focusAreaDescriptions: [
        {
          focus_area: "Healthcare Services",
          description: "businesses that serve hospitals and health systems as key end markets.",
          platform_type: "New Platform",
          sector: "Healthcare"
        }
      ],
      articles: [
        {
          focus_area: "Healthcare Services",
          article_link: "https://example.com/article",
          article_date: "2024-01-15",
          last_date_to_use: "2024-12-31"
        }
      ],
      delta_type: template.delta_type || "Email",
      hs_present: template.hs_present || false,
      ls_present: template.ls_present || false,
      has_opps: template.has_opps || false
    };

    try {
      const result = await previewMutation.mutateAsync(previewInput);
      setPreviewContent(result);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleSave = async () => {
    const formData = form.getValues();
    
    try {
      if (template?.id) {
        const updatedTemplate = await updateMutation.mutateAsync({
          id: template.id,
          ...formData,
        });
        onTemplateChange(updatedTemplate);
      } else {
        const newTemplate = await createMutation.mutateAsync({
          ...formData,
          name: formData.name || 'Untitled Template',
          is_preset: formData.is_preset || false
        } as Omit<EmailTemplate, 'created_at' | 'id'>);
        onTemplateChange(newTemplate);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a template to edit</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewMutation.isPending}>
            <Eye className="h-4 w-4 mr-1" />
            {previewMutation.isPending ? "Generating..." : "Preview"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
            {(updateMutation.isPending || createMutation.isPending) ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter template name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe this template's purpose"
              />
            </div>
          </CardContent>
        </Card>

        {/* Case Knobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Case Knobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gb_present"
                checked={form.watch('gb_present')}
                onCheckedChange={(checked) => form.setValue('gb_present', !!checked)}
              />
              <Label htmlFor="gb_present">General BD Present</Label>
            </div>

            <div className="space-y-2">
              <Label>Subject Mode</Label>
              <RadioGroup
                value={form.watch('subject_mode')}
                onValueChange={(value) => form.setValue('subject_mode', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lg_first" id="lg_first" />
                  <Label htmlFor="lg_first">LG First</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contact_first" id="contact_first" />
                  <Label htmlFor="contact_first">Contact First</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subject_only" id="subject_only" />
                  <Label htmlFor="subject_only">Subject Only</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_opps"
                checked={form.watch('has_opps')}
                onCheckedChange={(checked) => form.setValue('has_opps', !!checked)}
              />
              <Label htmlFor="has_opps">Has Opportunities</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delta_type">Delta Type</Label>
              <Select
                value={form.watch('delta_type')}
                onValueChange={(value) => form.setValue('delta_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delta type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <RadioGroup
                value={form.watch('custom_insertion')}
                onValueChange={(value) => form.setValue('custom_insertion', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="before_closing" id="before_closing" />
                  <Label htmlFor="before_closing">Before Closing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="after_closing" id="after_closing" />
                  <Label htmlFor="after_closing">After Closing</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hs_present">HS Present</Label>
                <Switch
                  id="hs_present"
                  checked={form.watch('hs_present')}
                  onCheckedChange={(checked) => form.setValue('hs_present', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ls_present">LS Present</Label>
                <Switch
                  id="ls_present"
                  checked={form.watch('ls_present')}
                  onCheckedChange={(checked) => form.setValue('ls_present', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_opps">Max Opportunities</Label>
              <Input
                id="max_opps"
                type="number"
                min="1"
                max="10"
                value={form.watch('max_opps')}
                onChange={(e) => form.setValue('max_opps', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fa_bucket">FA Bucket</Label>
              <Input
                id="fa_bucket"
                type="number"
                min="1"
                max="10"
                value={form.watch('fa_bucket')}
                onChange={(e) => form.setValue('fa_bucket', parseInt(e.target.value) || 1)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom_instructions">Custom Instructions</Label>
              <Textarea
                id="custom_instructions"
                {...form.register('custom_instructions')}
                placeholder="Additional instructions for email generation"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <PreviewModal 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={template}
      />
    </div>
  );
}