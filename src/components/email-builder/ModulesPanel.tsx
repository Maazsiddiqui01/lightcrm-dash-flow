import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TriStateToggle } from './TriStateToggle';
import { MODULE_LABELS } from '@/types/phraseLibrary';
import type { TemplateSettings, TriState } from '@/types/phraseLibrary';

interface ModulesPanelProps {
  settings: TemplateSettings;
  onSettingsChange: (settings: Partial<TemplateSettings>) => void;
}

export function ModulesPanel({ settings, onSettingsChange }: ModulesPanelProps) {
  const handleModuleChange = (moduleKey: string, value: TriState) => {
    onSettingsChange({
      module_states: {
        ...settings.module_states,
        [moduleKey]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Modules</CardTitle>
        <CardDescription>
          Configure which content modules to include in emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(MODULE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{label}</p>
              {getModuleDescription(key) && (
                <p className="text-xs text-muted-foreground">{getModuleDescription(key)}</p>
              )}
            </div>
            <TriStateToggle
              value={(settings.module_states[key] as TriState) || 'sometimes'}
              onChange={(value) => handleModuleChange(key, value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getModuleDescription(moduleKey: string): string {
  const descriptions: Record<string, string> = {
    top_opportunities: 'Show top 3 opportunities by EBITDA',
    article_recommendations: 'Include relevant articles tied to focus areas',
    platforms: 'Highlight qualifying platform opportunities',
    addons: 'Highlight qualifying add-on opportunities',
    suggested_talking_points: 'Add conversation starters',
    general_org_update: 'Include general organizational updates',
    attachments: 'Attach files to the email',
    ps: 'Add a P.S. line',
  };
  return descriptions[moduleKey] || '';
}
