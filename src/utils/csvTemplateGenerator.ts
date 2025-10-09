import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a CSV template dynamically based on column configurations
 */
export async function generateCsvTemplate(entityType: 'contacts' | 'opportunities'): Promise<string> {
  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';

  // Fetch editable columns from database
  const { data: columns, error } = await supabase
    .from('column_configurations')
    .select('column_name, display_name, is_required, field_type')
    .eq('table_name', tableName)
    .eq('is_editable', true)
    .order('column_name');

  if (error) {
    console.error('Failed to fetch column configurations:', error);
    throw new Error('Failed to generate template');
  }

  // Create CSV header with display names
  const headers = (columns || [])
    .map(col => col.display_name || col.column_name)
    .join(',');

  // Create a sample row with examples
  const sampleRow = (columns || [])
    .map(col => {
      if (col.is_required) {
        return getSampleValue(col.field_type, col.column_name);
      }
      return ''; // Optional fields can be empty
    })
    .join(',');

  return `${headers}\n${sampleRow}`;
}

function getSampleValue(fieldType: string, columnName: string): string {
  switch (fieldType) {
    case 'email':
      return 'example@company.com';
    case 'phone':
      return '+1-555-0123';
    case 'url':
      return 'https://example.com';
    case 'date':
      return '2024-01-15';
    case 'datetime':
      return '2024-01-15T10:30:00Z';
    case 'number':
    case 'integer':
      return '100';
    case 'boolean':
      return 'true';
    case 'text':
    default:
      // Provide context-specific examples
      if (columnName.includes('name')) return 'John Smith';
      if (columnName.includes('organization')) return 'Acme Corporation';
      if (columnName.includes('title')) return 'CEO';
      if (columnName.includes('city')) return 'New York';
      if (columnName.includes('state')) return 'NY';
      if (columnName.includes('sector')) return 'Technology';
      return 'Example value';
  }
}

/**
 * Downloads a CSV template file
 */
export async function downloadCsvTemplate(entityType: 'contacts' | 'opportunities') {
  try {
    const csvContent = await generateCsvTemplate(entityType);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityType}_import_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download template:', error);
    throw error;
  }
}
