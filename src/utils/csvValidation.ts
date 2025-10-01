import { getEditableColumns, type EditableFieldConfig } from "@/config/editableColumns";

export function validateCsvData(data: any[], entityType: 'contacts' | 'opportunities') {
  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  const editableConfig = getEditableColumns(tableName as any);
  
  const valid: any[] = [];
  const invalid: Array<{ row: number; errors: string[] }> = [];
  const warnings: Array<{ row: number; message: string }> = [];

  data.forEach((row) => {
    const errors: string[] = [];
    const rowWarnings: string[] = [];

    // Validate each field based on config
    Object.entries(editableConfig).forEach(([field, config]) => {
      const value = row[field];

      // Check required fields
      if (config.required && (value === null || value === undefined || value === '')) {
        errors.push(`${field} is required`);
        return;
      }

      // Skip validation if field is empty and not required
      if (!value) return;

      // Type validation
      if (config.type === 'email' && config.validation) {
        if (!config.validation(value)) {
          errors.push(`Invalid email format for ${field}`);
        }
      }

      if (config.type === 'number' && config.validation) {
        if (!config.validation(value)) {
          errors.push(`Invalid number format for ${field}`);
        }
      }

      // Options validation (for select/dropdown fields)
      if (config.type === 'select' && config.options && Array.isArray(config.options)) {
        const validOptions = config.options.map((opt: any) => 
          typeof opt === 'string' ? opt : opt.value
        );
        if (!validOptions.includes(value)) {
          errors.push(`Invalid value "${value}" for ${field}. Must be one of: ${validOptions.join(', ')}`);
        }
      }
    });

    // Entity-specific validations
    if (entityType === 'contacts') {
      // Email is required for contacts
      if (!row.email_address) {
        errors.push('email_address is required for contacts');
      }
    } else if (entityType === 'opportunities') {
      // Deal name is required for opportunities
      if (!row.deal_name) {
        errors.push('deal_name is required for opportunities');
      }
    }

    if (errors.length > 0) {
      invalid.push({ row: row._rowNumber, errors });
    } else {
      // Remove the temporary row number before adding to valid
      const { _rowNumber, ...cleanRow } = row;
      valid.push(cleanRow);
      
      if (rowWarnings.length > 0) {
        warnings.push({ row: row._rowNumber, message: rowWarnings.join('; ') });
      }
    }
  });

  return { valid, invalid, warnings, normalized: [] };
}

export function generateTemplate(entityType: 'contacts' | 'opportunities'): string {
  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  const editableConfig = getEditableColumns(tableName as any);
  
  const headers: string[] = [];
  const sampleRow: string[] = [];
  const notesRow: string[] = [];

  Object.entries(editableConfig).forEach(([field, config]) => {
    headers.push(field);
    
    // Sample value based on type
    let sample = '';
    if (config.type === 'text') sample = 'Sample Text';
    else if (config.type === 'email') sample = 'email@example.com';
    else if (config.type === 'number') sample = '100';
    else if (config.type === 'date') sample = '2025-01-01';
    else if (config.type === 'boolean') sample = 'true';
    else if (config.type === 'select' && config.options && Array.isArray(config.options)) {
      const firstOption: any = config.options[0];
      sample = typeof firstOption === 'string' ? firstOption : firstOption.value;
    }
    
    sampleRow.push(sample);
    
    // Notes about the field
    let note = config.required ? 'REQUIRED' : 'Optional';
    if (config.type === 'select' && config.options && Array.isArray(config.options)) {
      const validOptions = config.options.slice(0, 3).map((opt: any) => 
        typeof opt === 'string' ? opt : opt.value
      ).join('/');
      note += ` (${validOptions}${config.options.length > 3 ? '...' : ''})`;
    }
    notesRow.push(note);
  });

  // Build CSV
  const lines = [
    headers.map(h => `"${h}"`).join(','),
    sampleRow.map(v => `"${v}"`).join(','),
    notesRow.map(n => `"# ${n}"`).join(',')
  ];

  return lines.join('\n');
}
