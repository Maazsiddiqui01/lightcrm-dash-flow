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

## RPC Function Overload Safety

### Known Overloaded Functions
These functions have multiple signatures and require explicit parameter passing:
- `add_contact_note(p_contact_id, p_field, p_content, [p_due_date])`
- `add_opportunity_note(p_opportunity_id, p_field, p_content, [p_due_date])`

### Mandatory Pattern for Overloaded RPCs
```typescript
import { addContactNote, addOpportunityNote } from '@/utils/rpcHelpers';

// ✅ CORRECT: Use type-safe wrapper
const { error } = await addContactNote({
  contactId: id,
  field: 'notes',
  content: noteContent,
  dueDate: null, // Explicitly pass even if null
});

// ❌ WRONG: Direct RPC call may cause ambiguity
const { error } = await supabase.rpc('add_contact_note', {
  p_contact_id: id,
  p_field: 'notes',
  p_content: noteContent,
  // Missing p_due_date causes overload ambiguity!
});
```

### Best Practices
1. **Always use type-safe wrappers** from `src/utils/rpcHelpers.ts` for overloaded functions
2. **Pass all parameters explicitly**, even if optional or null
3. **Query pg_proc** before creating new overloaded functions to understand impact
4. **Prefer single function signatures** with optional params having defaults

### When Creating New RPC Functions
- ❌ AVOID creating multiple overloads with optional parameters
- ✅ PREFER a single function signature with all optional params having defaults
- ✅ USE JSONB params for complex optional configurations

### Code Review Checklist
- [ ] Check if RPC function has multiple overloads (query `pg_proc`)
- [ ] Use type-safe wrappers for overloaded functions
- [ ] Pass all parameters explicitly, use `null` instead of omitting
- [ ] Test RPC calls with and without optional parameter values

## Files Updated
- ✅ `src/hooks/useEditMode.ts` - Field whitelisting + enhanced errors
- ✅ `src/hooks/useCsvImport.ts` - Field whitelisting + enhanced errors  
- ✅ `supabase/functions/data_normalization/index.ts` - Merge with whitelist
- ✅ `src/hooks/useContactNotes.ts` - Enhanced error handling + RPC wrapper
- ✅ `src/hooks/useContactNextSteps.ts` - RPC wrapper migration
- ✅ `src/utils/rpcHelpers.ts` - Type-safe RPC wrappers
- ✅ `src/utils/schemaValidator.ts` - Overloaded function detection

## Success Metrics
- Zero NULL constraint violations
- Clear, actionable error messages
- Automated validation during development
- All database operations use safe patterns
- No RPC parameter ambiguity errors
