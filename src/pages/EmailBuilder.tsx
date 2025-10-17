import { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { useRealtimeLibrarySync } from "@/hooks/useRealtimeSync";
import { EmailBuilderErrorBoundary } from "@/components/email-builder/EmailBuilderErrorBoundary";
import { ContactSelector } from "@/components/email-builder/ContactSelector";
import { ContactInfoPanel } from "@/components/email-builder/ContactInfoPanel";
import { ModeSwitcher } from "@/components/email-builder/ModeSwitcher";
import { KeyboardShortcutsModal } from "@/components/email-builder/KeyboardShortcutsModal";
import { SharedSettingsPanel } from "@/components/email-builder/SharedSettingsPanel";
import { GroupFilterBar } from "@/components/email-builder/GroupFilterBar";
import { GroupResultsTable } from "@/components/email-builder/GroupResultsTable";
import { SelectionTray } from "@/components/email-builder/SelectionTray";
import { ContactOverrideDrawer } from "@/components/email-builder/ContactOverrideDrawer";
import { QueueDialog } from "@/components/email-builder/QueueDialog";
import { useBatchQueueManager } from "@/hooks/useBatchQueueManager";
import { buildBatchPayload } from "@/lib/batchPayloadBuilder";
import type { FilterValues, ContactOverride } from "@/types/groupEmailBuilder";
import { MasterTemplateSelector } from "@/components/email-builder/MasterTemplateSelector";
import { EmailBuilderCoreSettings } from "@/components/email-builder/EmailBuilderCoreSettings";
import { ModulesCard, type ModuleStates, MODULE_DEFAULTS, getModuleDefaultsFromMaster } from "@/components/email-builder/ModulesCard";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";
import { ArticlePicker } from "@/components/email-builder/ArticlePicker";
import { EditableRecipients } from "@/components/email-builder/EditableRecipients";
import { EnhancedDraftSection } from "@/components/email-builder/EnhancedDraftSection";
import { PreviewModal } from "@/components/email-builder/PreviewModal";
import { PreviewPanel } from "@/components/email-builder/PreviewPanel";
import { GroupContactAlert } from "@/components/email-builder/GroupContactAlert";
import { IndividualContactAlert } from "@/components/email-builder/IndividualContactAlert";
import { OrganizationLevelAlert } from "@/components/email-builder/OrganizationLevelAlert";
import { mergeEffectiveConfig } from "@/lib/previewMerge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Save, RotateCcw, Shuffle, Dice5 } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useContactGroupInfo } from "@/hooks/useContactGroupInfo";
import { useOrganizationContext } from "@/hooks/useOrganizationContext";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import { useComposerRow } from "@/hooks/useComposer";
import { useContactSettings } from "@/hooks/useContactSettings";
import { useEnhancedDraftGenerator } from "@/hooks/useEnhancedDraftGenerator";
import { useGlobalPhrases } from "@/hooks/usePhraseLibrary";
import { useGlobalInquiries } from "@/hooks/useInquiryLibrary";
import { useSubjectLibrary } from "@/hooks/useSubjectLibrary";
import { useAutoSelectPhrases } from "@/hooks/useAutoSelectPhrases";
import { buildEnhancedDraftPayload } from "@/lib/enhancedPayload";
import { routeMaster } from "@/lib/router";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";
import { useEmailTemplatesQuery } from "@/hooks/useEmailTemplates";
import type { Article } from "@/types/emailComposer";
import type { TriState } from "@/types/phraseLibrary";
import type { ModuleSelection, ModuleSelections } from "@/types/moduleSelections";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@/components/email-builder/EditableTeam";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveSettings } from "@/hooks/useEffectiveSettings";
import { useSaveSettingsWithOCC } from "@/hooks/useSaveSettingsWithOCC";
import { SplitSaveButton } from "@/components/email-builder/SplitSaveButton";
import { SourceBadge } from "@/components/email-builder/SourceBadge";
import { ConfirmSaveDialog, type SaveScope, type AffectedField } from "@/components/email-builder/ConfirmSaveDialog";
import { ModuleContentPreview } from "@/components/email-builder/ModuleContentPreview";
import { MASTER_TEMPLATES } from "@/lib/router";
import { recomputePositions, buildModuleSequence, announceModuleMove } from "@/lib/modulePositions";
import { validateDraftPayload, validateSubjectPool, validateTemplateId, validateModuleSelections } from "@/lib/emailBuilderValidation";
import { validateModuleSelections as validateModuleSelectionsAgainstLibrary } from "@/lib/moduleSelectionValidation";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useDebounce } from "@/hooks/useDebounce";
import { useAutoSaveModuleLabels } from '@/hooks/useAutoSaveModuleLabels';
import { useNewTemplateSettings } from '@/hooks/useNewTemplateSettings';
import { DEFAULT_MODULE_ORDER } from '@/config/moduleDefaults';
import { 
  seededShuffle,
  seededRandom,
  pickRandomPhrase, 
  shuffleModuleOrder, 
  generateSeed,
  PINNED_TOP_KEYS,
  PINNED_BOTTOM_KEYS,
} from "@/lib/randomization";
import { 
  MODULE_LIBRARY_MAP, 
  PHRASE_DRIVEN_MODULES, 
  SINGLE_SELECT_MODULES, 
  MULTI_SELECT_MODULES,
  type ModuleKey 
} from "@/config/moduleCategoryMap";
import {
  useSaveContactModuleDefaults,
  useSaveTemplateModuleDefaults,
} from "@/hooks/useDefaultsPersistence";

