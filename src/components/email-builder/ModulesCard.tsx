import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Settings } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { MasterTemplate } from "@/lib/router";
import { DraggableModuleItem } from './DraggableModuleItem';
import { ModuleConfigDrawer } from './ModuleConfigDrawer';
import { SubjectLinePoolCard } from './SubjectLinePoolCard';
import type { TriState } from "@/types/phraseLibrary";
import type { ContactEmailComposer } from "@/types/emailComposer";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { InquiryLibraryItem } from "@/hooks/useInquiryLibrary";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import type { ModuleSelection, ModuleSelections } from "@/types/moduleSelections";
import { recomputePositions, announceModuleMove } from "@/lib/modulePositions";

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
  moduleOrder: Array<keyof ModuleStates>;
  onModuleChange: (module: keyof ModuleStates, value: TriState) => void;
  onModuleOrderChange: (newOrder: Array<keyof ModuleStates>) => void;
  onResetToDefaults: () => void;
  moduleSelections: ModuleSelections;
  onModuleSelectionChange: (module: keyof ModuleStates | 'subject_line_pool', selection: ModuleSelection | null) => void;
  contactData: ContactEmailComposer | null;
  allPhrases: PhraseLibraryItem[];
  allInquiries: InquiryLibraryItem[];
  allSubjects: SubjectLibraryItem[];
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
  customModuleLabels?: Record<string, string>;
  onCustomModuleLabelChange?: (moduleKey: string, newLabel: string) => void;
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

// Modules that have configuration drawers
const CONFIGURABLE_MODULES: Set<keyof ModuleStates> = new Set([
  'initial_greeting',
  'self_personalization',
  'top_opportunities',
  'article_recommendations',
  'platforms',
  'addons',
  'suggested_talking_points',
  'general_org_update',
  'attachments',
  'meeting_request',
  'ai_backup_personalization',
]);

