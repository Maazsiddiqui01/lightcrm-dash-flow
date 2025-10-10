/**
 * Email Builder Validation Utilities
 * Comprehensive validation for payload generation and subject pool enforcement
 */

import type { ContactEmailComposer } from '@/types/emailComposer';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';

export interface PayloadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that at least one subject is enabled in the subject pool
 */
export function validateSubjectPool(subjectPoolOverride: string[]): PayloadValidationResult {
  const errors: string[] = [];
  
  if (!subjectPoolOverride || subjectPoolOverride.length === 0) {
    errors.push('Subject Line Pool must have at least one enabled subject');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validates all required fields before generating draft payload
 */
export function validateDraftPayload(
  contact: ContactEmailComposer | null,
  masterTemplate: any,
  moduleStates: ModuleStates,
  subjectPoolOverride: string[],
  curatedTo: string,
  deltaType: 'Email' | 'Meeting'
): PayloadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Contact validation
  if (!contact) {
    errors.push('Contact is required');
  } else {
    if (!contact.email) {
      errors.push('Contact email is required');
    }
    if (!contact.full_name) {
      errors.push('Contact full name is required');
    }
    if (!contact.first_name) {
      warnings.push('Contact first name is missing');
    }
    if (!contact.organization) {
      warnings.push('Contact organization is missing');
    }
  }
  
  // Master template validation
  if (!masterTemplate) {
    errors.push('Master template is required');
  }
  
  // Subject pool validation
  const subjectValidation = validateSubjectPool(subjectPoolOverride);
  errors.push(...subjectValidation.errors);
  warnings.push(...subjectValidation.warnings);
  
  // Recipients validation
  if (!curatedTo || curatedTo.trim() === '') {
    errors.push('Primary recipient (TO) is required');
  } else if (!isValidEmail(curatedTo)) {
    errors.push('Primary recipient email is invalid');
  }
  
  // Delta type validation
  if (!deltaType) {
    errors.push('Delta type (Email/Meeting) is required');
  }
  
  // Module states validation
  if (!moduleStates || Object.keys(moduleStates).length === 0) {
    warnings.push('No module states configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates and normalizes email addresses
 */
export function validateAndNormalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return isValidEmail(normalized) ? normalized : null;
}

/**
 * Validates CC list and removes duplicates/invalids
 */
export function validateCcList(ccList: string[], toEmail: string): PayloadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const normalizedTo = validateAndNormalizeEmail(toEmail);
  
  ccList.forEach((email, index) => {
    const normalized = validateAndNormalizeEmail(email);
    
    if (!normalized) {
      errors.push(`CC email at position ${index + 1} is invalid: ${email}`);
    } else if (normalized === normalizedTo) {
      warnings.push(`CC email ${email} is already in TO field`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates template ID is present for contact saves
 */
export function validateTemplateId(templateId: string | null): PayloadValidationResult {
  const errors: string[] = [];
  
  if (!templateId) {
    errors.push('Template ID is required for saving contact settings');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validates module phrase selections
 * Ensures phrase-driven modules have required selections when enabled
 */
export function validateModuleSelections(
  moduleStates: ModuleStates,
  moduleSelections: Record<string, any>
): PayloadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Import module configs
  const { 
    PHRASE_DRIVEN_MODULES, 
    SINGLE_SELECT_MODULES, 
    MULTI_SELECT_MODULES,
    MODULE_LIBRARY_MAP 
  } = require('@/config/moduleCategoryMap');
  
  // Check each phrase-driven module
  for (const moduleKey of PHRASE_DRIVEN_MODULES) {
    const mode = moduleStates[moduleKey];
    
    // Skip if module is disabled (never)
    if (mode === 'never') continue;
    
    const selection = moduleSelections[moduleKey];
    const category = MODULE_LIBRARY_MAP[moduleKey];
    
    // Single-select validation
    if (SINGLE_SELECT_MODULES.has(moduleKey)) {
      if (!selection?.phraseId && !selection?.greetingId) {
        errors.push(`Select one phrase for ${formatModuleName(moduleKey)} (${category})`);
      }
    }
    
    // Multi-select validation
    if (MULTI_SELECT_MODULES.has(moduleKey)) {
      if (!selection?.phraseIds || selection.phraseIds.length === 0) {
        errors.push(`Select at least one phrase for ${formatModuleName(moduleKey)} (${category})`);
      }
    }
  }
  
  // Validate subject line pool primary
  if (moduleSelections.subject_line_pool) {
    const { subjectIds, defaultSubjectId } = moduleSelections.subject_line_pool;
    
    if (!defaultSubjectId) {
      errors.push('Subject Line Pool: Select a primary subject');
    } else if (subjectIds && !subjectIds.includes(defaultSubjectId)) {
      errors.push('Subject Line Pool: Primary subject must be enabled');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format module key to human-readable name
 */
function formatModuleName(moduleKey: string): string {
  return moduleKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