function EmailBuilderContent() {
  // Enable real-time synchronization with Global Libraries
  useRealtimeLibrarySync();
  
  const { toast } = useToast();
  
  // Mode state
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  
  // UI state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [changedModules, setChangedModules] = useState<Set<string>>(new Set());
  
  // Individual mode state
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [deltaType, setDeltaType] = useState<'Email' | 'Meeting'>('Email');
  
  // Group mode state
  const [groupFilters, setGroupFilters] = useState<FilterValues>({});
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactOverrides, setContactOverrides] = useState<Map<string, ContactOverride>>(new Map());
  const [overrideDrawerOpen, setOverrideDrawerOpen] = useState(false);
  const [activeOverrideContactId, setActiveOverrideContactId] = useState<string>('');
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null); // Track focused contact for preview
  
  // Queue management for Group mode
  const queueManager = useBatchQueueManager();
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Core Settings state
  const [daysSinceContact, setDaysSinceContact] = useState<number>(0);
  const [toneOverride, setToneOverride] = useState<'casual' | 'hybrid' | 'formal' | null>(null);
  const [lengthOverride, setLengthOverride] = useState<'brief' | 'standard' | 'detailed' | null>(null);
  const [subjectPoolOverride, setSubjectPoolOverride] = useState<string[]>([]);
  const [groupMasterTemplateKey, setGroupMasterTemplateKey] = useState<string | null>(null);
  
  // Module states for email builder
  const [moduleStates, setModuleStates] = useState<ModuleStates>({
    subject_line: 'always',
    initial_greeting: 'always',
    self_personalization: 'always',
    article_recommendations: 'sometimes',
    top_opportunities: 'sometimes',
    platforms: 'always',
    suggested_talking_points: 'always',
    addons: 'always',
    general_org_update: 'always',
    meeting_request: 'sometimes',
    closing_line: 'sometimes',
  });
  
  // Module order state
  const [moduleOrder, setModuleOrder] = useState<Array<keyof ModuleStates>>([
    'subject_line',
    'initial_greeting',
    'self_personalization',
    'article_recommendations',
    'top_opportunities',
    'platforms',
    'suggested_talking_points',
    'addons',
    'general_org_update',
    'meeting_request',
    'closing_line',
  ]);
  
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null); // Deprecated - keep for backward compat
  const [selectedArticleForContext, setSelectedArticleForContext] = useState<Article | null>(null); // Article selected for interpolation into phrase templates
  
  // Module selections state
  const [moduleSelections, setModuleSelections] = useState<ModuleSelections>({});
  
  // Randomization state
  const [isRandomized, setIsRandomized] = useState(false);
  const [defaultsSnapshot, setDefaultsSnapshot] = useState<{
    order: Array<keyof ModuleStates>;
    moduleSelections: ModuleSelections;
    subjectPrimaryId: string | null;
  } | null>(null);
  const [randomizationSeed, setRandomizationSeed] = useState<number | null>(null);
  const [makeRandomizedDefaults, setMakeRandomizedDefaults] = useState(false);
  
  // Custom module labels - now loaded from global template settings
  const [customModuleLabels, setCustomModuleLabels] = useState<Record<string, string>>({});
  
  // Manual save flag to prevent auto-save race conditions
  const [isManualSaving, setIsManualSaving] = useState(false);
  
  // Defaults persistence hooks
  const saveContactModuleDefaults = useSaveContactModuleDefaults();
  const saveTemplateModuleDefaults = useSaveTemplateModuleDefaults();
  
  // Curated team and recipients state
  const [curatedTeam, setCuratedTeam] = useState<TeamMember[]>([]);
  const [curatedTo, setCuratedTo] = useState<string>("");
  const [curatedCc, setCuratedCc] = useState<string[]>([]);
  const [autoTeam, setAutoTeam] = useState<TeamMember[]>([]);
  
  // Get contact data from new composer view
  const { data: contactData } = useComposerRow(selectedContact?.email || null);
  
  // Get group contact info from contacts_raw
  const { data: groupInfo } = useContactGroupInfo(selectedContact?.contact_id || null);
  
  // Organization context for alerts
  const emailDomain = selectedContact?.email 
    ? selectedContact.email.split('@')[1] 
    : null;

  const orgContext = useOrganizationContext(
    selectedContact?.contact_id || null,
    contactData?.organization || null,
    emailDomain
  );
  
  // Load library data
  const { data: allPhrases = [] } = useGlobalPhrases();
  const { data: allInquiries = [] } = useGlobalInquiries();
  const { data: allSubjects = [] } = useSubjectLibrary();
  
  // Enhanced draft generator
  const {
    generateDraft,
    isGenerating,
    progress,
    streamedContent,
  } = useEnhancedDraftGenerator();
  
  const [draftResult, setDraftResult] = useState<any | null>(null);
  
  // Preview refresh key for manual refresh
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  
  // Module validation errors state
  const [moduleValidationErrors, setModuleValidationErrors] = useState<string[]>([]);
  
  // ARIA live region for module reorder announcements
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');
  
  // Auto-set days since contact when contact changes
  useEffect(() => {
    if (contactData?.most_recent_contact) {
      const days = Math.floor(
        (Date.now() - new Date(contactData.most_recent_contact).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysSinceContact(days);
    }
  }, [contactData?.most_recent_contact]);
  
  // Sync subject line selection to subjectPoolOverride - UNIFIED for Individual & Group modes
  useEffect(() => {
    const selection = moduleSelections.subject_line;
    
    if (selection?.phraseId) {
      // Individual mode: single-select via phraseId
      setSubjectPoolOverride([selection.phraseId]);
    } else if (selection?.subjectIds) {
      // Group mode: pool with multiple IDs
      setSubjectPoolOverride(selection.subjectIds);
    } else {
      setSubjectPoolOverride([]);
    }
  }, [moduleSelections.subject_line]);
  
  // FIX #8: Memoize module validation to avoid unnecessary reruns
  const moduleValidationResult = useMemo(() => {
    return validateModuleSelections(moduleStates, moduleSelections);
  }, [moduleStates, moduleSelections]);
  
  // Update validation errors state when memoized result changes
  useEffect(() => {
    setModuleValidationErrors(moduleValidationResult.errors);
  }, [moduleValidationResult]);
  
  // Dev-only debug log for subject pool sync
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('📋 Subject Line Sync:', {
        subjectPoolOverride: subjectPoolOverride.length,
        moduleSelections: moduleSelections.subject_line?.subjectIds?.length || 0,
      });
    }
  }, [subjectPoolOverride, moduleSelections.subject_line]);
  
  // Auto-set module defaults when master template changes
  const masterTemplate = contactData ? routeMaster(contactData.most_recent_contact) : null;
  
  // Load and save contact-specific settings for individual mode
  const {
    settings: contactSettings,
    isLoading: isLoadingSettings,
    saveSettings,
    isSaving,
    resetSettings,
    isResetting,
  } = useContactSettings(selectedContact?.contact_id || null);
  const [initializedContactId, setInitializedContactId] = useState<string | null>(null);
  
  // Load settings for focused contact in group mode
  const {
    settings: groupContactSettings,
    isLoading: isLoadingGroupSettings,
  } = useContactSettings(
    mode === 'group' && focusedContactId ? focusedContactId : null
  );
  
  // Dual-scope save functionality with OCC
  const { saveContact, saveGlobal, isSaving: isSavingSettings, ConflictDialog } = useSaveSettingsWithOCC();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSaveScope, setPendingSaveScope] = useState<SaveScope>('contact');
  const [savingWithShortcut, setSavingWithShortcut] = useState(false);
  
  // Unsaved changes detection
  const {
    hasUnsavedChanges,
    markAsSaved,
    reset: resetUnsavedChanges,
  } = useUnsavedChanges({
    toneOverride,
    lengthOverride,
    moduleStates,
    moduleOrder,
    moduleSelections,
    curatedTo,
    curatedCc,
    subjectPoolOverride,
  });
  
  // Save handlers with keyboard shortcut feedback
  const handleSaveContact = () => {
    setConfirmDialogOpen(true);
    setPendingSaveScope('contact');
    setSavingWithShortcut(false);
  };

  const handleSaveGlobal = () => {
    setConfirmDialogOpen(true);
    setPendingSaveScope('global');
    setSavingWithShortcut(false);
  };
  
  // Save shared settings to all selected contacts in group mode
  const handleSaveSharedSettings = async () => {
    if (selectedContactIds.size === 0) {
      toast({
        title: "No Contacts Selected",
        description: "Please select contacts to save settings to.",
        variant: "destructive",
      });
      return;
    }
    
    const contactIds = Array.from(selectedContactIds);
    let savedCount = 0;
    
    try {
      for (const contactId of contactIds) {
        await saveSettings({
          contactId,
          moduleStates,
          deltaType: 'Email',
          moduleOrder,
          moduleSelections,
          curatedTeam,
          curatedTo: '', // Contact-specific, don't override
          curatedCc,
          customModuleLabels,
        });
        savedCount++;
      }
      
      toast({
        title: "Settings Saved",
        description: `Successfully saved settings to ${savedCount} contact${savedCount !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Failed to save shared settings:', error);
      toast({
        title: "Save Failed",
        description: `Saved to ${savedCount} of ${contactIds.length} contacts`,
        variant: "destructive",
      });
    }
  };
  
  // Handle module change
  const handleModuleChange = (key: string, value: TriState) => {
    setModuleStates(prev => ({ ...prev, [key]: value }));
  };
  
  // Handle module reorder with position recalculation
  const handleModuleOrderChange = useCallback((newOrder: (string | number)[]) => {
    // Recompute positions to ensure 1..N contiguity
    const recomputed = recomputePositions(newOrder);
    setModuleOrder(recomputed as Array<keyof ModuleStates>);
    
    // Announce for screen readers
    if (recomputed.length > 0) {
      const lastMoved = recomputed[recomputed.length - 1];
      const announcement = announceModuleMove(lastMoved, recomputed.length);
      setAriaAnnouncement(announcement);
      
      // Clear announcement after screen reader reads it
      setTimeout(() => setAriaAnnouncement(''), 1000);
    }
  }, []);

  // Capture defaults snapshot (lazy - only before first randomization)
  const captureDefaultsSnapshot = () => {
    if (defaultsSnapshot) return;
    
    setDefaultsSnapshot({
      order: [...moduleOrder],
      moduleSelections: { ...moduleSelections },
      subjectPrimaryId: moduleSelections.subject_line?.defaultSubjectId || null,
    });
  };

  // Randomize phrases and module order
  const handleRandomize = () => {
    // Validation: Check if phrase libraries are loaded
    if (!allPhrases || allPhrases.length === 0) {
      toast({
        title: "Cannot Randomize",
        description: "Phrase libraries are not loaded yet. Please wait.",
        variant: "destructive",
      });
      return;
    }
    
    // Capture snapshot before first randomization
    if (!defaultsSnapshot) {
      captureDefaultsSnapshot();
    }
    
    // Generate new seed for this randomization
    const seed = generateSeed(selectedContact?.contact_id);
    setRandomizationSeed(seed);
    
    // Track changes for visual feedback
    const positionChanges = new Set<string>();
    const contentChanges = new Set<string>();
    
    // 1. Randomize module order (respect pins)
    const randomizedOrder = shuffleModuleOrder(moduleOrder, seed);
    
    // Detect position changes
    randomizedOrder.forEach((moduleKey, newIndex) => {
      const oldIndex = moduleOrder.indexOf(moduleKey as keyof ModuleStates);
      if (oldIndex !== newIndex) {
        positionChanges.add(moduleKey);
      }
    });
    
    setModuleOrder(randomizedOrder as Array<keyof ModuleStates>);
    
    // 2. Randomize phrases for each phrase-driven module
    const newSelections: ModuleSelections = { ...moduleSelections };
    
    Object.keys(MODULE_LIBRARY_MAP).forEach((moduleKey) => {
      const category = MODULE_LIBRARY_MAP[moduleKey as ModuleKey];
      const isPhrase = PHRASE_DRIVEN_MODULES.has(moduleKey as ModuleKey);
      
      if (!isPhrase) return;
      
      // Get phrases for this category
      const categoryPhrases = allPhrases?.filter(p => p.category === category) || [];
      
      if (categoryPhrases.length === 0) return;
      
      const oldSelection = moduleSelections[moduleKey as keyof ModuleSelections];
      
      // Single-select vs multi-select
      if (SINGLE_SELECT_MODULES.has(moduleKey as ModuleKey)) {
        const randomPhrase = pickRandomPhrase(categoryPhrases, seed + moduleKey.length);
        if (randomPhrase) {
          // Check if content changed
          if (oldSelection?.phraseId !== randomPhrase.id) {
            contentChanges.add(moduleKey);
          }
          
          newSelections[moduleKey as keyof ModuleSelections] = {
            type: 'phrase',
            category,
            phraseId: randomPhrase.id,
            phraseText: randomPhrase.phrase_text,
            // Keep existing defaultPhraseId (don't change starred default)
            defaultPhraseId: newSelections[moduleKey as keyof ModuleSelections]?.defaultPhraseId,
          };
        }
      } else if (MULTI_SELECT_MODULES.has(moduleKey as ModuleKey)) {
        // Multi-select now enforces exactly 1 selection
        const randomPhrase = pickRandomPhrase(categoryPhrases, seed + moduleKey.length);
        
        // Check if content changed
        const oldPhraseId = oldSelection?.phraseId;
        if (randomPhrase && oldPhraseId !== randomPhrase.id) {
          contentChanges.add(moduleKey);
        }
        
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
    
    // 3. Randomize subject line (single-select)
    const subjectCategory = allSubjects || [];
    if (subjectCategory.length > 0) {
      // Filter by tone override if present
      const filteredSubjects = toneOverride
        ? subjectCategory.filter(s => s.style === toneOverride)
        : subjectCategory;
      
      if (filteredSubjects.length > 0) {
        const randomSubject = pickRandomPhrase(
          filteredSubjects.map(s => ({ id: s.id, phrase_text: s.subject_template })),
          seed + 9999
        );
        
        if (randomSubject) {
          const oldSelection = moduleSelections.subject_line;
          if (oldSelection?.phraseId !== randomSubject.id) {
            contentChanges.add('subject_line');
          }
          
          newSelections.subject_line = {
            type: 'phrase',
            category: 'subject',
            phraseId: randomSubject.id,
            phraseText: randomSubject.phrase_text,
            defaultPhraseId: newSelections.subject_line?.defaultPhraseId,
          };
        }
      }
    }
    
    setModuleSelections(newSelections);
    setIsRandomized(true);
    
    // Combine all changes for highlighting
    const allChanges = new Set([...positionChanges, ...contentChanges]);
    setChangedModules(allChanges);
    
    // Enhanced toast with statistics
    const positionCount = positionChanges.size;
    const contentCount = contentChanges.size;
    
    toast({
      title: "✨ Randomization Complete",
      description: `${positionCount} position change${positionCount !== 1 ? 's' : ''}, ${contentCount} content change${contentCount !== 1 ? 's' : ''}`,
    });
  };

  // Restore to default configuration
  const handleRestoreToDefault = () => {
    if (!defaultsSnapshot) {
      toast({
        title: "No Changes",
        description: "Nothing to restore.",
      });
      return;
    }
    
    // Restore order
    setModuleOrder(defaultsSnapshot.order);
    
    // Restore selections
    setModuleSelections(defaultsSnapshot.moduleSelections);
    
    // Clear randomization state
    setIsRandomized(false);
    setRandomizationSeed(null);
    setChangedModules(new Set());
    
    toast({
      title: "Restored",
      description: "Reverted to your default configuration.",
    });
  };

  const handleConfirmSave = async () => {
    if (!selectedContact || !masterTemplate) return;
    
    setIsManualSaving(true);
    
    try {
    // Check if templates are still loading
    if (isLoadingTemplates) {
      toast({
        title: "Still Loading",
        description: "Master templates are still loading. Please wait a moment.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
      return;
    }

    const fullMasterTemplate = masterTemplates?.find(
      t => t.master_key === masterTemplate.master_key
    );
    
    // Guard against missing template ID
    if (!fullMasterTemplate?.id) {
      toast({
        title: "Template Not Found",
        description: `Master template "${masterTemplate.master_key}" not found in database.`,
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
      return;
    }

      if (pendingSaveScope === 'contact') {
        // Validate template ID before saving
        const templateId = fullMasterTemplate.id;
        const templateValidation = validateTemplateId(templateId);
        
        if (!templateValidation.isValid) {
          toast({
            title: "Validation Error",
            description: templateValidation.errors.join(', '),
            variant: "destructive",
          });
          setConfirmDialogOpen(false);
          return;
        }
        
        // Validate module selections before saving
        const moduleValidation = validateModuleSelections(moduleStates, moduleSelections);
        if (!moduleValidation.isValid) {
          toast({
            title: 'Cannot Save - Incomplete Configuration',
            description: moduleValidation.errors.join('. '),
            variant: 'destructive',
          });
          setConfirmDialogOpen(false);
          return;
        }
        
        // Save contact settings
        saveContact({
          contactId: selectedContact.contact_id,
          contactName: selectedContact.full_name || 'this contact',
          templateId,
          moduleStates,
          deltaType,
          moduleOrder: recomputePositions(moduleOrder) as string[],
          moduleSelections,
          curatedRecipients: {
            team: curatedTeam,
            to: curatedTo,
            cc: curatedCc,
          },
          currentRevision: (contactSettings as any)?.revision || 0,
        });
        
        // If randomized and user wants to save as defaults
        if (isRandomized && makeRandomizedDefaults) {
          const defaults = Object.entries(moduleSelections)
            .filter(([key, sel]) => {
              return PHRASE_DRIVEN_MODULES.has(key as any) && 
                     (sel.phraseId || sel.greetingId);
            })
            .map(([key, sel]) => ({
              module_key: key,
              phrase_id: sel.phraseId || sel.greetingId || '',
              phrase_text: sel.phraseText || sel.text || '',
            }));
          
          if (defaults.length > 0) {
            await saveContactModuleDefaults.mutateAsync({
              contactId: selectedContact.contact_id,
              templateId,
              defaults,
            });
          }
          
          // Reset randomization state after saving defaults
          setIsRandomized(false);
          setMakeRandomizedDefaults(false);
          setRandomizationSeed(null);
        }
      } else {
        // Global save path - template ID already validated above
        saveGlobal({
          templateId: fullMasterTemplate.id,
          templateName: MASTER_TEMPLATES[masterTemplate.master_key]?.label || masterTemplate.master_key,
          toneOverride,
          lengthOverride,
          moduleStates,
          moduleOrder: recomputePositions(moduleOrder) as string[],
          currentRevision: 0,
        });
        
        // If randomized and user wants to save as template defaults
        if (isRandomized && makeRandomizedDefaults) {
          const defaults = Object.entries(moduleSelections)
            .filter(([key, sel]) => {
              return PHRASE_DRIVEN_MODULES.has(key as any) && 
                     (sel.phraseId || sel.greetingId);
            })
            .map(([key, sel]) => ({
              module_key: key,
              phrase_id: sel.phraseId || sel.greetingId || '',
              phrase_text: sel.phraseText || sel.text || '',
            }));
          
          if (defaults.length > 0) {
            await saveTemplateModuleDefaults.mutateAsync({
              templateId: fullMasterTemplate.id,
              defaults,
            });
          }
          
          // Reset randomization state after saving defaults
          setIsRandomized(false);
          setMakeRandomizedDefaults(false);
          setRandomizationSeed(null);
        }
      }
      
      setConfirmDialogOpen(false);
    } finally {
      setIsManualSaving(false);
    }
  };
  
  // Keyboard shortcuts (HIGH-12 fix: Added Ctrl+R for randomize)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? - Show keyboard shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // Ctrl+S / Cmd+S - Save contact settings
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveGlobal();
        } else {
          handleSaveContact();
        }
      }
      
      // Ctrl+R / Cmd+R - Randomize (Individual mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && mode === 'individual') {
        e.preventDefault();
        handleRandomize();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedContact, masterTemplate, mode, handleRandomize]);

  // Handle module selection changes - clear randomization on manual edit (HIGH-8 fix)
  const handleModuleSelectionChange = (
    module: keyof ModuleStates,
    selection: ModuleSelection | null
  ) => {
    setModuleSelections((prev) => ({
      ...prev,
      [module]: selection || undefined,
    }));
    
    // Clear randomization state on manual edit (HIGH-8 fix)
    if (isRandomized) {
      setIsRandomized(false);
      setRandomizationSeed(null);
    }
  };

  // Initialize team and recipients when contact changes
  useEffect(() => {
    const initializeTeamAndRecipients = async () => {
      if (!contactData || !selectedContact) {
        console.log('❌ Missing contactData or selectedContact');
        return;
      }
      
      console.log('🔍 Initializing team for contact:', {
        email: selectedContact.email,
        focus_areas: contactData.focus_areas,
        has_saved_settings: !!contactSettings?.curated_recipients,
        saved_team_length: contactSettings?.curated_recipients?.team?.length || 0
      });
      
      // If we have saved curated recipients with a non-empty team, use those
      if (contactSettings?.curated_recipients && contactSettings.curated_recipients.team?.length > 0) {
        console.log('✅ Using saved curated recipients');
        const saved = contactSettings.curated_recipients;
        setCuratedTeam(saved.team);
        const to = saved.to || selectedContact.email || '';
        setCuratedTo(to);
        
        // If saved CC exists and is not empty, use it; otherwise compute from team
        if (saved.cc && saved.cc.length > 0) {
          setCuratedCc(saved.cc);
        } else {
          // Compute CC from team members, excluding the TO address
          const teamCc = Array.from(
            new Set((saved.team || []).map(m => m.email?.trim().toLowerCase()).filter(Boolean))
          ).filter(e => e !== to?.trim().toLowerCase());
          setCuratedCc(teamCc);
        }
        return;
      }
      
      // Otherwise, auto-populate from contact's focus areas
      console.log('🔄 Auto-populating team from focus areas...');
      setCuratedTo(selectedContact.email || '');
      
      // Fetch team members from focus area directory
      const focusAreas = contactData.focus_areas || [];
      console.log('📋 Focus areas to process:', focusAreas);
      
      const teamMembers: TeamMember[] = [];
      const ccEmails: string[] = [];
      
      for (const focusArea of focusAreas) {
        const { data: teamData } = await supabase
          .from('lg_focus_area_directory')
          .select('lead1_name, lead1_email, lead2_name, lead2_email, assistant_name, assistant_email')
          .eq('focus_area', focusArea)
          .maybeSingle();
        
        if (teamData) {
          console.log(`✅ Found team data for ${focusArea}:`, teamData);
          
          // Add lead 1
          if (teamData.lead1_name && teamData.lead1_email) {
            const id = `lead1_${focusArea}`;
            if (!teamMembers.some(m => m.id === id)) {
              teamMembers.push({
                id,
                name: teamData.lead1_name,
                email: teamData.lead1_email,
                role: 'Lead'
              });
              if (!ccEmails.includes(teamData.lead1_email)) {
                ccEmails.push(teamData.lead1_email);
              }
            }
          }
          
          // Add lead 2
          if (teamData.lead2_name && teamData.lead2_email) {
            const id = `lead2_${focusArea}`;
            if (!teamMembers.some(m => m.id === id)) {
              teamMembers.push({
                id,
                name: teamData.lead2_name,
                email: teamData.lead2_email,
                role: 'Lead'
              });
              if (!ccEmails.includes(teamData.lead2_email)) {
                ccEmails.push(teamData.lead2_email);
              }
            }
          }
          
          // Add assistant
          if (teamData.assistant_name && teamData.assistant_email) {
            const id = `assistant_${focusArea}`;
            if (!teamMembers.some(m => m.id === id)) {
              teamMembers.push({
                id,
                name: teamData.assistant_name,
                email: teamData.assistant_email,
                role: 'Assistant'
              });
              if (!ccEmails.includes(teamData.assistant_email)) {
                ccEmails.push(teamData.assistant_email);
              }
            }
          }
        } else {
          console.log(`⚠️ No team data found for ${focusArea}`);
        }
      }
      
      console.log('✅ Team initialization complete:', {
        team_members: teamMembers.length,
        cc_emails: ccEmails.length
      });
      
      setAutoTeam(teamMembers);
      setCuratedTeam(teamMembers);
      setCuratedCc(ccEmails);
    };
    
    initializeTeamAndRecipients();
  }, [contactData, selectedContact, contactSettings?.curated_recipients]);

  // Auto-select first phrase for all single-select modules (runs once per contact)
  useAutoSelectPhrases({
    contactId: selectedContact?.contact_id || null,
    moduleStates,
    moduleSelections,
    allPhrases,
    toneOverride,
    onSelectionChange: (updates) => {
      setModuleSelections(prev => ({
        ...prev,
        ...updates,
      }));
    },
  });

  // Load master templates from database
  const { data: masterTemplates, isLoading: isLoadingTemplates } = useMasterTemplates();
  
  // Load email templates (presets)
  const { data: emailTemplates = [] } = useEmailTemplatesQuery();
  
  // Map current master template to its preset email_template
  const activeEmailTemplate = masterTemplate
    ? emailTemplates.find(
        (t) =>
          t.is_preset &&
          t.name === (MASTER_TEMPLATES[masterTemplate.master_key]?.label || masterTemplate.master_key)
      ) || null
    : null;
  
  // Auto-save mutation for module labels (global) - must use email_templates.id to satisfy FK
  const autoSaveLabels = useAutoSaveModuleLabels(activeEmailTemplate?.id || null);
  
  // Load template settings for custom module labels
  const { data: templateSettings } = useNewTemplateSettings(activeEmailTemplate?.id || null);
  
  // Auto-load saved settings once per contact to avoid snapping back after drag
  useEffect(() => {
    const currentId = selectedContact?.contact_id || null;
    if (!currentId) return;

    if (initializedContactId !== currentId) {
      if (contactSettings) {
        setModuleStates(contactSettings.module_states as ModuleStates);
        setDeltaType(contactSettings.delta_type);
        // Only load saved order if it exists and is non-empty
        // Otherwise preserve current moduleOrder (don't reset to default)
      if (
        contactSettings.module_order &&
        Array.isArray(contactSettings.module_order) &&
        contactSettings.module_order.length > 0
      ) {
        setModuleOrder(contactSettings.module_order as Array<keyof ModuleStates>);
      } else {
        // No saved order: enforce default order
        setModuleOrder(DEFAULT_MODULE_ORDER);
      }
        // If no saved order, preserve current order (don't reset)
        if (contactSettings.module_selections) {
          // Validate module selections against current libraries
          const validation = validateModuleSelectionsAgainstLibrary(
            contactSettings.module_selections as ModuleSelections,
            allPhrases,
            allInquiries,
            allSubjects
          );
          
          // Warn user if stale selections were found
          if (!validation.isValid) {
            console.warn(`Removed ${validation.removedItems.length} stale module selection(s):`, validation.removedItems);
            toast({
              title: 'Outdated selections removed',
              description: `${validation.removedItems.length} deleted item(s) removed from selections`,
              duration: 5000,
            });
          }
          
          // Merge saved defaults back into cleaned selections
          const selectionsWithDefaults = { ...validation.cleanedSelections };

          // Restore module_defaults (for all content modules)
          if (contactSettings.module_defaults) {
            Object.entries(contactSettings.module_defaults).forEach(([moduleKey, defaultId]) => {
              if (!selectionsWithDefaults[moduleKey]) {
                selectionsWithDefaults[moduleKey] = { type: 'phrase', category: MODULE_LIBRARY_MAP[moduleKey] };
              }
              selectionsWithDefaults[moduleKey].defaultPhraseId = defaultId as string;
            });
          }

        // Restore subject_default_id (special field for subject line)
        if (contactSettings.subject_default_id) {
          if (!selectionsWithDefaults.subject_line) {
            selectionsWithDefaults.subject_line = { type: 'phrase', category: 'subject' };
          }
          selectionsWithDefaults.subject_line.defaultSubjectId = contactSettings.subject_default_id;
          selectionsWithDefaults.subject_line.defaultPhraseId = contactSettings.subject_default_id;
        }

        // Promote defaults into active selections when phraseId is missing
        const finalSelections = { ...selectionsWithDefaults };

        // Handle subject_line
        {
          const sel = finalSelections.subject_line;
          const defaultId = sel?.defaultPhraseId || sel?.defaultSubjectId;
          if (defaultId && !sel?.phraseId) {
            const s = allSubjects.find(sub => sub.id === defaultId);
            if (s) {
              finalSelections.subject_line = {
                ...(sel || { type: 'phrase', category: 'subject' }),
                phraseId: s.id,
                phraseText: s.subject_template,
                defaultPhraseId: defaultId,
                defaultSubjectId: defaultId,
              };
            }
          }
        }

        // Handle all other phrase-driven modules
        for (const moduleKey of [...Array.from(SINGLE_SELECT_MODULES), ...Array.from(MULTI_SELECT_MODULES)]) {
          if (moduleKey === 'subject_line') continue;
          const sel = finalSelections[moduleKey];
          const defaultId = sel?.defaultPhraseId;
          if (defaultId && !sel?.phraseId) {
            const category = MODULE_LIBRARY_MAP[moduleKey];
            const phrase = allPhrases.find(p => p.category === category && p.id === defaultId);
            if (phrase) {
              finalSelections[moduleKey] = {
                ...(sel || { type: 'phrase', category }),
                phraseId: phrase.id,
                phraseText: phrase.phrase_text,
                defaultPhraseId: defaultId,
              };
            }
          }
        }

        setModuleSelections(finalSelections);
        } else {
          setModuleSelections({});
        }
        if (contactSettings.selected_article_id) {
          // reserved for future
        }
        if (contactSettings.curated_recipients) {
          setCuratedTeam(contactSettings.curated_recipients.team || []);
          setCuratedTo(contactSettings.curated_recipients.to || selectedContact?.email || '');
          setCuratedCc(contactSettings.curated_recipients.cc || []);
        }
        // Custom labels loaded from template settings (see below)
        setInitializedContactId(currentId);
      } else if (masterTemplate && masterTemplates) {
        // No saved settings - load default states AND order
        const defaults = getModuleDefaultsFromMaster(masterTemplate.master_key, masterTemplates);
        if (defaults) {
          setModuleStates(defaults);
        } else {
          const fallback = MODULE_DEFAULTS[masterTemplate.master_key];
          if (fallback) {
            setModuleStates(fallback);
          }
        }
        // NEW CONTACT: Enforce default module order to prevent bleed from previous contact
        setModuleOrder(DEFAULT_MODULE_ORDER);
        setInitializedContactId(currentId);
      }
    }
  }, [selectedContact?.contact_id, contactSettings, masterTemplate, masterTemplates]);
  
  // Load custom module labels from template settings (global)
  useEffect(() => {
    if (templateSettings?.custom_module_labels) {
      setCustomModuleLabels(templateSettings.custom_module_labels as Record<string, string>);
    } else {
      setCustomModuleLabels({});
    }
  }, [templateSettings]);
  
  const handleResetToDefaults = () => {
    if (masterTemplate && masterTemplates) {
      // Load defaults from database-driven master template
      const defaults = getModuleDefaultsFromMaster(masterTemplate.master_key, masterTemplates);
      if (defaults) {
        setModuleStates(defaults);
      } else {
        // Fallback to hardcoded defaults
        const fallback = MODULE_DEFAULTS[masterTemplate.master_key];
        if (fallback) {
          setModuleStates(fallback);
        }
      }
    }
  };

  // Auto-save module order on change in Individual mode (debounced)
  useEffect(() => {
    if (mode !== 'individual' || !selectedContact?.contact_id || isManualSaving) return;
    const t = setTimeout(() => {
      saveSettings({
        contactId: selectedContact.contact_id,
        moduleStates,
        deltaType,
        selectedArticleId: selectedArticle?.article_link,
        moduleOrder,
        moduleSelections,
        curatedTeam,
        curatedTo,
        curatedCc,
        customModuleLabels,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [moduleOrder, customModuleLabels, isManualSaving]);

  const handleSaveSettings = () => {
    if (!selectedContact?.contact_id) return;
    
    // Validate module selections before saving
    const moduleValidation = validateModuleSelections(moduleStates, moduleSelections);
    if (!moduleValidation.isValid) {
      toast({
        title: 'Cannot Save - Module Configuration Incomplete',
        description: moduleValidation.errors.join('. '),
        variant: 'destructive',
      });
      return;
    }
    
    saveSettings({
      contactId: selectedContact.contact_id,
      moduleStates,
      deltaType,
      selectedArticleId: selectedArticle?.article_link,
      moduleOrder,
      moduleSelections,
      curatedTeam,
      curatedTo,
      curatedCc,
      customModuleLabels,
    });
  };

  const handleResetSettings = () => {
    if (!selectedContact?.contact_id) return;
    
    resetSettings(selectedContact.contact_id);
    // Reset to template defaults
    handleResetToDefaults();
  };

  // Enhanced draft generation handler with error boundary
  const handleGenerateDraft = async () => {
    try {
      if (!contactData || !masterTemplate) {
        toast({
          title: 'Missing Data',
          description: 'Please select a contact first',
          variant: 'destructive',
        });
        return;
      }

      // Validation removed - auto-selection ensures all modules are valid

      // Get full master template from database
      const fullMasterTemplate = masterTemplates?.find(
        t => t.master_key === masterTemplate.master_key
      );
      
      if (!fullMasterTemplate) {
        toast({
          title: 'Template Not Found',
          description: 'Master template not found in database',
          variant: 'destructive',
        });
        return;
      }

      // Build enhanced payload with curated recipients
      const payload = await buildEnhancedDraftPayload(
        contactData,
        fullMasterTemplate,
        allPhrases,
        allInquiries,
        allSubjects,
        daysSinceContact,
        selectedArticleForContext?.article_link,
        toneOverride || undefined,
        subjectPoolOverride,
        moduleOrder,
        curatedTeam.length > 0 ? curatedTeam : undefined,
        curatedTo,
        curatedCc.length > 0 ? curatedCc : undefined,
        autoTeam.length > 0 ? autoTeam : undefined,
        deltaType as 'Email' | 'Meeting' || 'Email', // deltaType
        moduleStates, // Pass module states
        moduleSelections // Pass module selections
      );

      // Generate draft
      const result = await generateDraft(payload);
      
      if (result) {
        setDraftResult(result);
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred during draft generation',
        variant: 'destructive',
      });
    }
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = () => {
    if (!draftResult) return;

    const fullEmail = `Subject: ${draftResult.subject}

${draftResult.greeting},

${draftResult.body}

${draftResult.signature}`;

    navigator.clipboard.writeText(fullEmail);
    toast({
      title: 'Copied!',
      description: 'Email draft copied to clipboard',
    });
  };
  
  // FIX #1: Fetch complete contact data for Group mode including all necessary fields
  useEffect(() => {
    if (mode === 'group') {
      const fetchGroupContacts = async () => {
        setLoadingGroupContacts(true);
        try {
          // Fetch all fields from contacts_raw to ensure complete ContactEmailComposer compatibility
          let query = supabase.from('contacts_raw').select(`
            id,
            full_name,
            email_address,
            organization,
            lg_focus_areas_comprehensive_list,
            most_recent_contact,
            delta_type,
            email_cc,
            meeting_cc,
            outreach_date
          `);
          
          // Apply filters (simplified for MVP)
          if (groupFilters.sectors && groupFilters.sectors.length > 0) {
            query = query.in('lg_sector', groupFilters.sectors);
          }
          if (groupFilters.lgLead && groupFilters.lgLead.length > 0) {
            query = query.in('lg_lead', groupFilters.lgLead);
          }
          
          // NO LIMIT - fetch all matching contacts
          let { data, error } = await query;
          
          // Apply search filter client-side
          if (data && groupFilters.searchTerm) {
            const searchLower = groupFilters.searchTerm.toLowerCase();
            data = data.filter(contact =>
              contact.full_name?.toLowerCase().includes(searchLower) ||
              contact.email_address?.toLowerCase().includes(searchLower) ||
              contact.organization?.toLowerCase().includes(searchLower)
            );
          }
          if (error) {
            console.error('Error fetching group contacts:', error);
            toast({
              title: 'Error Loading Contacts',
              description: 'Failed to load contacts for group mode. Please try again.',
              variant: 'destructive',
            });
            setGroupContacts([]);
          } else if (data) {
            setGroupContacts(data);
          }
        } catch (err) {
          console.error('Unexpected error fetching group contacts:', err);
          toast({
            title: 'Error',
            description: 'An unexpected error occurred while loading contacts.',
            variant: 'destructive',
          });
          setGroupContacts([]);
        } finally {
          setLoadingGroupContacts(false);
        }
      };
      
      fetchGroupContacts();
    }
  }, [mode, groupFilters]);
  
  // Handle batch generate
  const handleBatchGenerate = async () => {
    if (selectedContactIds.size === 0) return;
    
    // Validation: ensure required settings exist
    if (!masterTemplate) {
      toast({
        title: 'Configuration Error',
        description: 'Please select a master template before generating',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate subject pool only if subject_line is not 'never'
    if (moduleStates.subject_line !== 'never') {
      const subjectValidation = validateSubjectPool(subjectPoolOverride);
      if (!subjectValidation.isValid) {
        toast({
          title: 'Subject Pool Error',
          description: subjectValidation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Validate module selections before batch generation
    const moduleValidation = validateModuleSelections(moduleStates, moduleSelections);
    if (!moduleValidation.isValid) {
      toast({
        title: 'Module Configuration Required',
        description: moduleValidation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Build batch payload
      const contactsToProcess = groupContacts.filter(c => selectedContactIds.has(c.id));
      
      queueManager.addToQueue(contactsToProcess.map(c => ({
        id: c.id,
        name: c.full_name || c.email_address || 'Unknown'
      })));
      
      setQueueDialogOpen(true);
      queueManager.setIsProcessing(true);
      
      // Process each contact (simplified MVP - using fan-out approach)
      for (const contact of contactsToProcess) {
        const override = contactOverrides.get(contact.id);
        queueManager.updateQueueItem(contact.id, { status: 'running', progress: 10 });
        
        try {
          // Build individual payload (reuse existing enhanced payload builder)
          const contactForPayload = {
            contact_id: contact.id,
            email: contact.email_address || '',
            full_name: contact.full_name || '',
            first_name: contact.first_name || '',
            organization: contact.organization || '',
            email_cc: null,
            meeting_cc: null,
            delta_type: null,
            focus_areas: contact.lg_focus_areas_comprehensive_list
              ? contact.lg_focus_areas_comprehensive_list.split(',').map((fa: string) => fa.trim()).filter(Boolean)
              : [],
            fa_count: 0,
            fa_sectors: [],
            fa_descriptions: [],
            gb_present: false,
            hs_present: false,
            ls_present: false,
            has_opps: false,
            opps: [],
            articles: [],
            lead_emails: [],
            assistant_names: [],
            assistant_emails: [],
            latest_contact_email: null,
            latest_contact_meeting: null,
            most_recent_contact: contact.most_recent_contact,
            outreach_date: contact.outreach_date,
          };
          
          // Get effective module order (override or shared)
          const effectiveModuleOrder = override?.moduleOrder || moduleOrder;
          
          // Get full master template from database
          const fullMasterTemplate = masterTemplates?.find(
            t => t.master_key === masterTemplate.master_key
          );
          
          if (!fullMasterTemplate) {
            throw new Error('Master template not found in database');
          }
          
          // Build comprehensive payload with all UI state
          const payload = await buildEnhancedDraftPayload(
            contactForPayload,
            fullMasterTemplate,
            allPhrases || [],
            allInquiries || [],
            allSubjects || [],
            daysSinceContact,
            selectedArticleForContext?.article_link || null,
            toneOverride,
            subjectPoolOverride,
            effectiveModuleOrder, // Use effective module order
            override?.team || curatedTeam,
            override?.recipients?.to || contact.email_address || '',
            override?.recipients?.cc || curatedCc,
            autoTeam,
            contact.delta_type as 'Email' | 'Meeting' || 'Email', // deltaType
            moduleStates, // Pass module states
            moduleSelections // Pass module selections
          );
          
          // Validate payload before sending
          if (!payload.contact.email || !payload.routing.masterKey) {
            throw new Error('Invalid payload: missing required fields');
          }
          
          queueManager.updateQueueItem(contact.id, { progress: 30 });
          
          // Call edge function with correct mode
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Authentication required. Please refresh and try again.');
          }
          
          const response = await fetch(
            'https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/post_to_n8n',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                mode: 'group', // Correct mode flag
                batchId: `b_${Date.now()}`,
                batchIndex: contactsToProcess.indexOf(contact),
                batchTotal: contactsToProcess.length,
                payload,
              }),
            }
          );
          
          queueManager.updateQueueItem(contact.id, { progress: 70 });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
          
          queueManager.updateQueueItem(contact.id, { status: 'succeeded', progress: 100 });
        } catch (error: any) {
          console.error(`Failed to generate for contact ${contact.id}:`, error);
          queueManager.updateQueueItem(contact.id, {
            status: 'failed',
            progress: 0,
            error: error.message || 'Unknown error',
          });
        }
      }
      
      queueManager.setIsProcessing(false);
      toast({ 
        title: 'Batch Generation Complete',
        description: `Processed ${contactsToProcess.length} contact${contactsToProcess.length > 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      console.error('Batch generation error:', error);
      toast({ 
        title: 'Batch Generation Error', 
        description: error.message || 'An unexpected error occurred', 
        variant: 'destructive' 
      });
      queueManager.setIsProcessing(false);
    }
  };
  
  // Legacy support - remove when fully migrated
  const { contact, lag, opportunities, payload, isLoading } = useEmailBuilderData(selectedContact?.contact_id || null, null);

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Email Builder</h1>
              <p className="text-muted-foreground">Generate personalized email drafts with AI</p>
            </div>
          </div>
          
          {/* Mode Switcher */}
          <ModeSwitcher mode={mode} onModeChange={setMode} />
        </div>

        {/* Group Mode Layout */}
        {mode === 'group' && (
          <div className="space-y-6">
            {/* Contacts and Filters Section - Moved above Shared Settings */}
            <GroupFilterBar
              filters={groupFilters}
              onFiltersChange={setGroupFilters}
              onClearFilters={() => {
                setGroupFilters({});
                setSelectedContactIds(new Set());
              }}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <GroupResultsTable
                  contacts={groupContacts}
                  selectedContactIds={selectedContactIds}
                  onSelectionChange={setSelectedContactIds}
                  onCustomize={(contactId) => {
                    setActiveOverrideContactId(contactId);
                    setOverrideDrawerOpen(true);
                  }}
                  onFocusChange={setFocusedContactId}
                  focusedContactId={focusedContactId}
                  overrides={contactOverrides}
                  loading={loadingGroupContacts}
                />
              </div>
              
              <div className="lg:col-span-4">
                {/* Preview Panel for focused contact */}
                {focusedContactId && (() => {
                  const focusedContact = groupContacts.find(c => c.id === focusedContactId);
                  if (!focusedContact) return null;
                  
                  const effectiveConfig = mergeEffectiveConfig(
                    {
                      toneOverride,
                      lengthOverride,
                      daysSinceContact,
                      masterTemplate: masterTemplates?.find(
                        t => t.master_key === (groupMasterTemplateKey || masterTemplate?.master_key)
                      ) || masterTemplates?.[0] || null as any,
                      moduleSelections,
                      moduleOrder,
                      moduleStates: moduleStates as Record<string, any>,
                      subjectLinePool: {
                        selectedIds: subjectPoolOverride,
                        style: 'hybrid',
                      },
                      team: curatedTeam,
                      cc: curatedCc,
                    },
                    contactOverrides.get(focusedContactId),
                    focusedContact
                  );
                  
                  return (
                    <PreviewPanel
                      config={effectiveConfig}
                      contactName={focusedContact.full_name || focusedContact.email_address || 'Unknown'}
                      onEdit={() => {
                        setActiveOverrideContactId(focusedContactId);
                        setOverrideDrawerOpen(true);
                      }}
                    />
                  );
                })()}
                
                {!focusedContactId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Click on a contact row to preview their effective settings
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            {/* Shared Settings Panel - Moved below Contacts and Filters */}
            <SharedSettingsPanel
              masterTemplateKey={groupMasterTemplateKey || masterTemplate?.master_key || null}
              masterTemplate={masterTemplates?.find(t => t.master_key === (groupMasterTemplateKey || masterTemplate?.master_key)) || null}
              onMasterTemplateChange={(masterKey) => {
                setGroupMasterTemplateKey(masterKey);
                const defaults = getModuleDefaultsFromMaster(masterKey, masterTemplates || []);
                if (defaults) {
                  setModuleStates(defaults);
                  // REMOVED: setModuleOrder(DEFAULT_MODULE_ORDER)
                  // Only reset order when user clicks "Reset" button explicitly
                }
                toast({
                  title: "Master Template Updated",
                  description: `All ${selectedContactIds.size} contacts will use "${masterKey}"`,
                });
              }}
              daysSinceContact={daysSinceContact}
              onDaysSinceContactChange={setDaysSinceContact}
              toneOverride={toneOverride}
              onToneOverrideChange={setToneOverride}
              lengthOverride={lengthOverride}
              onLengthOverrideChange={setLengthOverride}
              moduleStates={moduleStates}
              moduleOrder={moduleOrder}
              moduleSelections={moduleSelections}
              onModuleChange={handleModuleChange}
              onModuleOrderChange={handleModuleOrderChange}
              onModuleSelectionChange={handleModuleSelectionChange}
              onResetToDefaults={handleResetToDefaults}
              allPhrases={allPhrases}
              allInquiries={allInquiries}
              allSubjects={allSubjects}
              subjectPoolOverride={subjectPoolOverride}
              onSubjectPoolChange={setSubjectPoolOverride}
              team={curatedTeam}
              onTeamChange={setCuratedTeam}
              cc={curatedCc}
              onCcChange={setCuratedCc}
              onRandomize={handleRandomize}
              onRestoreToDefault={handleRestoreToDefault}
              isRandomized={isRandomized}
              changedModules={changedModules}
              customModuleLabels={customModuleLabels}
              onCustomModuleLabelChange={(moduleKey, newLabel) => {
                const updatedLabels = { ...customModuleLabels, [moduleKey]: newLabel };
                setCustomModuleLabels(updatedLabels);
                autoSaveLabels.mutate({
                  customLabels: updatedLabels,
                  currentRevision: templateSettings?.revision,
                });
              }}
              selectedContactCount={selectedContactIds.size}
              defaultOpen={true}
              onSaveSharedSettings={handleSaveSharedSettings}
            />
            
            <SelectionTray
              selectedCount={selectedContactIds.size}
              totalCount={groupContacts.length}
              onSelectAll={() => setSelectedContactIds(new Set(groupContacts.map(c => c.id)))}
              onClear={() => setSelectedContactIds(new Set())}
              onGenerate={handleBatchGenerate}
              isGenerating={queueManager.isProcessing}
            />
          </div>
        )}

        {/* Individual Mode Layout (existing) */}
        {mode === 'individual' && (
          <>
        {/* Alert Section - Show Group Alert if in group, otherwise Individual Alert */}
        {groupInfo?.group_contact ? (
          <GroupContactAlert
            groupName={groupInfo.group_contact}
            contactFullName={contactData?.full_name || groupInfo.full_name}
            groupLastContactDate={groupInfo.most_recent_group_contact || null}
            deltaDays={groupInfo.delta || 30}
          />
        ) : (
          selectedContact && contact?.most_recent_contact && (
            <IndividualContactAlert
              contactFullName={contact.full_name}
              lastContactDate={contact.most_recent_contact}
              latestEmailDate={contact.latest_contact_email}
              latestMeetingDate={contact.latest_contact_meeting}
            />
          )
        )}

        {/* Organization Level Alert - Shows recent contacts or upcoming meetings with same org */}
        {selectedContact && contactData && !groupInfo?.group_contact && (
          <OrganizationLevelAlert
            pastContact={orgContext.pastContact}
            upcomingMeeting={orgContext.upcomingMeeting}
            currentOrgName={contactData.organization || emailDomain || 'this organization'}
          />
        )}

        {/* Responsive 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-[1800px] mx-auto px-4 lg:px-6 xl:px-8">
          {/* Left Column - Workflow & Output */}
          <div className="flex flex-col gap-6">
            {/* Contact Selection - Search */}
            <ContactSelector
              selectedContact={selectedContact}
              onContactSelect={setSelectedContact}
            />
            
            {/* Contact Information */}
            {selectedContact && (
              <ContactInfoPanel 
                contactId={selectedContact.contact_id}
                team={curatedTeam}
                onTeamChange={setCuratedTeam}
                onQuickAddToCC={(member) => {
                  if (!curatedCc.includes(member.email)) {
                    setCuratedCc([...curatedCc, member.email]);
                  }
                }}
                deltaType={deltaType}
                onDeltaTypeChange={setDeltaType}
                contactEmail={selectedContact.email}
              />
            )}
            
            {/* Article Picker - Select contextual article for this contact */}
            {selectedContact && contactData && (
              <ArticlePicker
                contactData={contactData}
                selectedArticle={selectedArticleForContext}
                onArticleSelect={setSelectedArticleForContext}
              />
            )}
            
            {/* Recipients Info */}
            <EditableRecipients
              to={curatedTo}
              cc={curatedCc}
              onToChange={setCuratedTo}
              onCcChange={setCuratedCc}
              teamMembers={curatedTeam}
              defaultContactEmail={selectedContact?.email || ''}
              emailCc={contactData?.email_cc || null}
              meetingCc={contactData?.meeting_cc || null}
              deltaType={contactData?.delta_type || null}
            />

            {/* Save Controls with Dual Scope */}
            {selectedContact && masterTemplate && (
              <div className="space-y-2">
                {/* Unsaved Changes Indicator */}
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                    <div className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-500 animate-pulse" />
                    <span>Unsaved changes</span>
                  </div>
                )}
                
                {/* Keyboard Shortcut Feedback */}
                {savingWithShortcut && isSavingSettings && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                
                <SplitSaveButton
                  onSaveContact={handleSaveContact}
                  onSaveGlobal={handleSaveGlobal}
                  templateName={MASTER_TEMPLATES[masterTemplate.master_key]?.label || masterTemplate.master_key}
                  contactName={selectedContact.full_name || 'this contact'}
                  isSaving={isSavingSettings}
                  disabled={isLoadingTemplates}
                  mode="individual"
                />
              </div>
            )}

            {/* Generate Draft Screen */}
            {selectedContact && contactData && masterTemplate && (
              <EnhancedDraftSection
                isGenerating={isGenerating}
                progress={progress}
                streamedContent={streamedContent}
                result={draftResult}
                onGenerate={handleGenerateDraft}
                onCopyToClipboard={handleCopyToClipboard}
                disabled={
                  !contactData || 
                  isSavingSettings || 
                  savingWithShortcut
                }
              />
            )}
          </div>

          {/* Right Column - Configuration */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            {/* Master Template */}
            <MasterTemplateSelector
              selectedContactId={selectedContact?.contact_id || null}
              selectedContactEmail={selectedContact?.email || null}
            />
            
            {/* Core Settings */}
            <EmailBuilderCoreSettings
              daysSinceContact={daysSinceContact}
              onDaysSinceContactChange={setDaysSinceContact}
              toneOverride={toneOverride}
              onToneOverrideChange={setToneOverride}
              lengthOverride={lengthOverride}
              onLengthOverrideChange={setLengthOverride}
            />

            {/* Email Modules Configuration */}
            <ModulesCard
              masterTemplate={masterTemplate}
              moduleStates={moduleStates}
              moduleOrder={moduleOrder}
              onModuleChange={handleModuleChange}
              onModuleOrderChange={handleModuleOrderChange}
              onResetToDefaults={handleResetToDefaults}
              moduleSelections={moduleSelections}
              onModuleSelectionChange={handleModuleSelectionChange}
              contactData={contactData}
              allPhrases={allPhrases}
              allInquiries={allInquiries}
              allSubjects={allSubjects}
              toneOverride={toneOverride}
              focusedContactId={null}
              customModuleLabels={customModuleLabels}
              onCustomModuleLabelChange={(moduleKey, newLabel) => {
                const updatedLabels = { ...customModuleLabels, [moduleKey]: newLabel };
                setCustomModuleLabels(updatedLabels);
                // Auto-save globally immediately with OCC (no manual save needed)
                autoSaveLabels.mutate({
                  customLabels: updatedLabels,
                  currentRevision: templateSettings?.revision,
                });
              }}
              onRandomize={handleRandomize}
              onRestoreToDefault={handleRestoreToDefault}
              isRandomized={isRandomized}
              changedModules={changedModules}
            />

            {/* Live Preview Panel */}
            {masterTemplate && contactData && (
              <ModuleContentPreview
                moduleOrder={moduleOrder}
                moduleStates={moduleStates}
                moduleSelections={moduleSelections}
                allPhrases={allPhrases}
                contactData={contactData}
                customModuleLabels={customModuleLabels}
                selectedSubjects={subjectPoolOverride}
                allSubjects={allSubjects || []}
                daysSinceContact={daysSinceContact}
                masterKey={masterTemplate.master_key}
              />
            )}
            
            {/* Module Selection Validation Warnings */}
            {moduleValidationErrors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                <p className="text-sm text-destructive font-medium">
                  Module Configuration Required:
                </p>
                <ul className="text-sm text-destructive list-disc list-inside space-y-0.5">
                  {moduleValidationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Subject Line Validation Warning */}
            {moduleStates.subject_line !== 'never' && !moduleSelections.subject_line?.phraseId && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Subject Line must be selected
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* ARIA Live Region for Module Reorder Announcements */}
        <div
          id="email-builder-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {ariaAnnouncement}
        </div>
        </>
        )}
        
        {/* Dialogs */}
        <ConflictDialog />
        <ContactOverrideDrawer
          open={overrideDrawerOpen}
          onOpenChange={setOverrideDrawerOpen}
          contactId={activeOverrideContactId}
          contactName={groupContacts.find(c => c.id === activeOverrideContactId)?.full_name || ''}
          contactEmail={groupContacts.find(c => c.id === activeOverrideContactId)?.email_address || ''}
          contactEmailCc={groupContacts.find(c => c.id === activeOverrideContactId)?.email_cc || null}
          contactMeetingCc={groupContacts.find(c => c.id === activeOverrideContactId)?.meeting_cc || null}
          contactDeltaType={groupContacts.find(c => c.id === activeOverrideContactId)?.delta_type as 'Email' | 'Meeting' | null}
          sharedSettings={{
            masterTemplate: masterTemplate,
            toneOverride: toneOverride || undefined,
            lengthOverride: lengthOverride || undefined,
            daysSinceContact,
            team: curatedTeam,
            to: curatedTo,
            cc: curatedCc,
            subjectLinePool: {
              selectedIds: subjectPoolOverride,
              style: (toneOverride || 'hybrid') as 'formal' | 'hybrid' | 'casual',
            },
            moduleSelections,
            moduleOrder,
            moduleStates,
          }}
          allMasterTemplates={masterTemplates || []}
          allSubjects={allSubjects || []}
          allPhrases={allPhrases || []}
          allInquiries={allInquiries || []}
          currentOverride={contactOverrides.get(activeOverrideContactId)}
          onSave={async (override) => {
            setContactOverrides(new Map(contactOverrides.set(override.contactId, override)));
            
            // Update focused contact for preview rail refresh with proper cache invalidation
            if (focusedContactId === override.contactId) {
              // Force immediate re-render by updating focused state
              const currentFocused = focusedContactId;
              setFocusedContactId(null);
              // Use microtask to ensure state update completes
              Promise.resolve().then(() => setFocusedContactId(currentFocused));
            }
            
            // Persist module order to DB so individual view reflects it
            if (override.moduleOrder && override.moduleOrder.length > 0) {
              // Load any existing row to preserve required fields
              const { data: existing } = await supabase
                .from('contact_email_builder_settings')
                .select('*')
                .eq('contact_id', override.contactId)
                .maybeSingle();

              const payload = {
                contact_id: override.contactId,
                module_order: override.moduleOrder,
                // Preserve or provide sane defaults for NOT NULL columns
                module_states: (existing?.module_states as any) || (moduleStates as any),
                delta_type: (existing?.delta_type as string) || (deltaType as string) || 'Email',
                selected_article_id: existing?.selected_article_id || null,
                module_selections: existing?.module_selections || (moduleSelections as any) || null,
                curated_recipients: existing?.curated_recipients || null,
              } as any;

              const { error: upsertErr } = await supabase
                .from('contact_email_builder_settings')
                .upsert([payload]);

              if (upsertErr) {
                console.error('Failed to save module order override', upsertErr);
              }
            }
          }}
        />
        
        <QueueDialog
          open={queueDialogOpen}
          onOpenChange={setQueueDialogOpen}
          queue={queueManager.queue}
          onRetry={queueManager.retryItem}
          onRetryAll={() => {
            // Retry all failed items
            Array.from(queueManager.queue.values())
              .filter(item => item.status === 'failed' && item.retryCount < 3)
              .forEach(item => queueManager.retryItem(item.contactId));
          }}
          onCancelPending={queueManager.cancelPending}
          isProcessing={queueManager.isProcessing}
        />
        
        {/* Confirm Save Dialog */}
        <ConfirmSaveDialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          scope={pendingSaveScope}
          contactName={selectedContact?.full_name || 'this contact'}
          templateName={masterTemplate ? MASTER_TEMPLATES[masterTemplate.master_key]?.label || masterTemplate.master_key : 'Unknown'}
          affectedFields={
            pendingSaveScope === 'contact' 
              ? ['coreSettings', 'moduleStates', 'moduleOrder', 'moduleSelections', 'team', 'recipients'] as AffectedField[]
              : ['coreSettings', 'moduleStates'] as AffectedField[]
          }
          onConfirm={handleConfirmSave}
          isRandomized={isRandomized}
          makeRandomizedDefaults={makeRandomizedDefaults}
          onMakeDefaultsChange={setMakeRandomizedDefaults}
        />
      </ResponsiveContainer>

      <PreviewModal 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={null}
        contactId={selectedContact?.contact_id || null}
        focusAreas={contactData?.focus_areas || []}
        hasOpps={contactData?.has_opps || false}
        lagDays={0}
      />

      {/* Keyboard Shortcuts Modal (MED-6) */}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}

// Export EmailBuilder wrapped with Error Boundary
export function EmailBuilder() {
  return (
    <EmailBuilderErrorBoundary>
      <EmailBuilderContent />
    </EmailBuilderErrorBoundary>
  );
}