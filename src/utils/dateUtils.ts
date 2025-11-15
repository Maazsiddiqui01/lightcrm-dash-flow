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

/**
 * Get the current quarter and year in the format "Q1 2025"
 * Q1: January-March
 * Q2: April-June
 * Q3: July-September
 * Q4: October-December
 */
export function getCurrentQuarterYear(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  let quarter: number;
  if (month <= 2) {
    // Jan (0), Feb (1), Mar (2)
    quarter = 1;
  } else if (month <= 5) {
    // Apr (3), May (4), Jun (5)
    quarter = 2;
  } else if (month <= 8) {
    // Jul (6), Aug (7), Sep (8)
    quarter = 3;
  } else {
    // Oct (9), Nov (10), Dec (11)
    quarter = 4;
  }
  
  return `Q${quarter} ${year}`;
}