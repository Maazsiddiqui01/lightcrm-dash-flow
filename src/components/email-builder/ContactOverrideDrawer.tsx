import { useState, useEffect } from 'react';
import { Shuffle, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EditableRecipients } from './EditableRecipients';
import { EditableTeam } from './EditableTeam';
import { SubjectPoolSelector } from './SubjectPoolSelector';
import { ModulesCard, getModuleDefaultsFromMaster, MODULE_DEFAULTS } from './ModulesCard';
import type { ContactOverride } from '@/types/groupEmailBuilder';
import type { ModuleSelections } from '@/types/moduleSelections';
import type { ModuleStates } from './ModulesCard';
import type { TeamMember } from './EditableTeam';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';
import type { PhraseLibraryItem } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from '@/hooks/useInquiryLibrary';
import type { MasterTemplate } from '@/lib/router';
import type { TriState } from '@/types/phraseLibrary';
import type { ContactEmailComposer } from '@/types/emailComposer';
import { 
  seededShuffle,
  seededRandom,
  pickRandomPhrase, 
  shuffleModuleOrder, 
  generateSeed,
} from "@/lib/randomization";
import { 
  MODULE_LIBRARY_MAP, 
  PHRASE_DRIVEN_MODULES, 
  SINGLE_SELECT_MODULES, 
  MULTI_SELECT_MODULES,
  type ModuleKey 
} from "@/config/moduleCategoryMap";
import { useToast } from "@/hooks/use-toast";

interface ContactOverrideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactEmail: string;
  sharedSettings: {
    masterTemplate: MasterTemplate | null;
    toneOverride?: 'casual' | 'hybrid' | 'formal';
    lengthOverride?: 'brief' | 'standard' | 'detailed';
    daysSinceContact: number;
    team: TeamMember[];
    to: string;
    cc: string[];
    subjectLinePool: { selectedIds: string[]; style: 'formal' | 'hybrid' | 'casual' };
    moduleSelections: ModuleSelections;
    moduleOrder: Array<keyof ModuleStates>;
    moduleStates: ModuleStates;
  };
  allMasterTemplates: MasterTemplate[];
  allSubjects: SubjectLibraryItem[];
  allPhrases: PhraseLibraryItem[];
  allInquiries: InquiryLibraryItem[];
  currentOverride?: ContactOverride;
  onSave: (override: ContactOverride) => void;
}

