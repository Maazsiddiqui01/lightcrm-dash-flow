import { useEffect, useRef } from 'react';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { ModuleSelections, ModuleSelection } from '@/types/moduleSelections';
import type { PhraseLibraryItem } from '@/types/phraseLibrary';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';
import { MODULE_LIBRARY_MAP } from '@/config/moduleCategoryMap';
import { SINGLE_SELECT_MODULES } from '@/config/moduleCategoryMap';

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
  // Track which contact we've initialized to avoid re-triggering
  const initializedContactRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run once per contact
    if (!contactId || initializedContactRef.current === contactId) return;
    if (allPhrases.length === 0 && allSubjects.length === 0) return;

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
        }
        return;
      }

      // Get phrases for this category
      const categoryPhrases = allPhrases.filter(p => p.category === category);
      if (categoryPhrases.length === 0) return;

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

    // Apply all updates at once
    if (hasUpdates) {
      console.log('🎯 Auto-selecting default phrases for contact:', contactId, updates);
      onSelectionChange(updates);
    }

    // Mark this contact as initialized
    initializedContactRef.current = contactId;
  }, [
    contactId,
    moduleStates,
    moduleSelections,
    allPhrases,
    allSubjects,
    toneOverride,
    onSelectionChange,
  ]);

  // Reset initialization when contact changes
  useEffect(() => {
    if (contactId !== initializedContactRef.current) {
      initializedContactRef.current = null;
    }
  }, [contactId]);
}
