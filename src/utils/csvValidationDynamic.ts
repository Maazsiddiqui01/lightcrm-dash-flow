import { supabase } from "@/integrations/supabase/client";

interface ColumnConfig {
  column_name: string;
  field_type: string;
  is_required: boolean;
  is_editable: boolean;
  validation_rules: any; // Json type from Supabase
  display_name: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  valid: any[];
  invalid: ValidationError[];
  warnings: Array<{ row: number; message: string }>;
  normalized?: Array<{ row: number; field: string; original: string; corrected: string }>;
}

export async function validateCsvDataDynamic(
  data: any[],
  entityType: 'contacts' | 'opportunities',
  isUpdateMode: boolean = false
): Promise<ValidationResult> {
  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';

  // Fetch column configurations from database
  const { data: columnConfigs, error } = await supabase
    .from('column_configurations')
    .select('*')
    .eq('table_name', tableName)
    .eq('is_editable', true); // Only validate editable columns

  if (error) {
    console.error('Failed to fetch column configurations:', error);
    throw new Error('Failed to load validation rules');
  }

  const configMap = new Map<string, ColumnConfig>();
  (columnConfigs || []).forEach(config => {
    configMap.set(config.column_name, config);
  });

  const valid: any[] = [];
  const invalid: ValidationError[] = [];
  const warnings: Array<{ row: number; message: string }> = [];

  data.forEach((row, index) => {
    const rowNumber = row._rowNumber || (index + 2); // Use stored row number or calculate
    const rowErrors: ValidationError[] = [];
    const rowWarnings: string[] = [];

    // For update mode, validate ID field format only (existence check comes later)
    if (isUpdateMode) {
      if (row.id && row.id !== '') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(row.id))) {
          rowErrors.push({
            row: rowNumber,
            field: 'ID',
            message: `🔴 Invalid ID format. Expected a UUID like "123e4567-e89b-12d3-a456-426614174000" but got "${row.id}". Check your ID column format.`,
            value: row.id
          });
        }
      }
    }

    // Validate against column configurations
    configMap.forEach((config, columnName) => {
      const value = row[columnName];

      // Skip required field validation in update mode (only updating provided fields)
      if (!isUpdateMode && config.is_required && (value === null || value === undefined || value === '')) {
        rowErrors.push({
          row: rowNumber,
          field: config.display_name || columnName,
          message: `🔴 ${config.display_name || columnName} is required but is empty. This field must be filled in to import this row.`,
          value: value
        });
        return;
      }

      // Skip validation if field is empty and not required
      if (value === null || value === undefined || value === '') return;

      // Type-based validation
      const validationError = validateFieldType(value, config);
      if (validationError) {
        rowErrors.push({
          row: rowNumber,
          field: config.display_name || columnName,
          message: validationError,
          value: value
        });
      }

      // Apply custom validation rules
      if (config.validation_rules) {
        const rules = Array.isArray(config.validation_rules) 
          ? config.validation_rules 
          : typeof config.validation_rules === 'string'
            ? JSON.parse(config.validation_rules)
            : [];
            
        for (const rule of rules) {
          const ruleError = applyValidationRule(value, rule, config);
          if (ruleError) {
            rowErrors.push({
              row: rowNumber,
              field: config.display_name || columnName,
              message: ruleError,
              value: value
            });
          }
        }
      }
    });

    // Check for unknown columns
    Object.keys(row).forEach(key => {
      if (!configMap.has(key) && key !== 'id') {
        rowWarnings.push(`Unknown column "${key}" will be ignored`);
      }
    });

    // Add to results
    if (rowErrors.length > 0) {
      invalid.push(...rowErrors);
    } else {
      valid.push(row);
      if (rowWarnings.length > 0) {
        warnings.push({
          row: rowNumber,
          message: rowWarnings.join('; ')
        });
      }
    }
  });

  // Additional validation for update mode: check if IDs exist in database
  if (isUpdateMode && valid.length > 0) {
    const idsToCheck = valid
      .map(row => row.id)
      .filter(id => id !== null && id !== undefined && id !== '');
    
    if (idsToCheck.length > 0) {
      const { data: existingRecords, error } = await supabase
        .from(tableName)
        .select('id')
        .in('id', idsToCheck);

      if (!error && existingRecords) {
        const existingIdSet = new Set(existingRecords.map(r => r.id));
        
        // Re-validate: move rows with non-existent IDs from valid to invalid
        const validFiltered: any[] = [];
        valid.forEach(row => {
          if (row.id && !existingIdSet.has(row.id)) {
            invalid.push({
              row: row._rowNumber || 0,
              field: 'ID',
              message: `🔴 Record not found in database. The ID "${row.id}" does not exist. You can only update existing records. To add new records, use "Add New" mode instead.`,
              value: row.id
            });
          } else {
            validFiltered.push(row);
          }
        });
        
        return { 
          valid: validFiltered, 
          invalid, 
          warnings, 
          normalized: [] 
        };
      }
    }
  }

  return { valid, invalid, warnings, normalized: [] };
}

