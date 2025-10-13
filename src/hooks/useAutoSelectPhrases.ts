import { useEffect, useRef } from 'react';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { ModuleSelections, ModuleSelection } from '@/types/moduleSelections';
import type { PhraseLibraryItem } from '@/types/phraseLibrary';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';
import { MODULE_LIBRARY_MAP } from '@/config/moduleCategoryMap';
import { SINGLE_SELECT_MODULES, MULTI_SELECT_MODULES } from '@/config/moduleCategoryMap';

interface UseAutoSelectPhrasesProps {
  contactId: string | null;
  moduleStates: ModuleStates;
  moduleSelections: ModuleSelections;
  allPhrases: PhraseLibraryItem[];
  allSubjects: SubjectLibraryItem[];
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
  onSelectionChange: (updates: Partial<ModuleSelections>) => void;
}

export function useAutoSelectPhrases({
  contactId,
  moduleStates,
  moduleSelections,
  allPhrases,
  allSubjects,
  toneOverride,
  onSelectionChange,
}: UseAutoSelectPhrasesProps) {
  // Track previous contact to only auto-select when switching contacts
  const previousContactRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Skip if no contact selected
    if (!contactId) return;
    
    // Skip if no phrases/subjects available yet
    if (allPhrases.length === 0 && allSubjects.length === 0) return;
    
    // ONLY auto-select when switching to a NEW contact
    const isNewContact = contactId !== previousContactRef.current;
    if (!isNewContact) {
      // Same contact - preserve user selections, don't re-auto-select
      return;
    }

    // Check if we need to auto-select for any modules
    let needsAutoSelection = false;

    // Check each single-select module
    SINGLE_SELECT_MODULES.forEach((moduleKey) => {
      if (moduleStates[moduleKey] !== 'never' && !moduleSelections[moduleKey]?.phraseId) {
        needsAutoSelection = true;
      }
    });

    // Check each multi-select module (now using single phraseId)
    MULTI_SELECT_MODULES.forEach((moduleKey) => {
      if (moduleStates[moduleKey] !== 'never' && !moduleSelections[moduleKey]?.phraseId) {
        needsAutoSelection = true;
      }
    });

    // Exit early if no modules need auto-selection
    if (!needsAutoSelection) {
      previousContactRef.current = contactId;
      return;
    }

    const updates: Partial<ModuleSelections> = {};
    let hasUpdates = false;

    // Iterate through all single-select modules
    SINGLE_SELECT_MODULES.forEach((moduleKey) => {
      // Skip if module is disabled (never)
      if (moduleStates[moduleKey] === 'never') return;

      // Skip if already has selection
      const currentSelection = moduleSelections[moduleKey];
      if (currentSelection?.phraseId) return;

      // Get category for this module
      const category = MODULE_LIBRARY_MAP[moduleKey];
      if (!category) return;

      // Special handling for subject_line
      if (moduleKey === 'subject_line') {
        const filteredSubjects = toneOverride
          ? allSubjects.filter(s => s.style === toneOverride)
          : allSubjects;

        if (filteredSubjects.length > 0) {
          const firstSubject = filteredSubjects[0];
          updates.subject_line = {
            type: 'phrase',
            category: 'subject',
            phraseId: firstSubject.id,
            phraseText: firstSubject.subject_template,
          };
          hasUpdates = true;
        } else if (allSubjects.length > 0) {
          // Fallback: if tone filter yields nothing, use first available subject
          console.warn(`⚠️ No subjects found for tone "${toneOverride}", using first available subject`);
          const firstSubject = allSubjects[0];
          updates.subject_line = {
            type: 'phrase',
            category: 'subject',
            phraseId: firstSubject.id,
            phraseText: firstSubject.subject_template,
          };
          hasUpdates = true;
        } else {
          console.error('❌ No subjects available in library for auto-selection');
        }
        return;
      }

      // Get phrases for this category
      const categoryPhrases = allPhrases.filter(p => p.category === category);
      if (categoryPhrases.length === 0) {
        console.warn(`⚠️ No phrases found for category "${category}" (module: ${moduleKey})`);
        return;
      }

      // Auto-select first phrase
      const firstPhrase = categoryPhrases[0];
      updates[moduleKey] = {
        type: 'phrase',
        category,
        phraseId: firstPhrase.id,
        phraseText: firstPhrase.phrase_text,
      };
      hasUpdates = true;
    });

    // Iterate through all multi-select modules - now enforcing exactly 1 selection (using phraseId)
    MULTI_SELECT_MODULES.forEach((moduleKey) => {
      // Skip if module is disabled (never)
      if (moduleStates[moduleKey] === 'never') return;

      // Skip if already has selection
      const currentSelection = moduleSelections[moduleKey];
      if (currentSelection?.phraseId) return;

      // Get category for this module
      const category = MODULE_LIBRARY_MAP[moduleKey];
      if (!category) return;

      // Get phrases for this category
      const categoryPhrases = allPhrases.filter(p => p.category === category);
      if (categoryPhrases.length === 0) {
        console.warn(`⚠️ No phrases found for category "${category}" (module: ${moduleKey})`);
        return;
      }

      // Auto-select exactly 1 phrase (single selection, not array)
      const firstPhrase = categoryPhrases[0];
      updates[moduleKey] = {
        type: 'phrase',
        category,
        phraseId: firstPhrase.id,
        phraseText: firstPhrase.phrase_text,
      };
      hasUpdates = true;
    });

    // Apply all updates at once
    if (hasUpdates) {
      console.log('🎯 Auto-selecting default phrases', {
        contactId,
        modulesUpdated: Object.keys(updates),
        updateCount: Object.keys(updates).length,
        updates
      });
      onSelectionChange(updates);
    }
    
    // Mark this contact as initialized
    previousContactRef.current = contactId;
  }, [
    contactId,
    moduleStates,
    moduleSelections,
    allPhrases,
    allSubjects,
    toneOverride,
    onSelectionChange,
  ]);
}
