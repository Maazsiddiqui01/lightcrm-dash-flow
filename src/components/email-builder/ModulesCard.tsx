import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Settings } from "lucide-react";
import type { MasterTemplate } from "@/lib/router";
import { TriStateToggle } from "./TriStateToggle";
import type { TriState } from "@/types/phraseLibrary";

export interface ModuleStates {
  initial_greeting: TriState;
  self_personalization: TriState;
  top_opportunities: TriState;
  article_recommendations: TriState;
  platforms: TriState;
  addons: TriState;
  suggested_talking_points: TriState;
  general_org_update: TriState;
  attachments: TriState;
  meeting_request: TriState;
  ai_backup_personalization: TriState;
}

interface ModulesCardProps {
  masterTemplate: MasterTemplate | null;
  moduleStates: ModuleStates;
  onModuleChange: (module: keyof ModuleStates, value: TriState) => void;
  onResetToDefaults: () => void;
}

/**
 * Get module defaults from master template (database-driven)
 * These are now loaded from master_template_defaults table
 */
export function getModuleDefaultsFromMaster(masterKey: string, masterTemplates: any[]): ModuleStates | null {
  const template = masterTemplates.find(t => t.master_key === masterKey);
  if (!template || !template.default_modules) return null;
  
  const defaults = template.default_modules;
  
  return {
    initial_greeting: defaults.initial_greeting || 'always',
    self_personalization: defaults.self_personalization || 'always',
    top_opportunities: defaults.top_opportunities || 'always',
    article_recommendations: defaults.article_recommendations || 'sometimes',
    platforms: defaults.platforms || 'never',
    addons: defaults.addons || 'never',
    suggested_talking_points: defaults.suggested_talking_points || 'sometimes',
    general_org_update: defaults.general_org_update || 'never',
    attachments: defaults.attachments || 'never',
    meeting_request: defaults.meeting_request || 'sometimes',
    ai_backup_personalization: defaults.ai_backup_personalization || 'sometimes',
  };
}

// Fallback defaults (used when database is not available)
export const MODULE_DEFAULTS: Record<string, ModuleStates> = {
  relationship_maintenance: {
    initial_greeting: 'always',
    self_personalization: 'always',
    top_opportunities: 'always',
    article_recommendations: 'sometimes',
    platforms: 'never',
    addons: 'never',
    suggested_talking_points: 'sometimes',
    general_org_update: 'never',
    attachments: 'never',
    meeting_request: 'sometimes',
    ai_backup_personalization: 'sometimes',
  },
  business_development: {
    initial_greeting: 'always',
    self_personalization: 'always',
    top_opportunities: 'sometimes',
    article_recommendations: 'always',
    platforms: 'always',
    addons: 'always',
    suggested_talking_points: 'always',
    general_org_update: 'always',
    attachments: 'sometimes',
    meeting_request: 'always',
    ai_backup_personalization: 'sometimes',
  },
  hybrid_neutral: {
    initial_greeting: 'always',
    self_personalization: 'always',
    top_opportunities: 'always',
    article_recommendations: 'sometimes',
    platforms: 'never',
    addons: 'never',
    suggested_talking_points: 'sometimes',
    general_org_update: 'never',
    attachments: 'never',
    meeting_request: 'sometimes',
    ai_backup_personalization: 'sometimes',
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
          <div className="space-y-3">
            {Object.entries(MODULE_LABELS).map(([moduleKey, label]) => {
              const key = moduleKey as keyof ModuleStates;
              const value = moduleStates[key];
              
              return (
                <div 
                  key={moduleKey} 
                  className={`p-3 rounded-lg border transition-colors ${
                    value === 'never' ? 'opacity-50 bg-muted/20' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium flex-1">{label}</span>
                    <TriStateToggle
                      value={value}
                      onChange={(newValue) => onModuleChange(key, newValue)}
                    />
                  </div>
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