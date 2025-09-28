import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, Settings } from "lucide-react";
import type { MasterTemplate } from "@/lib/router";

export interface ModuleStates {
  initial_greeting: boolean;
  self_personalization: boolean;
  top_opportunities: boolean;
  article_recommendations: boolean;
  platforms: boolean;
  addons: boolean;
  suggested_talking_points: boolean;
  general_org_update: boolean;
  attachments: boolean;
  meeting_request: boolean;
  ai_backup_personalization: boolean;
}

interface ModulesCardProps {
  masterTemplate: MasterTemplate | null;
  moduleStates: ModuleStates;
  onModuleChange: (module: keyof ModuleStates, enabled: boolean) => void;
  onResetToDefaults: () => void;
}

// Default configurations for each master template
export const MODULE_DEFAULTS: Record<string, ModuleStates> = {
  relationship_maintenance: {
    initial_greeting: true,
    self_personalization: true,
    top_opportunities: true,
    article_recommendations: true,
    platforms: false,
    addons: false,
    suggested_talking_points: true, // Sometimes - treating as true for now
    general_org_update: false,
    attachments: false,
    meeting_request: true,
    ai_backup_personalization: true,
  },
  business_development: {
    initial_greeting: true,
    self_personalization: true,
    top_opportunities: true,
    article_recommendations: true,
    platforms: true,
    addons: true,
    suggested_talking_points: true,
    general_org_update: true,
    attachments: true, // Can be toggled
    meeting_request: true,
    ai_backup_personalization: true,
  },
  hybrid_neutral: {
    initial_greeting: true,
    self_personalization: true,
    top_opportunities: true,
    article_recommendations: true, // ~60% - treating as true for now
    platforms: false,
    addons: false,
    suggested_talking_points: true,
    general_org_update: false,
    attachments: false,
    meeting_request: true,
    ai_backup_personalization: true,
  },
};

const MODULE_LABELS: Record<keyof ModuleStates, string> = {
  initial_greeting: "Initial Greeting",
  self_personalization: "Self Personalization", 
  top_opportunities: "Top Opportunities",
  article_recommendations: "Article Recommendations",
  platforms: "Platforms",
  addons: "Add-ons",
  suggested_talking_points: "Suggested Talking Points",
  general_org_update: "General Org Update",
  attachments: "Attachments",
  meeting_request: "Meeting Request",
  ai_backup_personalization: "AI Backup Personalization",
};

export function ModulesCard({ 
  masterTemplate, 
  moduleStates, 
  onModuleChange, 
  onResetToDefaults 
}: ModulesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Email Modules
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetToDefaults}
            disabled={!masterTemplate}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Master Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!masterTemplate && (
          <div className="text-center py-4 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a contact and master template to configure modules</p>
          </div>
        )}

        {masterTemplate && (
          <div className="grid gap-3">
            {Object.entries(MODULE_LABELS).map(([moduleKey, label]) => {
              const key = moduleKey as keyof ModuleStates;
              const isEnabled = moduleStates[key];
              
              return (
                <div key={moduleKey} className="flex items-center justify-between space-x-2">
                  <Label 
                    htmlFor={moduleKey} 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    {label}
                  </Label>
                  <Switch
                    id={moduleKey}
                    checked={isEnabled}
                    onCheckedChange={(checked) => onModuleChange(key, checked)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {masterTemplate && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Current master: {masterTemplate.master_key.replace(/_/g, ' ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}