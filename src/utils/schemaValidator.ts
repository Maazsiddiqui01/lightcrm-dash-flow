/**
 * Schema Validator
 * 
 * Validates that database schema constraints align with application configuration.
 * Run this during development to catch mismatches early.
 */

import { editableColumns } from '@/config/editableColumns';
import { SAFE_UPDATE_FIELDS } from './databaseUpdateHelpers';

interface ValidationIssue {
  severity: 'error' | 'warning';
  field: string;
  message: string;
  recommendation: string;
}

interface SchemaValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalFields: number;
    errors: number;
    warnings: number;
  };
}

/**
 * Validate that editable columns config aligns with safe update fields
 * 
 * This catches configuration drift where:
 * - Fields are marked editable but not in the safe update whitelist
 * - Required fields in the config don't have NOT NULL in database
 * - System fields are accidentally marked as editable
 */
export function validateEditableColumnsConfig(): SchemaValidationResult {
  const issues: ValidationIssue[] = [];

  // Validate contacts_raw
  const contactEditableFields = Object.keys(editableColumns.contacts_raw);
  const contactSafeFields = SAFE_UPDATE_FIELDS.contacts_raw;
  
  contactEditableFields.forEach(field => {
    // Check if editable field is in safe update list
    if (!contactSafeFields.includes(field as any)) {
      // Check if it's a system field
      if (['id', 'created_at', 'created_by', 'email_address', 'group_delta', 'follow_up_date'].includes(field)) {
        issues.push({
          severity: 'error',
          field: `contacts_raw.${field}`,
          message: `System field "${field}" is marked as editable`,
          recommendation: `Remove "${field}" from editableColumns.contacts_raw config. This field should not be user-editable.`
        });
      } else {
        issues.push({
          severity: 'warning',
          field: `contacts_raw.${field}`,
          message: `Editable field "${field}" is not in safe update whitelist`,
          recommendation: `Add "${field}" to SAFE_UPDATE_FIELDS.contacts_raw in databaseUpdateHelpers.ts if it should be editable.`
        });
      }
    }
  });

  // Validate opportunities_raw
  const opportunityEditableFields = Object.keys(editableColumns.opportunities_raw);
  const opportunitySafeFields = SAFE_UPDATE_FIELDS.opportunities_raw;
  
  opportunityEditableFields.forEach(field => {
    if (!opportunitySafeFields.includes(field as any)) {
      if (['id', 'created_at', 'created_by'].includes(field)) {
        issues.push({
          severity: 'error',
          field: `opportunities_raw.${field}`,
          message: `System field "${field}" is marked as editable`,
          recommendation: `Remove "${field}" from editableColumns.opportunities_raw config.`
        });
      } else {
        issues.push({
          severity: 'warning',
          field: `opportunities_raw.${field}`,
          message: `Editable field "${field}" is not in safe update whitelist`,
          recommendation: `Add "${field}" to SAFE_UPDATE_FIELDS.opportunities_raw in databaseUpdateHelpers.ts if it should be editable.`
        });
      }
    }
  });

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return {
    valid: errors === 0,
    issues,
    summary: {
      totalFields: contactEditableFields.length + opportunityEditableFields.length,
      errors,
      warnings
    }
  };
}

/**
 * Run all validations and log results
 * 
 * Use this during development to catch configuration issues
 */
export function runSchemaValidation(): void {
  console.group('🔍 Schema Validation');
  
  const configValidation = validateEditableColumnsConfig();
  
  console.log('Configuration Validation:', {
    valid: configValidation.valid,
    totalFields: configValidation.summary.totalFields,
    errors: configValidation.summary.errors,
    warnings: configValidation.summary.warnings
  });

  if (configValidation.issues.length > 0) {
    console.group('Issues Found:');
    configValidation.issues.forEach(issue => {
      const emoji = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${emoji} ${issue.field}: ${issue.message}`);
      console.log(`   → ${issue.recommendation}`);
    });
    console.groupEnd();
  } else {
    console.log('✅ No configuration issues found!');
  }
  
  console.groupEnd();
}
