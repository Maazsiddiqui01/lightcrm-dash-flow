import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CompactCoreSettingsProps {
  tone: 'casual' | 'hybrid' | 'formal' | null;
  length: 'brief' | 'standard' | 'detailed' | null;
  daysSince: number;
  onToneChange: (tone: 'casual' | 'hybrid' | 'formal' | null) => void;
  onLengthChange: (length: 'brief' | 'standard' | 'detailed' | null) => void;
  onDaysSinceChange: (days: number) => void;
  disabled?: boolean;
}

export function CompactCoreSettings({
  tone,
  length,
  daysSince,
  onToneChange,
  onLengthChange,
  onDaysSinceChange,
  disabled
}: CompactCoreSettingsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Tone</Label>
        <Select 
          value={tone || 'default'} 
          onValueChange={(v) => onToneChange(v === 'default' ? null : v as any)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Length</Label>
        <Select 
          value={length || 'default'} 
          onValueChange={(v) => onLengthChange(v === 'default' ? null : v as any)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="brief">Brief</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="detailed">Detailed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Days Since Contact</Label>
        <Input
          type="number"
          value={daysSince}
          onChange={(e) => onDaysSinceChange(parseInt(e.target.value) || 0)}
          min={0}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
