

# Plan: Add New Focus Area Description Entry

## Summary

Add an "Add New" button to the Focus Area Language panel that opens an inline form for inserting new rows into the `focus_area_description` table. Users can add a new platform or add-on entry under an existing or new focus area.

---

## How It Works

The "Add New" button appears next to the Focus Area dropdown. When clicked, it reveals an inline form (replacing the browse view) with these fields:

```text
+--------------------------------------------------+
| Focus Area Language                   [Collapse]  |
|--------------------------------------------------|
| [+ Add New]                                       |
|--------------------------------------------------|
| Focus Area:  [Existing ▼] or [Type new name...]   |
| Sector:      [Industrials ▼]                      |
| Type:        [New Platform / Add-On]              |
| Existing Platform: [text input]                   |
|   (only shown when Add-On selected)               |
| Description: [textarea]                           |
|                                                   |
|              [Cancel]  [Save New Entry]            |
+--------------------------------------------------+
```

### Fields

1. **Focus Area**: A combo-style input -- user can pick from existing focus areas OR type a brand new one
2. **Sector**: Dropdown of existing sectors (General, Healthcare, Industrials, Services)
3. **Platform / Add-On**: Radio or dropdown -- "New Platform" or "Add-On"
4. **Existing Platform**: Text input, only shown when "Add-On" is selected
5. **Description**: Textarea for the description text

### Validation
- Focus Area is required
- Sector is required
- Platform/Add-On type is required
- Description is required
- For Add-On, Existing Platform is required

---

## Technical Details

### 1. New INSERT mutation in `useAllFocusAreaDescriptions.ts`

Add a `useCreateFocusAreaDescription` hook:

```typescript
interface CreateFocusAreaDescriptionInput {
  sector: string;
  focusArea: string;
  platformType: string;        // 'New Platform' or 'Add-On'
  existingPlatform: string | null;
  description: string;
}
```

This calls `supabase.from('focus_area_description').insert(...)` and invalidates the query cache on success.

### 2. RLS INSERT policy (migration)

Currently only admin can insert. Add a policy for authenticated users:

```sql
CREATE POLICY "Authenticated users can insert focus area descriptions"
ON focus_area_description
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
```

### 3. UI changes in `FocusAreaLanguagePanel.tsx`

- Add `isAddingNew` state toggle
- When active, show the add form with all required fields
- On save, call the insert mutation, then reset to browse mode with the new entry auto-selected
- Cancel returns to browse mode

### Files to Modify

| File | Action |
|------|--------|
| `src/hooks/useAllFocusAreaDescriptions.ts` | Add `useCreateFocusAreaDescription` mutation hook |
| `src/components/email-builder/FocusAreaLanguagePanel.tsx` | Add "Add New" button and inline creation form |
| New migration SQL | Add INSERT RLS policy for authenticated users |

