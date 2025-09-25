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
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
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

  // Watch form values for auto-save
  const formValues = form.watch();
  const debouncedValues = useDebounce(formValues, 500);

  // Update form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || '',
        description: template.description || '',
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

  // Auto-save on form changes
  useEffect(() => {
    if (!template || template.id === 'new') return;
    
    const isValid = form.formState.isValid;
    if (isValid && Object.keys(form.formState.dirtyFields).length > 0) {
      updateMutation.mutate({
        id: template.id,
        ...debouncedValues,
      });
    }
  }, [debouncedValues, template, form.formState, updateMutation]);

  const handleSave = async () => {
    if (!template) return;

    const values = form.getValues();
    
    if (template.id === 'new') {
      const newTemplate = await createMutation.mutateAsync({
        ...values,
        name: values.name || 'Untitled Template',
        is_preset: false,
      });
      onTemplateChange(newTemplate);
    } else {
      const updatedTemplate = await updateMutation.mutateAsync({
        id: template.id,
        ...values,
      });
      onTemplateChange(updatedTemplate);
    }
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a template to edit or create a new one
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {template.id === 'new' ? 'New Template' : 'Edit Template'}
        </h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          {template.id === 'new' && (
            <Button size="sm" onClick={handleSave}>
              Save Template
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Template name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Template description"
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Case Knobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gb_present"
                checked={form.watch('gb_present')}
                onCheckedChange={(checked) => form.setValue('gb_present', checked as boolean)}
              />
              <Label htmlFor="gb_present">General BD Present</Label>
            </div>

            <div className="space-y-2">
              <Label>FA Bucket</Label>
              <RadioGroup
                value={String(form.watch('fa_bucket'))}
                onValueChange={(value) => form.setValue('fa_bucket', parseInt(value))}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="fa1" />
                  <Label htmlFor="fa1">1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="fa2" />
                  <Label htmlFor="fa2">2</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="fa3" />
                  <Label htmlFor="fa3">≥3</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_opps"
                checked={form.watch('has_opps')}
                onCheckedChange={(checked) => form.setValue('has_opps', checked as boolean)}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject Mode</Label>
              <RadioGroup
                value={form.watch('subject_mode')}
                onValueChange={(value) => form.setValue('subject_mode', value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lg_first" id="lg_first" />
                  <Label htmlFor="lg_first">LG First</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fa_first" id="fa_first" />
                  <Label htmlFor="fa_first">FA First</Label>
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
                onChange={(e) => form.setValue('max_opps', parseInt(e.target.value) || 3)}
              />
            </div>
          </CardContent>
        </Card>

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
                placeholder="Additional instructions for the template"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Custom Insertion Position</Label>
              <RadioGroup
                value={form.watch('custom_insertion')}
                onValueChange={(value) => form.setValue('custom_insertion', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intro" id="intro" />
                  <Label htmlFor="intro">Intro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="after_bullets" id="after_bullets" />
                  <Label htmlFor="after_bullets">After Bullets</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="before_closing" id="before_closing" />
                  <Label htmlFor="before_closing">Before Closing</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </div>

      <PreviewModal
        template={template}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}