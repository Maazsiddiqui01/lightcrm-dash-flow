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

## View-Table Column Synchronization

### Problem
When columns are added to base tables (e.g., `opportunities_raw`, `contacts_raw`), dependent database views don't automatically inherit these columns. This causes "Failed to fetch" errors when filtering or displaying data using the new columns.

### Solution Framework

#### 1. View Dependencies Registry (`src/utils/viewDependencies.ts`)
Maintains a registry of:
- Base tables and their dependent views
- Filterable columns that MUST be in views
- Excluded columns (computed fields that don't exist in base tables)

#### 2. Automated Validation (`src/utils/viewSyncValidator.ts`)
- Compares base table columns with view columns
- Detects missing columns that would cause filter errors
- Run via `runSchemaValidation()` during development

#### 3. SQL Generation Helper (`src/utils/viewSqlGenerator.ts`)
- Generates correct view definitions automatically
- Use `generateAllViewsSQL('base_table_name')` to get SQL
- Includes all base columns plus computed display fields

### Mandatory Process: Adding a New Column

#### Step 1: Add Column to Base Table
```sql
ALTER TABLE opportunities_raw ADD COLUMN new_column_name data_type;
```

#### Step 2: Update View Dependencies Registry
In `src/utils/viewDependencies.ts`:
```typescript
export const VIEW_DEPENDENCIES = {
  opportunities_raw: {
    views: ['opportunities_with_display_fields'],
    filterableColumns: [
      // ... existing columns
      'new_column_name', // ADD HERE
    ],
  },
};
```

#### Step 3: Generate View Update SQL
```typescript
import { generateAllViewsSQL } from '@/utils/viewSqlGenerator';

// Run in console:
const sql = await generateAllViewsSQL('opportunities_raw');
console.log(sql);
```

#### Step 4: Create Migration with Generated SQL
Create a new migration file with the generated SQL:
```sql
-- Drop and recreate view with new column
DROP VIEW IF EXISTS opportunities_with_display_fields;

CREATE VIEW opportunities_with_display_fields AS
SELECT 
    id,
    -- ... all existing columns
    new_column_name, -- NEW COLUMN
    -- ... computed columns
FROM opportunities_raw o;
```

#### Step 5: Verify with Schema Validator
```typescript
import { runSchemaValidation } from '@/utils/schemaValidator';

// Run in console:
await runSchemaValidation();
// Should show ✅ No issues found
```

### Quick Reference: Base Tables and Their Views

| Base Table | Dependent Views | Purpose |
|-----------|----------------|---------|
| `opportunities_raw` | `opportunities_with_display_fields` | Adds computed display fields for next_steps and notes |
| `contacts_raw` | `contacts_app`, `contacts_norm`, `contacts_with_display_fields` | Multiple views for different query patterns |

### View Definition Patterns

#### Pattern 1: Simple Column Pass-Through
```sql
CREATE VIEW view_name AS
SELECT 
    column1,
    column2,
    column3
FROM base_table;
```

#### Pattern 2: With Computed Display Fields
```sql
CREATE VIEW view_name AS
SELECT 
    base_column1,
    base_column2,
    COALESCE(base_field, 
        (SELECT content FROM timeline_table 
         WHERE entity_id = t.id 
         ORDER BY created_at DESC LIMIT 1)
    ) AS computed_display_field
FROM base_table t;
```

### Common Mistakes to Avoid

❌ **Adding column to base table without updating views**
```sql
-- This will cause "Failed to fetch" errors
ALTER TABLE opportunities_raw ADD COLUMN priority boolean;
-- Missing: View update!
```

✅ **Correct: Update views in same migration**
```sql
ALTER TABLE opportunities_raw ADD COLUMN priority boolean;

-- Update dependent views
DROP VIEW IF EXISTS opportunities_with_display_fields;
CREATE VIEW opportunities_with_display_fields AS
SELECT 
    -- ... all columns including:
    priority,
    -- ... rest of view
FROM opportunities_raw o;
```

❌ **Hardcoding column lists in view definitions**
```sql
-- Brittle: Must remember to update when columns change
CREATE VIEW my_view AS SELECT id, name, email FROM contacts_raw;
```

✅ **Use SQL generator for complete column lists**
```typescript
// Generates complete, correct SQL automatically
const sql = await generateAllViewsSQL('contacts_raw');
```

### Automated Detection

Run schema validation regularly during development:

```typescript
import { runSchemaValidation } from '@/utils/schemaValidator';

// In browser console or during development
await runSchemaValidation();
```

This checks:
- Configuration drift in editable columns
- RPC function overloads
- **View-table column synchronization** ← NEW

### Database Helper Function

A SQL function exists to detect missing columns:

```sql
-- Query to find columns in base tables missing from views
SELECT * FROM public.validate_view_columns();
```

Returns: `(view_name, missing_column, base_table)` for each issue found.

## Success Metrics
- Zero NULL constraint violations
- Clear, actionable error messages
- Automated validation during development
- All database operations use safe patterns
- No RPC parameter ambiguity errors
- **No view-table synchronization issues** ← NEW
- **Automated detection of missing view columns** ← NEW
