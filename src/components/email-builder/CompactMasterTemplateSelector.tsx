import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MASTER_TEMPLATES, type MasterTemplate } from "@/lib/router";

interface CompactMasterTemplateSelectorProps {
  value: string | null;
  onChange: (masterKey: string) => void;
  disabled?: boolean;
}

export function CompactMasterTemplateSelector({ 
  value, 
  onChange,
  disabled 
}: CompactMasterTemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Master Template</Label>
      <Select 
        value={value || ''} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select template..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MASTER_TEMPLATES).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <p className="text-xs text-muted-foreground">
          {MASTER_TEMPLATES[value]?.description}
        </p>
      )}
    </div>
  );
}
