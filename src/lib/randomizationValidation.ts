/**
 * Validation utilities for randomization operations
 * Ensures prerequisites are met before randomizing email builder components
 */

import type { PhraseLibraryItem } from '@/types/phraseLibrary';

export interface RandomizeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that phrase libraries are loaded and have content
 */
export function validatePhraseLibraries(
  allPhrases: PhraseLibraryItem[] | null | undefined
): RandomizeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!allPhrases) {
    errors.push('Phrase libraries are not loaded yet');
    return { isValid: false, errors, warnings };
  }
  
  if (allPhrases.length === 0) {
    errors.push('Phrase libraries are empty. Please add phrases to Global Library first.');
    return { isValid: false, errors, warnings };
  }
  
  return { isValid: true, errors, warnings };
}

/**
 * Validates that subject pool has at least one enabled subject
 */
export function validateSubjectPoolForRandomize(
  subjectPoolIds: string[] | null | undefined
): RandomizeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!subjectPoolIds || subjectPoolIds.length === 0) {
    errors.push('Subject Line Pool must have at least one enabled subject');
    return { isValid: false, errors, warnings };
  }
  
  return { isValid: true, errors, warnings };
}

/**
 * Validates module order is not empty
 */
export function validateModuleOrder(
  moduleOrder: string[] | null | undefined
): RandomizeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!moduleOrder || moduleOrder.length === 0) {
    warnings.push('No modules configured for randomization');
    return { isValid: true, errors, warnings };
  }
  
  return { isValid: true, errors, warnings };
}

/**
 * Comprehensive validation before randomization
 * Checks all prerequisites in one call
 */
export function validateBeforeRandomize(
  allPhrases: PhraseLibraryItem[] | null | undefined,
  subjectPoolIds: string[] | null | undefined,
  moduleOrder: string[] | null | undefined
): RandomizeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check phrase libraries
  const phraseCheck = validatePhraseLibraries(allPhrases);
  errors.push(...phraseCheck.errors);
  warnings.push(...phraseCheck.warnings);
  
  // Check subject pool
  const subjectCheck = validateSubjectPoolForRandomize(subjectPoolIds);
  errors.push(...subjectCheck.errors);
  warnings.push(...subjectCheck.warnings);
  
  // Check module order
  const orderCheck = validateModuleOrder(moduleOrder);
  warnings.push(...orderCheck.warnings);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
