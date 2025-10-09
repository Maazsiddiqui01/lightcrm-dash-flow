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
  entityType: 'contacts' | 'opportunities'
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
    const rowNumber = index + 2; // +2 for header row and 1-based indexing
    const rowErrors: ValidationError[] = [];
    const rowWarnings: string[] = [];

    // Validate against column configurations
    configMap.forEach((config, columnName) => {
      const value = row[columnName];

      // Check required fields
      if (config.is_required && (value === null || value === undefined || value === '')) {
        rowErrors.push({
          row: rowNumber,
          field: config.display_name || columnName,
          message: 'Required field is missing',
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

  return { valid, invalid, warnings, normalized: [] };
}

function validateFieldType(value: any, config: ColumnConfig): string | null {
  const { field_type } = config;

  switch (field_type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return 'Invalid email format';
      }
      break;

    case 'number':
    case 'integer':
      if (isNaN(Number(value))) {
        return `Must be a valid ${field_type}`;
      }
      if (field_type === 'integer' && !Number.isInteger(Number(value))) {
        return 'Must be a whole number';
      }
      break;

    case 'boolean':
      const boolValues = ['true', 'false', '1', '0', 'yes', 'no', true, false, 1, 0];
      if (!boolValues.includes(String(value).toLowerCase()) && !boolValues.includes(value)) {
        return 'Must be true/false, yes/no, or 1/0';
      }
      break;

    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return 'Invalid date format (use YYYY-MM-DD)';
      }
      break;

    case 'datetime':
      const datetimeValue = new Date(value);
      if (isNaN(datetimeValue.getTime())) {
        return 'Invalid datetime format (use ISO 8601)';
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return 'Invalid URL format';
      }
      break;

    case 'phone':
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(String(value))) {
        return 'Invalid phone number format';
      }
      break;

    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        return 'Invalid UUID format';
      }
      break;
  }

  return null;
}

function applyValidationRule(value: any, rule: any, config: ColumnConfig): string | null {
  if (!rule || typeof rule !== 'object') return null;

  // Min/Max length for strings
  if (rule.minLength && String(value).length < rule.minLength) {
    return `Must be at least ${rule.minLength} characters`;
  }
  if (rule.maxLength && String(value).length > rule.maxLength) {
    return `Must be no more than ${rule.maxLength} characters`;
  }

  // Min/Max value for numbers
  if (rule.min !== undefined && Number(value) < rule.min) {
    return `Must be at least ${rule.min}`;
  }
  if (rule.max !== undefined && Number(value) > rule.max) {
    return `Must be no more than ${rule.max}`;
  }

  // Pattern matching
  if (rule.pattern) {
    const regex = new RegExp(rule.pattern);
    if (!regex.test(String(value))) {
      return rule.message || 'Does not match required pattern';
    }
  }

  // Enum/options validation
  if (rule.enum && Array.isArray(rule.enum)) {
    if (!rule.enum.includes(value)) {
      return `Must be one of: ${rule.enum.join(', ')}`;
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
