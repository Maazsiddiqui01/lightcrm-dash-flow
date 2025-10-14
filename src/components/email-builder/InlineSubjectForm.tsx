import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface InlineSubjectFormProps {
  mode: 'create' | 'edit';
  initialTemplate?: string;
  initialStyle?: 'formal' | 'hybrid' | 'casual';
  onSave: (template: string, style: 'formal' | 'hybrid' | 'casual') => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultStyle?: 'formal' | 'hybrid' | 'casual';
}

export function InlineSubjectForm({
  mode,
  initialTemplate = '',
  initialStyle = 'hybrid',
  onSave,
  onCancel,
  isLoading = false,
  defaultStyle = 'hybrid',
}: InlineSubjectFormProps) {
  const [template, setTemplate] = useState(initialTemplate);
  const [style, setStyle] = useState<'formal' | 'hybrid' | 'casual'>(initialStyle || defaultStyle);

  const handleSave = () => {
    if (template.trim()) {
      onSave(template.trim(), style);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
      <div className="space-y-2">
        <Label htmlFor="subject-template">Subject Line Template</Label>
        <Textarea
          id="subject-template"
          placeholder="Enter subject line... Use [My Org], [Their Org], [Focus Area], [Sector]"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs font-mono">[My Org]</Badge>
          <Badge variant="outline" className="text-xs font-mono">[Their Org]</Badge>
          <Badge variant="outline" className="text-xs font-mono">[Focus Area]</Badge>
          <Badge variant="outline" className="text-xs font-mono">[Sector]</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject-style">Style</Label>
        <Select value={style} onValueChange={(v) => setStyle(v as 'formal' | 'hybrid' | 'casual')}>
          <SelectTrigger id="subject-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={!template.trim() || isLoading}
          size="sm"
          className="flex-1"
        >
          {isLoading ? "Saving..." : mode === 'create' ? "Add" : "Update"}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
