/**
 * CSV Data Normalization Utilities
 * 
 * Centralizes normalization logic for CSV imports to ensure consistent
 * handling of empty strings, null-like values, whitespace, and numeric conversions.
 */

/**
 * Normalize a single value from CSV
 * Converts empty strings, whitespace, "null", "NULL", "undefined" to null
 */
export function normalizeValue(value: any): any {
  // Handle already null/undefined
  if (value === null || value === undefined) return null;
  
  const trimmed = String(value).trim();
  
  // Convert empty strings and null-like values to null
  if (
    trimmed === '' || 
    trimmed.toLowerCase() === 'null' || 
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed === '-'
  ) {
    return null;
  }
  
  return trimmed;
}

/**
 * Normalize a value with type awareness
 * Converts to appropriate type based on column metadata
 */
export function normalizeNumeric(value: any, columnType?: string): any {
  const normalized = normalizeValue(value);
  if (normalized === null) return null;
  
  // For numeric columns, convert to number
  if (columnType === 'numeric' || columnType === 'integer' || columnType === 'number') {
    // Remove common formatting characters
    const cleanedValue = normalized.replace(/[$,]/g, '');
    const num = Number(cleanedValue);
    return isNaN(num) ? null : num;
  }
  
  // For boolean columns
  if (columnType === 'boolean') {
    const lower = normalized.toLowerCase();
    if (['true', 'yes', '1', 't', 'y'].includes(lower)) return true;
    if (['false', 'no', '0', 'f', 'n'].includes(lower)) return false;
    return null;
  }
  
  return normalized;
}

/**
 * Normalize an entire CSV row
 * Applies type-aware normalization to all fields
 */
export function normalizeCsvRow(
  row: Record<string, any>,
  columnTypes?: Map<string, string>
): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(row)) {
    const columnType = columnTypes?.get(key);
    normalized[key] = normalizeNumeric(value, columnType);
  }
  
  return normalized;
}

/**
 * Get column type mappings for opportunities table
 */
export function getOpportunitiesColumnTypes(): Map<string, string> {
  return new Map([
    ['ebitda', 'numeric'],
    ['revenue', 'numeric'],
    ['est_deal_size', 'numeric'],
    ['est_lg_equity_invest', 'numeric'],
    ['dealcloud', 'boolean'],
  ]);
}

/**
 * Get column type mappings for contacts table
 */
export function getContactsColumnTypes(): Map<string, string> {
  return new Map([
    ['intentional_no_outreach', 'boolean'],
    ['delta', 'numeric'],
    ['follow_up_days', 'numeric'],
    ['follow_up_recency_threshold', 'numeric'],
  ]);
}
