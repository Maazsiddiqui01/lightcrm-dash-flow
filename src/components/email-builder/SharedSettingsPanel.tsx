import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shuffle, RotateCcw, AlertCircle } from "lucide-react";
import { CompactMasterTemplateSelector } from "./CompactMasterTemplateSelector";
import { CompactCoreSettings } from "./CompactCoreSettings";
import { ModulesCard, type ModuleStates } from "./ModulesCard";
import { SubjectPoolSummary } from "./SubjectPoolSummary";
import { SubjectPoolDialog } from "./SubjectPoolDialog";
import { EditableTeam } from "./EditableTeam";
import { EditableRecipients } from "./EditableRecipients";
import type { ModuleSelections, ModuleSelection } from "@/types/moduleSelections";
import type { TriState } from "@/types/phraseLibrary";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { InquiryLibraryItem } from "@/hooks/useInquiryLibrary";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import type { TeamMember } from "@/components/email-builder/EditableTeam";

interface SharedSettingsPanelProps {
  // Master Template
  masterTemplateKey: string | null;
  masterTemplate: any; // MasterTemplate object
  onMasterTemplateChange: (masterKey: string) => void;
  
  // Core Settings
  daysSinceContact: number;
  onDaysSinceContactChange: (days: number) => void;
  toneOverride: 'casual' | 'hybrid' | 'formal' | null;
  onToneOverrideChange: (tone: 'casual' | 'hybrid' | 'formal' | null) => void;
  lengthOverride: 'brief' | 'standard' | 'detailed' | null;
  onLengthOverrideChange: (length: 'brief' | 'standard' | 'detailed' | null) => void;
  
  // Modules
  moduleStates: ModuleStates;
  moduleOrder: Array<keyof ModuleStates>;
  moduleSelections: ModuleSelections;
  onModuleChange: (module: keyof ModuleStates, value: TriState) => void;
  onModuleOrderChange: (newOrder: Array<keyof ModuleStates>) => void;
  onModuleSelectionChange: (module: keyof ModuleStates, selection: ModuleSelection | null) => void;
  onResetToDefaults: () => void;
  
  // Libraries
  allPhrases: PhraseLibraryItem[];
  allInquiries: InquiryLibraryItem[];
  allSubjects: SubjectLibraryItem[];
  
  // Subject Pool
  subjectPoolOverride: string[];
  onSubjectPoolChange: (ids: string[]) => void;
  
  // Team
  team: TeamMember[];
  onTeamChange: (team: TeamMember[]) => void;
  cc: string[];
  onCcChange: (cc: string[]) => void;
  
  // Randomization
  onRandomize: () => void;
  onRestoreToDefault: () => void;
  isRandomized: boolean;
  changedModules: Set<string>;
  
  // Custom Labels
  customModuleLabels: Record<string, string>;
  onCustomModuleLabelChange: (moduleKey: string, newLabel: string) => void;
  
  // UI State
  selectedContactCount: number;
  defaultOpen?: boolean;
  
  // Save handler for group mode
  onSaveSharedSettings?: () => void;
}

