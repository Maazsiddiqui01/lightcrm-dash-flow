/**
 * Security utilities for CSV import operations
 * Ensures all user input is properly validated and sanitized
 */

import { z } from 'zod';

/**
 * Maximum allowed file size for CSV imports (20MB)
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Maximum number of rows to process in a single import
 */
export const MAX_ROWS = 10000;

/**
 * Maximum field length for text fields
 */
export const MAX_FIELD_LENGTH = 10000;

/**
 * Validates file before parsing
 */
export function validateCsvFile(file: File): { valid: boolean; error?: string } {
  const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
  
  // Check file extension
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)' 
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
    };
  }

  // Check for empty file
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

/**
 * Sanitizes field value to prevent injection attacks
 */
export function sanitizeFieldValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value);

  // Truncate excessively long values
  if (stringValue.length > MAX_FIELD_LENGTH) {
    console.warn(`Field value truncated from ${stringValue.length} to ${MAX_FIELD_LENGTH} characters`);
    return stringValue.substring(0, MAX_FIELD_LENGTH);
  }

  // Remove any control characters except newlines and tabs
  const sanitized = stringValue.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validates row count before import
 */
export function validateRowCount(rowCount: number): { valid: boolean; error?: string } {
  if (rowCount === 0) {
    return { valid: false, error: 'No data rows found in CSV' };
  }

  if (rowCount > MAX_ROWS) {
    return { 
      valid: false, 
      error: `Too many rows (${rowCount}). Maximum allowed is ${MAX_ROWS}` 
    };
  }

  return { valid: true };
}

/**
 * Schema for validating UUID format
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Schema for validating email format
 */
export const emailSchema = z.string().email('Invalid email format').max(255);

/**
 * Validates and sanitizes a batch of rows for import
 */
export function sanitizeImportBatch(rows: any[]): any[] {
  return rows.map(row => {
    const sanitized: any = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // Skip internal fields
      if (key.startsWith('_')) {
        sanitized[key] = value;
        return;
      }
      
      // Sanitize the value
      sanitized[key] = sanitizeFieldValue(value);
    });
    
    return sanitized;
  });
}

/**
 * Logs sanitization warnings (but not the actual data for security)
 */
export function logImportAttempt(
  entityType: string,
  rowCount: number,
  mode: string
): void {
  console.info('[CSV Import]', {
    entityType,
    rowCount,
    mode,
    timestamp: new Date().toISOString()
  });
}