export function ModulesCard({
  masterTemplate,
  moduleStates,
  moduleOrder,
  onModuleChange,
  onModuleOrderChange,
  onResetToDefaults,
  moduleSelections,
  onModuleSelectionChange,
  contactData,
  allPhrases,
  allInquiries,
  allSubjects,
  toneOverride,
  customModuleLabels = {},
  onCustomModuleLabelChange,
}: ModulesCardProps) {
  const [activeDrawer, setActiveDrawer] = useState<keyof ModuleStates | 'subject_line_pool' | null>(null);
  // Drag-and-drop sensors with accessibility
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenDrawer = (moduleKey: keyof ModuleStates | 'subject_line_pool') => {
    setActiveDrawer(moduleKey);
  };

  const handleCloseDrawer = () => {
    setActiveDrawer(null);
  };

  const handleSaveSelection = (selection: ModuleSelection | null) => {
    if (activeDrawer) {
      onModuleSelectionChange(activeDrawer, selection);
    }
    setActiveDrawer(null);
  };

  const getSelectedItemsCount = (moduleKey: keyof ModuleStates | 'subject_line_pool'): number => {
    const selection = moduleSelections[moduleKey as keyof ModuleSelections];
    if (!selection) return 0;

    // Handle phrase-based single selections
    if (selection.phraseId) return 1;
    if (selection.greetingId) return 1;
    
    // Handle article selection
    if (selection.articleId) return 1;
    
    // Handle multi-select
    if (selection.phraseIds) return selection.phraseIds.length;
    if (selection.subjectIds) return selection.subjectIds.length;
    
    return 0;
  };
  
  const getSelectionSummary = (moduleKey: keyof ModuleStates | 'subject_line_pool'): string | null => {
    const selection = moduleSelections[moduleKey as keyof ModuleSelections];
    if (!selection) return null;

    // Single phrase selection
    if (selection.phraseText) {
      return selection.phraseText.length > 40 
        ? selection.phraseText.substring(0, 40) + '...' 
        : selection.phraseText;
    }
    
    // Legacy greeting
    if (selection.greetingId) {
      const greeting = allPhrases.find(p => p.id === selection.greetingId);
      if (greeting) {
        return greeting.phrase_text.length > 40 
          ? greeting.phrase_text.substring(0, 40) + '...' 
          : greeting.phrase_text;
      }
    }
    
    // Multi-select
    if (selection.phraseIds && selection.phraseIds.length > 0) {
      return `${selection.phraseIds.length} phrase${selection.phraseIds.length !== 1 ? 's' : ''} selected`;
    }
    
    // Article
    if (selection.articleTitle) {
      return selection.articleTitle.length > 40
        ? selection.articleTitle.substring(0, 40) + '...'
        : selection.articleTitle;
    }
    
    // Subject pool
    if (selection.subjectIds && selection.subjectIds.length > 0) {
      return `${selection.subjectIds.length} subject${selection.subjectIds.length !== 1 ? 's' : ''} selected`;
    }
    
    return null;
  };
  
  // Get subject pool data for preview
  const subjectPoolSelection = moduleSelections.subject_line_pool;
  const selectedSubjectIds = subjectPoolSelection?.subjectIds || [];
  const selectedSubjects = allSubjects.filter(s => selectedSubjectIds.includes(s.id));
  const previewSubjects = selectedSubjects.map(s => s.subject_template);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = moduleOrder.indexOf(active.id as keyof ModuleStates);
      const newIndex = moduleOrder.indexOf(over.id as keyof ModuleStates);

      // Use arrayMove and recompute positions to ensure 1..N contiguity
      const movedOrder = arrayMove(moduleOrder, oldIndex, newIndex);
      const validOrder = recomputePositions(movedOrder);
      onModuleOrderChange(validOrder as Array<keyof ModuleStates>);

      // Announce to screen readers
      const announcement = announceModuleMove(active.id as string, newIndex + 1);
      announceToScreenReader(announcement);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Email Modules
            {masterTemplate && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Drag to Reorder
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetToDefaults}
            disabled={!masterTemplate}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!masterTemplate && (
          <div className="text-center py-4 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a contact to configure modules</p>
          </div>
        )}

        {masterTemplate && (
          <>
            {/* Initial Module (Always On) */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Initial Module (Always On)
              </h3>
              <SubjectLinePoolCard
                selectedCount={selectedSubjectIds.length}
                totalCount={allSubjects.length}
                previewItems={previewSubjects}
                onConfigure={() => handleOpenDrawer('subject_line_pool')}
              />
            </div>

            {/* Content Modules */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Content Modules
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext
                  items={moduleOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2" role="list" aria-label="Email modules">
                    {moduleOrder.map((moduleKey, index) => (
                      <DraggableModuleItem
                        key={moduleKey}
                        id={moduleKey}
                        index={index}
                        label={customModuleLabels[moduleKey] || MODULE_LABELS[moduleKey]}
                        value={moduleStates[moduleKey]}
                        isDisabled={false}
                        onChange={(value) => onModuleChange(moduleKey, value)}
                        hasConfiguration={CONFIGURABLE_MODULES.has(moduleKey)}
                        onConfigure={() => handleOpenDrawer(moduleKey)}
                        selectedItemsCount={getSelectedItemsCount(moduleKey)}
                        onLabelChange={onCustomModuleLabelChange ? (newLabel) => onCustomModuleLabelChange(moduleKey, newLabel) : undefined}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </>
        )}

        {/* Live Region for Screen Reader Announcements */}
        <div
          id="module-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {masterTemplate && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Current master: {masterTemplate.master_key.replace(/_/g, ' ')}
          </div>
        )}
      </CardContent>

      {/* Module Configuration Drawer */}
      {activeDrawer && (
        <ModuleConfigDrawer
          isOpen={true}
          onClose={handleCloseDrawer}
          moduleKey={activeDrawer === 'subject_line_pool' ? 'initial_greeting' : activeDrawer}
          moduleLabel={activeDrawer === 'subject_line_pool' ? 'Subject Line Pool' : MODULE_LABELS[activeDrawer]}
          contactData={contactData}
          currentSelection={moduleSelections[activeDrawer as keyof ModuleSelections] || null}
          onSave={handleSaveSelection}
          allPhrases={allPhrases}
          allInquiries={allInquiries}
          allSubjects={allSubjects}
          toneOverride={toneOverride}
          isSubjectPool={activeDrawer === 'subject_line_pool'}
        />
      )}
    </Card>
  );
}

// Helper function for screen reader announcements
function announceToScreenReader(message: string) {
  const announcer = document.getElementById('module-announcer');
  if (announcer) {
    announcer.textContent = message;
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}