export function SharedSettingsPanel({
  masterTemplateKey,
  masterTemplate,
  onMasterTemplateChange,
  daysSinceContact,
  onDaysSinceContactChange,
  toneOverride,
  onToneOverrideChange,
  lengthOverride,
  onLengthOverrideChange,
  moduleStates,
  moduleOrder,
  moduleSelections,
  onModuleChange,
  onModuleOrderChange,
  onModuleSelectionChange,
  onResetToDefaults,
  allPhrases,
  allInquiries,
  allSubjects,
  subjectPoolOverride,
  onSubjectPoolChange,
  team,
  onTeamChange,
  cc,
  onCcChange,
  onRandomize,
  onRestoreToDefault,
  isRandomized,
  changedModules,
  customModuleLabels,
  onCustomModuleLabelChange,
  selectedContactCount,
  defaultOpen = true,
  onSaveSharedSettings,
}: SharedSettingsPanelProps) {
  const [subjectPoolDialogOpen, setSubjectPoolDialogOpen] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>(defaultOpen ? "settings" : "");

  const isDisabled = selectedContactCount === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shared Settings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure defaults for all {selectedContactCount} selected contact{selectedContactCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedContactCount > 0 && (
                <>
                  {onSaveSharedSettings && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onSaveSharedSettings}
                      className="flex items-center gap-2"
                      title="Save settings to all selected contacts"
                    >
                      Save Settings
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRandomize}
                    className="flex items-center gap-2"
                    title="Randomize shared phrases and module order"
                  >
                    <Shuffle className="h-4 w-4" />
                    Randomize
                  </Button>
                  {isRandomized && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRestoreToDefault}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Randomization indicator */}
          {isRandomized && (
            <div className="mt-3">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Shuffle className="h-3 w-3 mr-1" />
                Randomized ({changedModules.size} changes)
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Warning when no contacts selected */}
          {selectedContactCount === 0 && (
            <Alert variant="default" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select contacts from the table below to configure shared settings
              </AlertDescription>
            </Alert>
          )}

          <Accordion 
            type="single" 
            collapsible 
            value={accordionValue}
            onValueChange={setAccordionValue}
          >
            <AccordionItem value="settings">
              <AccordionTrigger>
                Configuration Settings
                {accordionValue !== "settings" && masterTemplateKey && (
                  <Badge variant="outline" className="ml-2">
                    {masterTemplateKey}
                  </Badge>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-2">
                  {/* Master Template */}
                  <CompactMasterTemplateSelector
                    value={masterTemplateKey}
                    onChange={onMasterTemplateChange}
                    disabled={isDisabled}
                  />

                  {/* Core Settings */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Core Settings</h4>
                    <CompactCoreSettings
                      tone={toneOverride}
                      length={lengthOverride}
                      daysSince={daysSinceContact}
                      onToneChange={onToneOverrideChange}
                      onLengthChange={onLengthOverrideChange}
                      onDaysSinceChange={onDaysSinceContactChange}
                      disabled={isDisabled}
                    />
                  </div>

                  {/* Modules Card */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Content Modules</h4>
                    <ModulesCard
                      masterTemplate={masterTemplate}
                      moduleStates={moduleStates}
                      moduleOrder={moduleOrder}
                      moduleSelections={moduleSelections}
                      onModuleChange={onModuleChange}
                      onModuleOrderChange={onModuleOrderChange}
                      onModuleSelectionChange={onModuleSelectionChange}
                      onResetToDefaults={onResetToDefaults}
                      contactData={null}
                      allPhrases={allPhrases}
                      allInquiries={allInquiries}
                      allSubjects={allSubjects}
                      toneOverride={toneOverride}
                      customModuleLabels={customModuleLabels}
                      onCustomModuleLabelChange={onCustomModuleLabelChange}
                      onRandomize={onRandomize}
                      onRestoreToDefault={onRestoreToDefault}
                      isRandomized={isRandomized}
                      changedModules={changedModules}
                    />
                  </div>

                  {/* Subject Pool */}
                  <SubjectPoolSummary
                    selectedCount={subjectPoolOverride.length}
                    style={toneOverride || 'hybrid'}
                    onConfigure={() => setSubjectPoolDialogOpen(true)}
                    disabled={isDisabled}
                  />

                  {/* Team Members */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Team Members (Shared)</h4>
                    <EditableTeam
                      members={team}
                      onMembersChange={onTeamChange}
                    />
                  </div>

                  {/* CC Recipients */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">CC Recipients (Shared)</h4>
                    <div className="text-sm text-muted-foreground">
                      {cc.length === 0 ? (
                        <p>No CC recipients configured</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cc.map(email => (
                            <Badge key={email} variant="secondary">{email}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Subject Pool Dialog */}
      <SubjectPoolDialog
        open={subjectPoolDialogOpen}
        onOpenChange={setSubjectPoolDialogOpen}
        allSubjects={allSubjects}
        currentSelection={moduleSelections.subject_line || null}
        onSelectionChange={(selection) => {
          onModuleSelectionChange('subject_line', selection);
        }}
        toneOverride={toneOverride}
      />
    </>
  );
}
