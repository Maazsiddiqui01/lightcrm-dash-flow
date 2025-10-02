import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TemplateSettings } from "@/types/phraseLibrary";

interface CoreSettingsPanelProps {
  daysSinceContact: number;
  settings: TemplateSettings;
  onSettingsChange: (updates: Partial<TemplateSettings>) => void;
}

export function CoreSettingsPanel({
  daysSinceContact,
  settings,
  onSettingsChange,
}: CoreSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Core Email Settings</CardTitle>
        <CardDescription>
          Configure tone, length, and subject line preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tone">Tone Override</Label>
          <Select
            value={settings.tone_override || 'default'}
            onValueChange={(val) =>
              onSettingsChange({
                tone_override: val === 'default' ? null : val,
              })
            }
          >
            <SelectTrigger id="tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use Default</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="length">Length Override</Label>
          <Select
            value={settings.length_override || 'default'}
            onValueChange={(val) =>
              onSettingsChange({
                length_override: val === 'default' ? null : val,
              })
            }
          >
            <SelectTrigger id="length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use Default</SelectItem>
              <SelectItem value="brief">Brief</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject-pool">Subject Pool Override</Label>
          <Select
            value={settings.subject_pool_override || 'default'}
            onValueChange={(val) =>
              onSettingsChange({
                subject_pool_override: val === 'default' ? null : val,
              })
            }
          >
            <SelectTrigger id="subject-pool">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use Default</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          Based on {daysSinceContact} days since contact
        </p>
      </CardContent>
    </Card>
  );
}
