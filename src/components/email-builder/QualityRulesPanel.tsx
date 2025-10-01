import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { TemplateSettings } from "@/types/phraseLibrary";

interface QualityRulesPanelProps {
  settings: TemplateSettings;
  onSettingsChange: (settings: Partial<TemplateSettings>) => void;
}

export function QualityRulesPanel({ settings, onSettingsChange }: QualityRulesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Rules</CardTitle>
        <CardDescription>
          Configure skip rules and quality thresholds (Quality over Quantity)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label>Skip if No Opportunities</Label>
            <p className="text-xs text-muted-foreground">
              Don't send if no logged opportunities exist
            </p>
          </div>
          <Switch
            checked={settings.quality_rules.skip_if_no_opps}
            onCheckedChange={(checked) =>
              onSettingsChange({
                quality_rules: {
                  ...settings.quality_rules,
                  skip_if_no_opps: checked,
                },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label>Skip if No Articles</Label>
            <p className="text-xs text-muted-foreground">
              Don't send if no relevant articles are available
            </p>
          </div>
          <Switch
            checked={settings.quality_rules.skip_if_no_articles}
            onCheckedChange={(checked) =>
              onSettingsChange({
                quality_rules: {
                  ...settings.quality_rules,
                  skip_if_no_articles: checked,
                },
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Minimum Personalization Score</Label>
          <Input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={settings.quality_rules.min_personalization_score}
            onChange={(e) =>
              onSettingsChange({
                quality_rules: {
                  ...settings.quality_rules,
                  min_personalization_score: Number(e.target.value),
                },
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Don't send if personalization score is below this threshold (0-10)
          </p>
        </div>

        <div className="space-y-2">
          <Label>EBITDA Threshold (millions)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={settings.quality_rules.ebitda_threshold}
            onChange={(e) =>
              onSettingsChange({
                quality_rules: {
                  ...settings.quality_rules,
                  ebitda_threshold: Number(e.target.value),
                },
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Default EBITDA threshold for platform opportunities
          </p>
        </div>
      </CardContent>
    </Card>
  );
}