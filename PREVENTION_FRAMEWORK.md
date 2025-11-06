# Bug Prevention Framework

## Overview
This document outlines the comprehensive bug prevention system implemented to prevent NULL constraint violations and data integrity issues.

## Core Utilities

### 1. `src/utils/databaseUpdateHelpers.ts`
- **Field Whitelisting**: `SAFE_UPDATE_FIELDS` defines allowed fields for each table
- **Safe Update Helper**: `getSafeUpdate()` filters data to only whitelisted fields
- **Validation**: `validateUpdate()` checks for forbidden fields
- **Row Cleaner**: `cleanRowForDatabase()` prepares rows for database operations

### 2. `src/utils/supabaseErrorParser.ts`
- **Error Parsing**: Converts technical errors to user-friendly messages
- **Detailed Logging**: Logs full error context for debugging
- **Constraint Detection**: Identifies specific constraint violations

### 3. `src/utils/schemaValidator.ts`
- **Config Validation**: Ensures editable columns align with safe update fields
- **Development Tool**: Run `runSchemaValidation()` to catch configuration drift

## Implementation Status

✅ **Completed**:
- Database migration: Made `email_address` nullable in `contacts_raw`
- Created `add_contact_note` RPC function
- Fixed merge function with field whitelisting
- Updated `useEditMode` with safe update patterns
- Updated `useCsvImport` with enhanced error handling

## Mandatory Patterns

### For ALL Database Updates:
```typescript
import { getSafeUpdate } from '@/utils/databaseUpdateHelpers';

const updates = rows.map(row => ({
  id: row.id,
  ...getSafeUpdate(tableName, row.changes),
  updated_at: new Date().toISOString(),
}));
```

### For Error Handling:
```typescript
import { formatErrorForToast } from '@/utils/supabaseErrorParser';

try {
  // ... database operation
} catch (error) {
  const errorInfo = formatErrorForToast(error, 'Operation name');
  toast(errorInfo);
}
```

## Files Updated
- ✅ `src/hooks/useEditMode.ts` - Field whitelisting + enhanced errors
- ✅ `src/hooks/useCsvImport.ts` - Field whitelisting + enhanced errors  
- ✅ `supabase/functions/data_normalization/index.ts` - Merge with whitelist
- ✅ `src/hooks/useContactNotes.ts` - Enhanced error handling

## Success Metrics
- Zero NULL constraint violations
- Clear, actionable error messages
- Automated validation during development
- All database operations use safe patterns
