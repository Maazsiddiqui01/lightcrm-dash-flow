import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMasterTemplateForDays } from '@/hooks/useMasterTemplates';
import type { TemplateSettings } from '@/types/phraseLibrary';

interface CoreSettingsPanelProps {
  daysSinceContact: number;
  settings: TemplateSettings;
  onSettingsChange: (settings: Partial<TemplateSettings>) => void;
}

export function CoreSettingsPanel({ daysSinceContact, settings, onSettingsChange }: CoreSettingsPanelProps) {
  const masterTemplate = useMasterTemplateForDays(daysSinceContact);

  const effectiveTone = settings.tone_override || masterTemplate?.tone || 'hybrid';
  const effectiveLength = settings.length_override || masterTemplate?.length || 'medium';
  const effectiveSubjectPool = settings.subject_pool_override || masterTemplate?.subject_style || 'mixed';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Settings</CardTitle>
        <CardDescription>
          Based on {daysSinceContact} days since last contact
          {masterTemplate && ` (${masterTemplate.master_key.replace(/_/g, ' ')})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tone Override</Label>
          <Select
            value={settings.tone_override || 'auto'}
            onValueChange={(value) => 
              onSettingsChange({ tone_override: value === 'auto' ? null : value as any })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({effectiveTone})</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Length Override</Label>
          <Select
            value={settings.length_override || 'auto'}
            onValueChange={(value) => 
              onSettingsChange({ length_override: value === 'auto' ? null : value as any })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({effectiveLength})</SelectItem>
              <SelectItem value="brief">Brief (2-4 lines)</SelectItem>
              <SelectItem value="medium">Medium (5-8 lines)</SelectItem>
              <SelectItem value="detailed">Detailed (9+ lines)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subject Pool Override</Label>
          <Select
            value={settings.subject_pool_override || 'auto'}
            onValueChange={(value) => 
              onSettingsChange({ subject_pool_override: value === 'auto' ? null : value as any })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({effectiveSubjectPool})</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Days since contact: <span className="font-medium">{daysSinceContact}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Master template: <span className="font-medium capitalize">
              {masterTemplate?.master_key.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
