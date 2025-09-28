import { useState } from "react";
import { useEmailTemplatesQuery } from "@/hooks/useEmailTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomTemplateModal } from "./CustomTemplateModal";
import { FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";

interface TemplateSwitcherProps {
  selectedTemplate: EmailTemplate | null;
  onTemplateSelect: (template: EmailTemplate | null) => void;
}

export function TemplateSwitcher({ selectedTemplate, onTemplateSelect }: TemplateSwitcherProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const { data: templates, isLoading } = useEmailTemplatesQuery();

  const presetTemplates = templates?.filter(t => t.is_preset) || [];

  const handleCustomTemplateCreate = (template: EmailTemplate) => {
    onTemplateSelect(template);
    setShowCustomModal(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Select Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Template Display */}
        {selectedTemplate && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{selectedTemplate.name}</p>
                  {selectedTemplate.is_preset && (
                    <Badge variant="secondary" className="text-xs">
                      Preset
                    </Badge>
                  )}
                </div>
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTemplateSelect(null)}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {!selectedTemplate && (
          <>
            {/* Create Custom Template Button */}
            <Button
              onClick={() => setShowCustomModal(true)}
              variant="outline"
              className="w-full justify-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Template
            </Button>

            {/* Preset Templates */}
            <div>
              <h4 className="font-medium mb-3">Preset Templates</h4>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : presetTemplates.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No preset templates available
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {presetTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors",
                        "hover:bg-muted/50"
                      )}
                      onClick={() => onTemplateSelect(template)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{template.name}</div>
                        <Badge variant="secondary" className="text-xs">
                          Preset
                        </Badge>
                      </div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Custom Template Modal */}
        <CustomTemplateModal
          open={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          onTemplateCreate={handleCustomTemplateCreate}
        />
      </CardContent>
    </Card>
  );
}