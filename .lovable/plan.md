
# Plan: Fix Max Lag Days Null vs Zero Distinction

## Problem Statement

The "Max Lag (Days)" column (database field: `delta`) incorrectly treats blank/null values and zero (0) values as the same:

1. **In edit mode**: Blank values appear as "0" in the input field
2. **After saving "0"**: The value displays as blank in the table
3. **User expectation**: Blank = "no data yet" vs 0 = "intentionally no outreach for now"

The database correctly distinguishes between `NULL` and `0`, but the frontend conflates them.

---

## Root Causes

### 1. Display Logic Conflates 0 and Null
**File**: `src/lib/dynamicColumns.tsx` (lines 36-39)
```typescript
if (column.type === 'numeric' || column.type.includes('integer')) {
  if (value === 0 || value === '0' || !value) return '';
}
```
This code treats `0` the same as `null`, displaying both as blank.

### 2. Edit Input Uses Falsy Check
**File**: `src/components/shared/EditableCell.tsx` (line 437)
```typescript
value={localValue || ''}
```
When `localValue` is `0`, JavaScript's `|| ''` converts it to empty string.

### 3. GroupContactsTable Has Same Issue
**File**: `src/components/contacts/GroupContactsTable.tsx` (line 224)
```typescript
value={currentValue || ''}
```
Same falsy check issue.

### 4. ContactDrawer Has Same Issue
**File**: `src/components/contacts/ContactDrawer.tsx` (line 502)
```typescript
value={contactData.delta || ""}
```
Same falsy check issue.

---

## Solution

### Part 1: Fix Display in `formatCellValue`

Update numeric column display to show "0" when value is explicitly `0`:

```typescript
// Show blank only for null/undefined, NOT for 0
if (column.type === 'numeric' || column.type.includes('integer')) {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}
```

**Special Exception**: Some numeric columns like EBITDA, Revenue should still show blank for 0 (per existing memory). We need to make this column-specific.

### Part 2: Fix `EditableCell` Number Input

Update the number input to properly handle `0`:

```typescript
// Before:
value={localValue || ''}

// After:
value={localValue ?? ''}
```

The nullish coalescing operator (`??`) only converts `null/undefined` to empty string, preserving `0`.

### Part 3: Fix `GroupContactsTable` Inline Edit

Update both the display and edit input:

```typescript
// Display - show 0 explicitly
const days = row.max_lag_days;
return days !== null && days !== undefined ? (
  <Badge variant={days > 90 ? "destructive" : "secondary"}>
    {days} days
  </Badge>
) : <span className="text-muted-foreground">-</span>;

// Edit input - use ?? instead of ||
value={currentValue ?? ''}
```

### Part 4: Fix `ContactDrawer` Delta Input

```typescript
// Before:
value={contactData.delta || ""}

// After:
value={contactData.delta ?? ""}
```

### Part 5: Column-Specific Blank Display

Create a list of columns that should show blank for `0`:

```typescript
const SHOW_BLANK_FOR_ZERO_COLUMNS = [
  'ebitda_in_ms',
  'revenue',
  'est_deal_size',
  'est_lg_equity_invest',
  'of_emails',
  'of_meetings'
];
```

For `delta` and `max_lag_days`, we want to show `0` explicitly.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/dynamicColumns.tsx` | Update `formatCellValue` to distinguish null from 0, with column-specific exceptions |
| `src/components/shared/EditableCell.tsx` | Change `localValue || ''` to `localValue ?? ''` for number inputs |
| `src/components/contacts/GroupContactsTable.tsx` | Fix max_lag_days display and edit input |
| `src/components/contacts/ContactDrawer.tsx` | Fix delta input value binding |
| `src/components/contacts/GroupContactDrawer.tsx` | Fix editedMaxLag input value binding |

---

## Implementation Details

### dynamicColumns.tsx Changes

```typescript
// Columns that should display blank for zero
const SHOW_BLANK_FOR_ZERO_COLUMNS = [
  'ebitda_in_ms',
  'revenue', 
  'est_deal_size',
  'est_lg_equity_invest',
  'of_emails',
  'of_meetings',
  'gp_aum'
];

export const formatCellValue = (value: any, column: TableColumn): string => {
  if (value === null || value === undefined) return '';
  
  if (column.type === 'numeric' || column.type.includes('integer')) {
    // For specific columns, show blank for zero (existing behavior)
    if (SHOW_BLANK_FOR_ZERO_COLUMNS.includes(column.name)) {
      if (value === 0 || value === '0' || !value) return '';
    }
    // For all other numeric columns (like delta), show 0 explicitly
    if (value === '' || value === null || value === undefined) return '';
    return String(value);
  }
  
  // ... rest unchanged
};
```

### EditableCell.tsx Changes

```typescript
case 'number':
  return (
    <Input
      ref={inputRef}
      type="number"
      value={localValue ?? ''}  // Use ?? instead of ||
      onChange={(e) => {
        const val = e.target.value;
        // Store empty string as null, otherwise as number
        setLocalValue(val === '' ? null : Number(val));
      }}
      {...commonProps}
    />
  );
```

### GroupContactsTable.tsx Changes

```typescript
// In render for max_lag_days
const days = row.max_lag_days;
return days !== null && days !== undefined ? (
  <Badge variant={days > 90 ? "destructive" : "secondary"}>
    {days} days
  </Badge>
) : <span className="text-muted-foreground">-</span>;

// In edit input
value={currentValue ?? ''}
onChange={(e) => {
  const val = e.target.value;
  setEditedRows(prev => ({
    ...prev,
    [row.group_id]: { 
      ...prev[row.group_id], 
      max_lag_days: val === '' ? null : parseInt(val) 
    }
  }));
}}
```

---

## Testing Scenarios

After implementation, verify these scenarios work correctly:

1. **Null value display**: Contacts with `delta = NULL` should show blank/dash
2. **Zero value display**: Contacts with `delta = 0` should show "0" or "0 days"
3. **Edit null to zero**: Enter "0" in empty field, save, should display "0"
4. **Edit zero to null**: Clear "0" field (leave blank), save, should display blank
5. **Edit mode display**: "0" values should show "0" in input, not empty
6. **EBITDA/Revenue exception**: These columns should still show blank for "0"

---

## Summary

This is a precision fix targeting JavaScript's falsy behavior. The key insight is:
- `||` treats `0` as falsy, converting it to the fallback value
- `??` only treats `null/undefined` as "needs fallback", preserving `0`

By consistently using `??` for numeric value binding and updating the display logic with column-specific rules, we properly distinguish "no data" (null) from "intentionally zero" (0).