export function ContactOverrideDrawer({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
  sharedSettings,
  allMasterTemplates,
  allSubjects,
  allPhrases,
  allInquiries,
  currentOverride,
  onSave,
}: ContactOverrideDrawerProps) {
  const { toast } = useToast();
  
  // State for all 6 tabs
  const [selectedMasterTemplate, setSelectedMasterTemplate] = useState<MasterTemplate | null>(null);
  const [toneOverride, setToneOverride] = useState<'casual' | 'hybrid' | 'formal'>('hybrid');
  const [lengthOverride, setLengthOverride] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [daysSince, setDaysSince] = useState<number>(30);
  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [subjectPool, setSubjectPool] = useState<{ selectedIds: string[]; style: 'formal' | 'hybrid' | 'casual' }>({
    selectedIds: [],
    style: 'hybrid',
  });
  const [moduleSelections, setModuleSelections] = useState<ModuleSelections>({});
  const [moduleOrder, setModuleOrder] = useState<Array<keyof ModuleStates>>([]);
  const [moduleStates, setModuleStates] = useState<ModuleStates>({} as ModuleStates);

  // Randomize handler for per-contact overrides
  const handleRandomizeContact = () => {
    // Validation: Check if phrase libraries are loaded
    if (!allPhrases || allPhrases.length === 0) {
      toast({
        title: "Cannot Randomize",
        description: "Phrase libraries are not loaded yet. Please wait.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: Check if subject pool has selections
    if (!subjectPool.selectedIds || subjectPool.selectedIds.length === 0) {
      toast({
        title: "Cannot Randomize",
        description: "Subject Line Pool must have at least one enabled subject.",
        variant: "destructive",
      });
      return;
    }
    
    const seed = generateSeed(contactId);
    
    // 1. Randomize module order
    const randomizedOrder = shuffleModuleOrder(moduleOrder, seed);
    setModuleOrder(randomizedOrder as Array<keyof ModuleStates>);
    
    // 2. Randomize phrases
    const newSelections: ModuleSelections = { ...moduleSelections };
    
    Object.keys(MODULE_LIBRARY_MAP).forEach((moduleKey) => {
      const category = MODULE_LIBRARY_MAP[moduleKey as ModuleKey];
      const isPhrase = PHRASE_DRIVEN_MODULES.has(moduleKey as ModuleKey);
      
      if (!isPhrase) return;
      
      const categoryPhrases = allPhrases?.filter(p => p.category === category) || [];
      if (categoryPhrases.length === 0) return;
      
      if (SINGLE_SELECT_MODULES.has(moduleKey as ModuleKey)) {
        const randomPhrase = pickRandomPhrase(categoryPhrases, seed + moduleKey.length);
        if (randomPhrase) {
          newSelections[moduleKey as keyof ModuleSelections] = {
            type: 'phrase',
            category,
            phraseId: randomPhrase.id,
            phraseText: randomPhrase.phrase_text,
            defaultPhraseId: newSelections[moduleKey as keyof ModuleSelections]?.defaultPhraseId,
          };
        }
      } else if (MULTI_SELECT_MODULES.has(moduleKey as ModuleKey)) {
        // Multi-select now enforces exactly 1 selection
        const randomPhrase = pickRandomPhrase(categoryPhrases, seed + moduleKey.length);
        
        if (randomPhrase) {
          newSelections[moduleKey as keyof ModuleSelections] = {
            type: 'phrase',
            category,
            phraseId: randomPhrase.id,
            phraseText: randomPhrase.phrase_text,
            defaultPhraseId: newSelections[moduleKey as keyof ModuleSelections]?.defaultPhraseId,
          };
        }
      }
    });
    
    // 3. Randomize primary subject
    if (subjectPool.selectedIds.length > 0) {
      const randomSubjectId = pickRandomPhrase(
        subjectPool.selectedIds.map(id => ({ id })),
        seed + 9999
      )?.id || subjectPool.selectedIds[0];
      
      setSubjectPool({
        ...subjectPool,
        selectedIds: subjectPool.selectedIds,
      });
      
      newSelections.subject_line = {
        ...newSelections.subject_line,
        subjectIds: subjectPool.selectedIds,
        defaultSubjectId: randomSubjectId,
      };
    }
    
    setModuleSelections(newSelections);
    
    toast({
      title: "Randomized",
      description: `Phrases and module order randomized for ${contactName}`,
    });
  };

  // Initialize with current override or shared settings - only when drawer opens
  useEffect(() => {
    if (open) {
      if (currentOverride) {
        // Load from existing override
        const masterFromOverride = allMasterTemplates.find(t => t.master_key === currentOverride.masterTemplate?.key);
        setSelectedMasterTemplate(masterFromOverride || null);
        setToneOverride(currentOverride.coreSettings?.tone || sharedSettings.toneOverride || 'hybrid');
        setLengthOverride(currentOverride.coreSettings?.length || sharedSettings.lengthOverride || 'standard');
        setDaysSince(currentOverride.coreSettings?.daysSince ?? sharedSettings.daysSinceContact);
        setTo(currentOverride.recipients?.to || contactEmail);
        setCc(currentOverride.recipients?.cc || []);
        setTeam(currentOverride.team || sharedSettings.team);
        setSubjectPool(currentOverride.subjectLinePool || sharedSettings.subjectLinePool);
        setModuleSelections(currentOverride.moduleSelections || {});
        setModuleOrder((currentOverride.moduleOrder || sharedSettings.moduleOrder) as any); // Load contact-specific order
        setModuleStates(sharedSettings.moduleStates);
      } else {
        // Load from shared settings
        const masterFromShared = allMasterTemplates.find(t => t.master_key === sharedSettings.masterTemplate.master_key);
        setSelectedMasterTemplate(masterFromShared || null);
        setToneOverride(sharedSettings.toneOverride || 'hybrid');
        setLengthOverride(sharedSettings.lengthOverride || 'standard');
        setDaysSince(sharedSettings.daysSinceContact);
        setTo(contactEmail);
        setCc(sharedSettings.cc);
        setTeam(sharedSettings.team);
        setSubjectPool(sharedSettings.subjectLinePool);
        setModuleSelections({});
        setModuleOrder(sharedSettings.moduleOrder);
        setModuleStates(sharedSettings.moduleStates);
      }
    }
  }, [open, contactId, contactEmail]); // Add contactId and contactEmail to re-initialize when switching contacts

  const handleSave = () => {
    const override: ContactOverride = {
      contactId,
      recipients: { to, cc },
      masterTemplate: selectedMasterTemplate
        ? {
            id: selectedMasterTemplate.master_key,
            key: selectedMasterTemplate.master_key,
            name: selectedMasterTemplate.master_key.replace(/_/g, ' '),
          }
        : undefined,
      coreSettings: {
        tone: toneOverride,
        length: lengthOverride,
        daysSince: daysSince,
      },
      subjectLinePool: subjectPool,
      moduleSelections,
      moduleOrder: moduleOrder.length > 0 ? moduleOrder as string[] : undefined, // Save module order
      team,
    };
    onSave(override);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Customize for {contactName}</SheetTitle>
              <SheetDescription>
                Override shared settings for this specific contact
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomizeContact}
              className="flex items-center gap-2"
              title="Randomize phrases and module order for this contact only"
            >
              <Shuffle className="h-4 w-4" />
              Randomize
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="recipients" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="master">Master</TabsTrigger>
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="subject">Subject</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          {/* Tab 1: Master Template */}
          <TabsContent value="master" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited:</strong> {sharedSettings.masterTemplate?.master_key.replace(/_/g, ' ') || 'None'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Master Template</Label>
              <Select
                value={selectedMasterTemplate?.master_key || ''}
                onValueChange={(value) => {
                  const template = allMasterTemplates.find(t => t.master_key === value);
                  setSelectedMasterTemplate(template || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {allMasterTemplates.map((template) => (
                    <SelectItem key={template.master_key} value={template.master_key}>
                      {template.master_key.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Tab 2: Core Settings */}
          <TabsContent value="core" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited:</strong> Tone: {sharedSettings.toneOverride || 'hybrid'}, 
                Length: {sharedSettings.lengthOverride || 'standard'}, 
                Days: {sharedSettings.daysSinceContact}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Tone Override</Label>
              <Select value={toneOverride} onValueChange={(v) => setToneOverride(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Length Override</Label>
              <Select value={lengthOverride} onValueChange={(v) => setLengthOverride(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Days Since Contact</Label>
              <Input
                type="number"
                value={daysSince}
                onChange={(e) => setDaysSince(parseInt(e.target.value) || 30)}
                min={0}
              />
            </div>
          </TabsContent>

          {/* Tab 3: Subject Line */}
          <TabsContent value="subject" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited from shared settings:</strong>
              </p>
              <p>Style: {sharedSettings.subjectLinePool.style}</p>
              <p>Subjects: {sharedSettings.subjectLinePool.selectedIds.length} selected</p>
            </div>
            
            <SubjectPoolSelector
              allSubjects={allSubjects}
              currentSelection={{
                subjectIds: subjectPool.selectedIds,
                style: subjectPool.style,
              }}
              toneOverride={subjectPool.style}
              onSelectionChange={(selection) => setSubjectPool({
                selectedIds: selection.subjectIds || [],
                style: selection.style || 'hybrid',
              })}
            />
          </TabsContent>

          {/* Tab 4: Email Modules */}
          <TabsContent value="modules" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited:</strong> {sharedSettings.moduleOrder.length} modules configured
              </p>
            </div>
            
            {selectedMasterTemplate && (
              <ModulesCard
                masterTemplate={selectedMasterTemplate}
                moduleStates={moduleStates}
                moduleOrder={moduleOrder}
                onModuleChange={(module, value) => setModuleStates(prev => ({ ...prev, [module]: value }))}
                onModuleOrderChange={setModuleOrder}
                onResetToDefaults={() => {
                  const defaults = getModuleDefaultsFromMaster(selectedMasterTemplate.master_key, allMasterTemplates);
                  if (defaults) setModuleStates(defaults);
                }}
                moduleSelections={moduleSelections}
                onModuleSelectionChange={(module, selection) => {
                  setModuleSelections(prev => ({ ...prev, [module]: selection }));
                }}
                contactData={null}
                allPhrases={allPhrases}
                allInquiries={allInquiries}
                allSubjects={allSubjects}
                toneOverride={toneOverride}
              />
            )}
          </TabsContent>

          {/* Tab 5: Recipients */}
          <TabsContent value="recipients" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited from shared settings:</strong>
              </p>
              <p>TO: {sharedSettings.to}</p>
              <p>CC: {sharedSettings.cc.join(', ') || 'None'}</p>
            </div>
            
            <EditableRecipients
              to={to}
              cc={cc}
              onToChange={setTo}
              onCcChange={setCc}
              teamMembers={team}
              defaultContactEmail={contactEmail}
            />
          </TabsContent>

          {/* Tab 6: Team */}
          <TabsContent value="team" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited:</strong> {sharedSettings.team.length} team members
              </p>
            </div>
            
            <EditableTeam
              members={team}
              onMembersChange={setTeam}
              contactEmail={contactEmail}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Override
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
