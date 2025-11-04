# Dynamic Edit Options Implementation

## Summary
Implemented dynamic dropdown options for edit mode in tables to ensure all dropdowns (inline editing) use database-backed options instead of hardcoded values.

## Changes Made

### 1. New Hook: `useDynamicEditOptions.ts`
- Centralized hook that fetches sectors and focus areas from the database
- Uses existing `useSectors()` and `useFocusAreas()` hooks
- Returns consistent data structure for use across all tables

### 2. Updated `dynamicColumns.tsx`
- Added `DynamicOptions` interface to support dynamic option passing
- Updated `createDynamicColumns()` function signature to accept optional `dynamicOptions` parameter
- Modified editable cell rendering to override hardcoded options with dynamic ones
- Converts LookupOption format (`{value, label}`) to string array format expected by EditableCell

### 3. Updated Table Components
- **ContactsTable**: Fetches dynamic options and passes them to column creation
- **OpportunitiesTable**: Fetches dynamic options and passes them to column creation

## Data Flow

```
Database (lookup_focus_areas, lookup_sectors)
    ↓
useDynamicEditOptions() hook
    ↓
Table component (ContactsTable, OpportunitiesTable)
    ↓
createDynamicColumns() with dynamicOptions parameter
    ↓
EditableCell component (renders select dropdown)
```

## Benefits

✅ **Single Source of Truth**: Database is the only source for dropdown options
✅ **Zero Maintenance**: No need to manually sync hardcoded values
✅ **Consistency**: All UI components (dialogs, drawers, edit mode) use the same data
✅ **Future-Proof**: New focus areas/sectors automatically available everywhere
✅ **No Sync Issues**: Eliminates risk of outdated options in edit mode

## Affected Fields

### Contacts Table Edit Mode
- `lg_sector` - Now pulls from `lookup_sectors`
- `lg_focus_area_1` through `lg_focus_area_8` - Now pulls from `lookup_focus_areas`

### Opportunities Table Edit Mode  
- `sector` - Now pulls from `lookup_sectors`
- `lg_focus_area` - Now pulls from `lookup_focus_areas`

## Testing Checklist

- [x] Edit mode dropdowns show all 61 focus areas (including "Food Manufacturing", "Electronic Components")
- [x] Edit mode sector dropdown shows all sectors from database
- [x] Options match exactly what's shown in Add/Edit dialogs
- [x] Saving edited values works correctly
- [x] No TypeScript errors
- [x] No runtime errors

## Backward Compatibility

This change is fully backward compatible. The `dynamicOptions` parameter is optional, so existing code that doesn't pass it will continue to work with the hardcoded options from `editableColumns.ts`.

## Future Enhancements

Consider extending this pattern to other dynamic fields:
- Deal source companies
- Investment professionals
- Headquarters locations
- Funds
- Any other field that should be dynamically populated from lookup tables
