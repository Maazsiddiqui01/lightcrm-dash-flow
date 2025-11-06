/**
 * Supabase Error Parser
 * 
 * Converts technical database errors into user-friendly messages
 * with detailed logging for debugging.
 */

interface ParsedError {
  userMessage: string;
  technicalDetails: {
    code?: string;
    message: string;
    details?: string;
    hint?: string;
    constraint?: string;
    table?: string;
    column?: string;
  };
}

/**
 * Parse Supabase/PostgreSQL error into user-friendly message
 * 
 * @param error - Error object from Supabase
 * @param context - Optional context about what operation failed
 * @returns Parsed error with user message and technical details
 */
export function parseSupabaseError(
  error: any,
  context?: { operation?: string; table?: string; rowId?: string }
): ParsedError {
  const technicalDetails: ParsedError['technicalDetails'] = {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };

  // Extract constraint name if present
  if (error.message && error.message.includes('violates')) {
    const constraintMatch = error.message.match(/constraint "([^"]+)"/);
    if (constraintMatch) {
      technicalDetails.constraint = constraintMatch[1];
    }
  }

  // Log full error for debugging
  console.error('[Supabase Error]', {
    ...context,
    error: technicalDetails,
    timestamp: new Date().toISOString(),
  });

  // Generate user-friendly message based on error type
  let userMessage = 'An unexpected error occurred. Please try again.';

  // NOT NULL constraint violations
  if (error.message?.includes('null value in column')) {
    const columnMatch = error.message.match(/column "([^"]+)"/);
    const column = columnMatch ? columnMatch[1] : 'a required field';
    userMessage = `Cannot save: ${column} is required but was not provided. Please fill in this field and try again.`;
  }
  
  // Foreign key violations
  else if (error.code === '23503' || error.message?.includes('foreign key')) {
    userMessage = 'Cannot save: This record references data that no longer exists. Please refresh and try again.';
  }
  
  // Unique constraint violations
  else if (error.code === '23505' || error.message?.includes('unique constraint')) {
    const constraintName = technicalDetails.constraint || '';
    if (constraintName.includes('email')) {
      userMessage = 'Cannot save: This email address is already in use by another contact.';
    } else if (constraintName.includes('deal_name')) {
      userMessage = 'Cannot save: An opportunity with this name already exists.';
    } else {
      userMessage = 'Cannot save: This record conflicts with an existing entry. Please check for duplicates.';
    }
  }
  
  // Check constraint violations
  else if (error.code === '23514' || error.message?.includes('check constraint')) {
    userMessage = 'Cannot save: One or more fields contain invalid values. Please review your input.';
  }
  
  // RLS policy violations
  else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
    userMessage = 'Access denied: You do not have permission to modify this record.';
  }
  
  // Network/connection errors
  else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    userMessage = 'Network error: Please check your connection and try again.';
  }
  
  // Timeout errors
  else if (error.message?.includes('timeout')) {
    userMessage = 'Request timeout: The operation took too long. Please try again with fewer records.';
  }
  
  // Generic PostgreSQL errors
  else if (error.code?.startsWith('23')) {
    userMessage = 'Database constraint violation: Please check your data and try again.';
  }

  return {
    userMessage,
    technicalDetails,
  };
}

/**
 * Format error for toast notification
 * 
 * @param error - Error object
 * @param operation - Operation that failed (e.g., "save contact", "merge records")
 * @returns Object with title and description for toast
 */
export function formatErrorForToast(
  error: any,
  operation: string = 'Operation'
): { title: string; description: string } {
  const parsed = parseSupabaseError(error);
  
  return {
    title: `${operation} Failed`,
    description: parsed.userMessage,
  };
}

/**
 * Check if error is a specific constraint violation
 * 
 * @param error - Error object
 * @param constraintType - Type of constraint ('not_null', 'unique', 'foreign_key', 'check')
 * @returns True if error matches constraint type
 */
export function isConstraintViolation(
  error: any,
  constraintType: 'not_null' | 'unique' | 'foreign_key' | 'check'
): boolean {
  const message = error.message?.toLowerCase() || '';
  
  switch (constraintType) {
    case 'not_null':
      return message.includes('null value in column') || error.code === '23502';
    case 'unique':
      return message.includes('unique constraint') || error.code === '23505';
    case 'foreign_key':
      return message.includes('foreign key') || error.code === '23503';
    case 'check':
      return message.includes('check constraint') || error.code === '23514';
    default:
      return false;
  }
}
