import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import type { ModuleSelections } from "@/types/moduleSelections";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { TriState } from "@/types/phraseLibrary";

interface ModuleStates {
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

interface ModuleContentPreviewProps {
  moduleOrder: Array<keyof ModuleStates>;
  moduleStates: ModuleStates;
  moduleSelections: ModuleSelections;
  allPhrases: PhraseLibraryItem[];
  contactData: {
    first_name?: string;
    full_name?: string;
    organization?: string;
    lg_focus_areas_comprehensive_list?: string;
  } | null;
  customModuleLabels?: Record<string, string>;
}

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

export function ModuleContentPreview({
  moduleOrder,
  moduleStates,
  moduleSelections,
  allPhrases,
  contactData,
  customModuleLabels = {},
}: ModuleContentPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Filter visible modules based on tri-state
  const visibleModules = useMemo(() => {
    return moduleOrder
      .map((moduleKey, index) => {
        const state = moduleStates[moduleKey];
        // Never → hide from preview
        if (state === 'never') return null;

        const selection = moduleSelections[moduleKey as keyof ModuleSelections];
        const label = customModuleLabels[moduleKey] || MODULE_LABELS[moduleKey];

        // Get selected content
        let content = "";
        
        if (selection) {
          // Single phrase selection
          if (selection.phraseId || selection.greetingId) {
            const phraseId = selection.phraseId || selection.greetingId;
            const phrase = allPhrases.find(p => p.id === phraseId);
            content = phrase?.phrase_text || selection.phraseText || "";
          }
          // Multi-select (should not exist after enforcement, but handle legacy)
          else if (selection.phraseIds && selection.phraseIds.length > 0) {
            const phrases = allPhrases.filter(p => selection.phraseIds!.includes(p.id));
            content = phrases.map(p => p.phrase_text).join(", ");
          }
          // Article
          else if (selection.articleTitle) {
            content = `📄 ${selection.articleTitle}`;
          }
        }

        // Interpolate variables in content
        if (content && contactData) {
          content = interpolateVariables(content, contactData);
        }

        return {
          position: index + 1,
          moduleKey,
          label,
          state,
          content: content || "(No selection)",
          hasSelection: !!content,
        };
      })
      .filter(Boolean);
  }, [moduleOrder, moduleStates, moduleSelections, allPhrases, contactData, customModuleLabels]);

  // Count hidden modules
  const hiddenCount = moduleOrder.filter(key => moduleStates[key] === 'never').length;

  // Display limit
  const displayedModules = showAll ? visibleModules : visibleModules.slice(0, 5);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Live Preview
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {visibleModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No modules to preview</p>
              <p className="text-xs mt-1">All modules are set to "Never"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedModules.map((module: any) => (
                <div
                  key={module.moduleKey}
                  className="p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{module.position}
                      </Badge>
                      <span className="text-sm font-medium">{module.label}</span>
                    </div>
                    <Badge
                      variant={module.state === 'always' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {module.state}
                    </Badge>
                  </div>
                  <p
                    className={`text-sm ${
                      module.hasSelection
                        ? 'text-foreground'
                        : 'text-muted-foreground italic'
                    }`}
                  >
                    {module.content}
                  </p>
                </div>
              ))}

              {/* Expand/Collapse Button */}
              {visibleModules.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      +{visibleModules.length - 5} more modules
                    </>
                  )}
                </Button>
              )}

              {/* Summary */}
              <div className="text-xs text-muted-foreground pt-2 border-t flex items-center justify-between">
                <span>
                  Showing {visibleModules.length} of {moduleOrder.length} modules
                </span>
                {hiddenCount > 0 && (
                  <span className="text-muted-foreground/70">
                    ({hiddenCount} hidden - "Never")
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Interpolate variables in phrase text with contact data
 */
function interpolateVariables(text: string, contactData: any): string {
  let result = text;

  // Replace {first_name}
  if (contactData.first_name) {
    result = result.replace(/\{first_name\}/g, contactData.first_name);
  }

  // Replace {organization}
  if (contactData.organization) {
    result = result.replace(/\{organization\}/g, contactData.organization);
  }

  // Replace {full_name}
  if (contactData.full_name) {
    result = result.replace(/\{full_name\}/g, contactData.full_name);
  }

  return result;
}