function validateFieldType(value: any, config: ColumnConfig): string | null {
  const { field_type, display_name, column_name } = config;
  const fieldName = display_name || column_name;

  switch (field_type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return `🔴 Invalid email address. "${value}" is not a valid email format. Example: user@company.com`;
      }
      break;

    case 'number':
    case 'integer':
      if (isNaN(Number(value))) {
        return `🔴 Must be a number. "${value}" cannot be converted to a ${field_type}. Remove any letters or special characters.`;
      }
      if (field_type === 'integer' && !Number.isInteger(Number(value))) {
        return `🔴 Must be a whole number. "${value}" contains decimals. Round to the nearest whole number.`;
      }
      break;

    case 'boolean':
      const boolValues = ['true', 'false', '1', '0', 'yes', 'no', true, false, 1, 0];
      if (!boolValues.includes(String(value).toLowerCase()) && !boolValues.includes(value)) {
        return `🔴 Invalid boolean value. "${value}" must be one of: true, false, yes, no, 1, or 0.`;
      }
      break;

    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return `🔴 Invalid date. "${value}" is not a valid date. Use format: YYYY-MM-DD (e.g., 2024-12-31)`;
      }
      break;

    case 'datetime':
      const datetimeValue = new Date(value);
      if (isNaN(datetimeValue.getTime())) {
        return `🔴 Invalid datetime. "${value}" is not a valid datetime. Use ISO format (e.g., 2024-12-31T14:30:00Z)`;
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return `🔴 Invalid URL. "${value}" is not a valid web address. Must start with http:// or https://`;
      }
      break;

    case 'phone':
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(String(value))) {
        return `🔴 Invalid phone number. "${value}" contains invalid characters. Only use digits, spaces, +, -, and parentheses.`;
      }
      break;

    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        return `🔴 Invalid UUID. "${value}" must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)`;
      }
      break;
  }

  return null;
}

function applyValidationRule(value: any, rule: any, config: ColumnConfig): string | null {
  if (!rule || typeof rule !== 'object') return null;
  
  const fieldName = config.display_name || config.column_name;

  // Min/Max length for strings
  if (rule.minLength && String(value).length < rule.minLength) {
    return `🟡 Too short. "${value}" is only ${String(value).length} characters but needs at least ${rule.minLength} characters.`;
  }
  if (rule.maxLength && String(value).length > rule.maxLength) {
    return `🔴 Too long. "${value}" is ${String(value).length} characters but maximum is ${rule.maxLength}. Shorten this value.`;
  }

  // Min/Max value for numbers
  if (rule.min !== undefined && Number(value) < rule.min) {
    return `🔴 Value too small. ${value} is below the minimum of ${rule.min}.`;
  }
  if (rule.max !== undefined && Number(value) > rule.max) {
    return `🔴 Value too large. ${value} exceeds the maximum of ${rule.max}.`;
  }

  // Pattern matching
  if (rule.pattern) {
    const regex = new RegExp(rule.pattern);
    if (!regex.test(String(value))) {
      return rule.message || `🔴 Invalid format. "${value}" does not match the required pattern.`;
    }
  }

  // Enum/options validation
  if (rule.enum && Array.isArray(rule.enum)) {
    if (!rule.enum.includes(value)) {
      return `🔴 Invalid option. "${value}" is not allowed. Must be one of: ${rule.enum.join(', ')}`;
    }
  }

  return null;
}

export function generateValidationReport(result: ValidationResult): string {
  let report = '# CSV Validation Report\n\n';

  report += `**Total Rows:** ${result.valid.length + result.invalid.length}\n`;
  report += `**Valid Rows:** ${result.valid.length}\n`;
  report += `**Invalid Rows:** ${result.invalid.length}\n`;
  report += `**Warnings:** ${result.warnings.length}\n\n`;

  if (result.invalid.length > 0) {
    report += '## Errors\n\n';
    report += '| Row | Field | Error | Value |\n';
    report += '|-----|-------|-------|-------|\n';
    
    result.invalid.forEach(error => {
      report += `| ${error.row} | ${error.field} | ${error.message} | ${error.value || '(empty)'} |\n`;
    });
    report += '\n';
  }

  if (result.warnings.length > 0) {
    report += '## Warnings\n\n';
    result.warnings.forEach(warning => {
      report += `- Row ${warning.row}: ${warning.message}\n`;
    });
    report += '\n';
  }

  return report;
}
