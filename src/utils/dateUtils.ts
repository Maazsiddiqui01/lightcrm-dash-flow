import { parseISO, isValid } from 'date-fns';

/**
 * Parse dates flexibly from various formats returned by Supabase
 * Handles: yyyy-MM-dd, yyyy-MM-dd HH:mm:ssXXX, ISO with T/Z
 */
export function parseFlexibleDate(value: any): Date | null {
  if (!value) return null;
  
  const stringValue = String(value).trim();
  if (!stringValue) return null;
  
  try {
    // Try standard ISO parsing first (handles 2025-10-15T11:00:00Z)
    let date = parseISO(stringValue);
    if (isValid(date)) return date;
    
    // Handle Supabase timestamp format: "2025-10-15 11:00:00+00"
    if (stringValue.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{2}$/)) {
      date = new Date(stringValue);
      if (isValid(date)) return date;
    }
    
    // Handle date-only format: "2025-10-15"
    if (stringValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(stringValue + 'T00:00:00Z');
      if (isValid(date)) return date;
    }
    
    // Fallback to native Date constructor
    date = new Date(stringValue);
    if (isValid(date)) return date;
    
  } catch (error) {
    console.warn('Failed to parse date:', stringValue, error);
  }
  
  return null;
}