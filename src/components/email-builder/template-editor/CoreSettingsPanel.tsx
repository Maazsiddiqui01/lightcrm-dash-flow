import { TemplateSettings } from "@/hooks/useTemplateSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, X } from "lucide-react";

interface CoreSettingsPanelProps {
  settings: TemplateSettings;
  onSettingsChange: (settings: TemplateSettings) => void;
}

const TONE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'casual', label: 'Casual' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'formal', label: 'Formal' },
];

const LENGTH_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'brief', label: 'Brief' },
  { value: 'mid', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const MEETING_REQUEST_OPTIONS = [
  { value: 'Always', label: 'Always' },
  { value: 'Sometimes', label: 'Sometimes' },
  { value: 'Never', label: 'Never' },
];

const SUBJECT_POOLS = ['formal', 'casual', 'mixed'];

export function CoreSettingsPanel({ settings, onSettingsChange }: CoreSettingsPanelProps) {
  const updateCoreOverrides = (updates: Partial<typeof settings.core_overrides>) => {
    onSettingsChange({
      ...settings,
      core_overrides: {
        ...settings.core_overrides,
        ...updates,
      },
    });
  };

  const toggleSubjectPool = (pool: string) => {
    const currentPools = settings.core_overrides.subjectPools || [];
    const newPools = currentPools.includes(pool)
      ? currentPools.filter(p => p !== pool)
      : [...currentPools, pool];
    
    updateCoreOverrides({ subjectPools: newPools });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Core Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Max Lag Days */}
        <div>
          <Label htmlFor="maxLagDays">Max Lag (Days)</Label>
          <Input
            id="maxLagDays"
            type="number"
            min="1"
            max="365"
            value={settings.core_overrides.maxLagDays || 30}
            onChange={(e) => updateCoreOverrides({ maxLagDays: parseInt(e.target.value) || 30 })}
          />
        </div>

        {/* Tone Override */}
        <div>
          <Label htmlFor="tone">Tone Override</Label>
          <Select
            value={settings.core_overrides.tone || 'auto'}
            onValueChange={(value) => updateCoreOverrides({ tone: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Length Override */}
        <div>
          <Label htmlFor="length">Length Override</Label>
          <Select
            value={settings.core_overrides.length || 'auto'}
            onValueChange={(value) => updateCoreOverrides({ length: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LENGTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Pools */}
        <div>
          <Label>Subject Pools</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SUBJECT_POOLS.map((pool) => {
              const isSelected = (settings.core_overrides.subjectPools || []).includes(pool);
              return (
                <Button
                  key={pool}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSubjectPool(pool)}
                  className="capitalize"
                >
                  {pool}
                  {isSelected && <X className="h-3 w-3 ml-1" />}
                </Button>
              );
            })}
          </div>
          {(!settings.core_overrides.subjectPools || settings.core_overrides.subjectPools.length === 0) && (
            <p className="text-sm text-muted-foreground mt-1">
              Select at least one subject pool
            </p>
          )}
        </div>

        {/* Meeting Request */}
        <div>
          <Label htmlFor="meetingRequest">Meeting Request</Label>
          <Select
            value={settings.core_overrides.meetingRequest || 'Sometimes'}
            onValueChange={(value) => updateCoreOverrides({ meetingRequest: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETING_REQUEST_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}