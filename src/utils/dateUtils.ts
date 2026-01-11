import { parseISO, isValid, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Parse dates flexibly from various formats returned by Supabase
 * Handles: yyyy-MM-dd, yyyy-MM-dd HH:mm:ssXXX, ISO with T/Z
 */
export function parseFlexibleDate(value: any): Date | null {
  if (!value) return null;
  
  const stringValue = String(value).trim();
  if (!stringValue) return null;
  
  try {
    // Handle US date format: "M/D/YYYY" or "MM/DD/YYYY" (e.g., "6/1/2020", "12/15/2018")
    if (stringValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [month, day, year] = stringValue.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (isValid(date)) return date;
    }
    
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

/**
 * Format today's date in Pacific timezone as a prefix for notes/next steps
 * @returns Date string in format "MM/dd/yy: " (e.g., "11/16/25: ") in PST/PDT
 */
export function formatDatePrefix(): string {
  return formatInTimeZone(new Date(), 'America/Los_Angeles', 'MM/dd/yy') + ': ';
}