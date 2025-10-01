import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Copy, Trash2 } from "lucide-react";
import { useEmailTemplatesQuery, useDeleteTemplateMutation, useDuplicateTemplateMutation, EmailTemplate } from "@/hooks/useEmailTemplates";
import { TemplateConfigModal } from './TemplateConfigModal';
import { cn } from "@/lib/utils";

interface TemplatesListProps {
  selectedTemplate: EmailTemplate | null;
  onTemplateSelect: (template: EmailTemplate | null) => void;
}

export function TemplatesList({ selectedTemplate, onTemplateSelect }: TemplatesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const { data: templates = [], isLoading } = useEmailTemplatesQuery();
  const deleteTemplateMutation = useDeleteTemplateMutation();
  const duplicateTemplateMutation = useDuplicateTemplateMutation();

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: 'new',
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
    };
    setEditingTemplate(newTemplate);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDuplicate = (template: EmailTemplate) => {
    duplicateTemplateMutation.mutate(template);
  };

  const handleDelete = (template: EmailTemplate) => {
    if (template.is_preset) return;
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
      if (selectedTemplate?.id === template.id) {
        onTemplateSelect(null);
      }
    }
  };

  const getKnobsSummary = (template: EmailTemplate) => {
    const parts = [];
    if (template.gb_present) parts.push('GB');
    parts.push(`FA:${template.fa_bucket || 1}`);
    if (template.has_opps) parts.push('Opps');
    parts.push(template.delta_type || 'Email');
    parts.push(template.subject_mode === 'fa_first' ? 'FA→LG' : 'LG→FA');
    return parts.join(' • ');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Actions */}
      <div className="flex gap-2 mb-4">
        <Button onClick={handleNewTemplate} size="sm" className="flex-1">
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-colors hover:bg-accent",
              selectedTemplate?.id === template.id && "ring-2 ring-primary bg-accent"
            )}
            onClick={() => handleEditTemplate(template)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{template.name}</h3>
                  {template.is_preset && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Preset
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(template);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {!template.is_preset && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template);
                      }}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {template.description || 'No description'}
              </p>
              <p className="text-xs text-muted-foreground">
                {getKnobsSummary(template)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Editor Modal */}
      <TemplateConfigModal
        template={editingTemplate}
        open={showEditor}
        onOpenChange={setShowEditor}
        onSave={(savedTemplate) => {
          setShowEditor(false);
          onTemplateSelect(savedTemplate);
        }}
      />
    </div>
  );
}