/**
 * Validates module selections against current phrase/inquiry/subject libraries
 * Removes stale references to deleted items
 */

import type { ModuleSelections } from '@/types/moduleSelections';
import type { PhraseLibraryItem } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from '@/hooks/useInquiryLibrary';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';

export interface ValidationResult {
  isValid: boolean;
  cleanedSelections: ModuleSelections;
  removedItems: {
    module: string;
    itemId: string;
    itemText?: string;
  }[];
}

/**
 * Validates and cleans module selections
 * Removes references to deleted phrases/inquiries/subjects
 */
export function validateModuleSelections(
  moduleSelections: ModuleSelections,
  allPhrases: PhraseLibraryItem[],
  allInquiries: InquiryLibraryItem[],
  allSubjects: SubjectLibraryItem[]
): ValidationResult {
  const cleanedSelections: ModuleSelections = {};
  const removedItems: ValidationResult['removedItems'] = [];

  // Create lookup sets for fast validation
  const phraseIds = new Set(allPhrases.map(p => p.id));
  const inquiryIds = new Set(allInquiries.map(i => i.id));
  const subjectIds = new Set(allSubjects.map(s => s.id));

  // Validate each module's selections
  Object.entries(moduleSelections).forEach(([moduleKey, selection]) => {
    if (!selection) {
      cleanedSelections[moduleKey as keyof ModuleSelections] = selection;
      return;
    }

    const cleanedSelection = { ...selection };

    // Validate single-select phrase modules
    if (selection.phraseId) {
      if (!phraseIds.has(selection.phraseId)) {
        removedItems.push({
          module: moduleKey,
          itemId: selection.phraseId,
          itemText: selection.phraseText,
        });
        delete cleanedSelection.phraseId;
        delete cleanedSelection.phraseText;
      }
    }

    // Validate default phrase ID
    if (selection.defaultPhraseId) {
      if (!phraseIds.has(selection.defaultPhraseId)) {
        removedItems.push({
          module: moduleKey,
          itemId: selection.defaultPhraseId,
          itemText: 'default phrase',
        });
        delete cleanedSelection.defaultPhraseId;
        delete cleanedSelection.isDefault;
      }
    }

    // Legacy phraseIds validation removed - multi-select now uses phraseId (single selection)

    // Validate inquiry modules
    if (selection.inquiryId) {
      if (!inquiryIds.has(selection.inquiryId)) {
        removedItems.push({
          module: moduleKey,
          itemId: selection.inquiryId,
        });
        delete cleanedSelection.inquiryId;
      }
    }

    // Validate article recommendations (article IDs are URLs, harder to validate)
    // Skip validation for articleId as it's a URL, not an ID we can validate against

    // Validate subject pool
    if (selection.subjectIds && Array.isArray(selection.subjectIds)) {
      const validSubjectIds = selection.subjectIds.filter(id => {
        const isValid = subjectIds.has(id);
        if (!isValid) {
          removedItems.push({
            module: moduleKey,
            itemId: id,
          });
        }
        return isValid;
      });
      cleanedSelection.subjectIds = validSubjectIds;
    }

    // Validate default subject
    if (selection.defaultSubjectId) {
      if (!subjectIds.has(selection.defaultSubjectId)) {
        removedItems.push({
          module: moduleKey,
          itemId: selection.defaultSubjectId,
          itemText: 'default subject',
        });
        delete cleanedSelection.defaultSubjectId;
      }
    }

    cleanedSelections[moduleKey as keyof ModuleSelections] = cleanedSelection;
  });

  return {
    isValid: removedItems.length === 0,
    cleanedSelections,
    removedItems,
  };
}
