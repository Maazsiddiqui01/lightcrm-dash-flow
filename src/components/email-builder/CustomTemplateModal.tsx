import { useState } from "react";
import { useCreateTemplateMutation } from "@/hooks/useEmailTemplates";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";

interface CustomTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onTemplateCreate: (template: EmailTemplate) => void;
}

export function CustomTemplateModal({ open, onClose, onTemplateCreate }: CustomTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    delta_type: "",
    fa_bucket: 0,
    hs_present: false,
    ls_present: false,
    gb_present: false,
    has_opps: false,
    custom_instructions: "",
    custom_insertion: "before_closing",
    subject_mode: "lg_first",
    max_opps: 3,
  });

  const createMutation = useCreateTemplateMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      const newTemplate = await createMutation.mutateAsync({
        ...formData,
        is_preset: false,
      });
      
      onTemplateCreate(newTemplate);
      setFormData({
        name: "",
        description: "",
        delta_type: "",
        fa_bucket: 0,
        hs_present: false,
        ls_present: false,
        gb_present: false,
        has_opps: false,
        custom_instructions: "",
        custom_insertion: "before_closing",
        subject_mode: "lg_first",
        max_opps: 3,
      });
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Template</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when to use this template"
                rows={3}
              />
            </div>
          </div>

          {/* Template Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delta_type">Delta Type</Label>
              <Select
                value={formData.delta_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, delta_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delta type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Call">Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fa_bucket">Focus Area Bucket</Label>
              <Select
                value={formData.fa_bucket.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, fa_bucket: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bucket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 Focus Areas</SelectItem>
                  <SelectItem value="1">1 Focus Area</SelectItem>
                  <SelectItem value="2">2 Focus Areas</SelectItem>
                  <SelectItem value="3">3+ Focus Areas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject_mode">Subject Mode</Label>
              <Select
                value={formData.subject_mode}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject_mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lg_first">LG First</SelectItem>
                  <SelectItem value="contact_first">Contact First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max_opps">Max Opportunities</Label>
              <Input
                id="max_opps"
                type="number"
                min="0"
                max="10"
                value={formData.max_opps}
                onChange={(e) => setFormData(prev => ({ ...prev, max_opps: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Boolean Flags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hs_present">Healthcare Services Present</Label>
              <Switch
                id="hs_present"
                checked={formData.hs_present}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hs_present: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ls_present">Life Sciences Present</Label>
              <Switch
                id="ls_present"
                checked={formData.ls_present}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ls_present: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="gb_present">General BD Present</Label>
              <Switch
                id="gb_present"
                checked={formData.gb_present}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, gb_present: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="has_opps">Has Opportunities</Label>
              <Switch
                id="has_opps"
                checked={formData.has_opps}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_opps: checked }))}
              />
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom_instructions">Custom Instructions</Label>
              <Textarea
                id="custom_instructions"
                value={formData.custom_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_instructions: e.target.value }))}
                placeholder="Additional instructions for the AI"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="custom_insertion">Custom Insertion Point</Label>
              <Select
                value={formData.custom_insertion}
                onValueChange={(value) => setFormData(prev => ({ ...prev, custom_insertion: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_closing">Before Closing</SelectItem>
                  <SelectItem value="after_opening">After Opening</SelectItem>
                  <SelectItem value="middle">Middle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !formData.name.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}