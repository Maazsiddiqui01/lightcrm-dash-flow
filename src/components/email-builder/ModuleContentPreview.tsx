import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronUp, Mail, AlertCircle } from "lucide-react";
import type { ModuleSelections } from "@/types/moduleSelections";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { TriState } from "@/types/phraseLibrary";
import type { ContactEmailComposer, Opportunity } from "@/types/emailComposer";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import { interpolateContent } from "@/lib/contentInterpolation";

interface ModuleStates {
  initial_greeting: TriState;
  self_personalization: TriState;
  article_recommendations: TriState;
  top_opportunities: TriState;
  platforms: TriState;
  suggested_talking_points: TriState;
  addons: TriState;
  general_org_update: TriState;
  meeting_request: TriState;
}

interface ModuleContentPreviewProps {
  moduleOrder: Array<keyof ModuleStates>;
  moduleStates: ModuleStates;
  moduleSelections: ModuleSelections;
  allPhrases: PhraseLibraryItem[];
  contactData: ContactEmailComposer | null;
  customModuleLabels?: Record<string, string>;
  selectedSubjects?: string[];
  allSubjects?: SubjectLibraryItem[];
}

const MODULE_LABELS: Record<keyof ModuleStates, string> = {
  initial_greeting: "Greeting Line",
  self_personalization: "Courtesy Openers",
  article_recommendations: "Article Recommendations",
  top_opportunities: "Follow up re Active Opportunities",
  platforms: "Focus Area/New Platforms",
  suggested_talking_points: "Focus Area Rationale",
  addons: "Add-on Investments/Existing Platforms",
  general_org_update: "General Org Update",
  meeting_request: "Meeting Request",
};

export function ModuleContentPreview({
  moduleOrder,
  moduleStates,
  moduleSelections,
  allPhrases,
  contactData,
  customModuleLabels = {},
  selectedSubjects = [],
  allSubjects = [],
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

        // Interpolate variables in content using unified function
        if (content && contactData) {
          content = interpolateContent(content, contactData, contactData.opps, contactData.fa_descriptions);
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
        <CardContent className="space-y-4">
          {/* Subject Line Preview */}
          {selectedSubjects.length > 0 ? (
            <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Subject Line Pool</span>
                <Badge variant="outline" className="text-xs">
                  {selectedSubjects.length} enabled
                </Badge>
              </div>
              <div className="space-y-2">
                {selectedSubjects.slice(0, 3).map((subjectId) => {
                  const subject = allSubjects.find((s) => s.id === subjectId);
                  if (!subject) return null;

                  const interpolatedSubject = contactData
                    ? interpolateContent(subject.subject_template, contactData, contactData.opps, contactData.fa_descriptions)
                    : subject.subject_template;

                  return (
                    <div key={subjectId} className="text-sm text-foreground/90">
                      • {interpolatedSubject}
                    </div>
                  );
                })}
                {selectedSubjects.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{selectedSubjects.length - 3} more subjects
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-destructive/5 rounded-lg border-2 border-destructive/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  No subject lines enabled
                </span>
              </div>
            </div>
          )}

          {/* Module Content Preview */}
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

