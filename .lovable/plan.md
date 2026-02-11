

# Plan: Focus Area Description Viewer & Editor in Email Builder

## Summary

Add a collapsible "Focus Area Language" panel above the Email Modules card (right column) in the Email Builder. This panel lets users browse, review, and inline-edit focus area descriptions from the `focus_area_description` table. Selected/edited descriptions are appended to the Focus Area Rationale module content in the webhook payload sent to n8n.

---

## Part 1: UI Component - FocusAreaLanguagePanel

A new component placed above the `ModulesCard` in the right column of the Email Builder.

```text
+--------------------------------------------------+
| Focus Area Language                   [Collapse]  |
|--------------------------------------------------|
| Focus Area:  [Electronic Components ▼]            |
| Type:        [New Platform ▼] [Add-On ▼]          |
|   (filtered by selected focus area)               |
| Platform:    Summit Interconnect                   |
|   (shown only when Add-On selected; read-only)    |
|--------------------------------------------------|
| Description:                                      |
| [Editable textarea with current description]      |
|                                                   |
| [Save Changes]  [Use in Email ✓]                  |
+--------------------------------------------------+
```

### Behavior

1. **Focus Area dropdown**: Shows all distinct `LG Focus Area` values from `focus_area_description` table. If a contact is selected, their focus areas appear first/highlighted.

2. **Platform/Add-On dropdown**: Filtered by the selected focus area. Some focus areas have only "New Platform", some only "Add-On", some have both. Automatically selects if only one option exists.

3. **Existing Platform field**: Read-only display, shown only when "Add-On" is selected. Shows the `Existing Platform (for Add-Ons)` column value.

4. **Description textarea**: Displays the matching description. Editable inline. On "Save Changes", updates the `focus_area_description` row via Supabase (UPDATE using `Unique_ID`).

5. **"Use in Email" toggle/checkbox**: When checked, the selected description text is appended to the Focus Area Rationale module payload. This is sent as a new field `focusAreaLanguageOverride` in the webhook payload.

---

## Part 2: Data Flow

### Reading
- Fetch all rows from `focus_area_description` (small table, ~20 rows)
- Use existing `useFocusAreaDescriptions` hook pattern but fetch ALL rows (no filter)

### Writing (Inline Edit)
- UPDATE `focus_area_description` SET `Description` = ? WHERE `Unique_ID` = ?
- RLS: Admin update policy exists (`is_admin(auth.uid())`). If the current user is admin, updates work. If not, we need to add an authenticated user update policy.

### Adding to Webhook Payload
- New field in `EnhancedDraftPayload`:
  ```typescript
  focusAreaLanguage?: {
    focusArea: string;
    type: string;              // 'New Platform' or 'Add-On'
    existingPlatform?: string; // Only for Add-Ons
    description: string;       // The (possibly edited) text
    useInEmail: boolean;       // Whether user toggled it on
  };
  ```
- This gets included in the payload sent to n8n so the AI can incorporate it into the Focus Area Rationale section.

---

## Part 3: RLS Policy Update

The current UPDATE policy requires `is_admin()`. We need to allow authenticated users to update descriptions:

```sql
CREATE POLICY "Authenticated users can update focus area descriptions"
ON focus_area_description
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Part 4: Webhook Payload Integration

In `src/lib/enhancedPayload.ts`, add the `focusAreaLanguage` field to the payload builder. The data flows from the Email Builder page state through `buildEnhancedDraftPayload` into the final webhook POST body.

In `DraftGenerateButton.tsx`, pass the focus area language selection through the enhanced payload so n8n receives it alongside existing module data.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/email-builder/FocusAreaLanguagePanel.tsx` | **Create** | New panel component with dropdowns, textarea, save, and toggle |
| `src/hooks/useAllFocusAreaDescriptions.ts` | **Create** | Hook to fetch all rows from `focus_area_description` + mutation for updates |
| `src/pages/EmailBuilder.tsx` | **Modify** | Add state for focus area language selection; render `FocusAreaLanguagePanel` above `ModulesCard` in right column |
| `src/lib/enhancedPayload.ts` | **Modify** | Add `focusAreaLanguage` field to `EnhancedDraftPayload` interface and builder |
| `src/components/email-builder/DraftGenerateButton.tsx` | **Modify** | Pass focus area language data through to payload |
| New migration SQL | **Create** | Add authenticated UPDATE policy to `focus_area_description` |

---

## Implementation Details

### FocusAreaLanguagePanel Component

```typescript
interface FocusAreaLanguagePanelProps {
  contactFocusAreas?: string[];  // To highlight relevant focus areas
  value: FocusAreaLanguageSelection | null;
  onChange: (selection: FocusAreaLanguageSelection | null) => void;
}

interface FocusAreaLanguageSelection {
  uniqueId: number;
  focusArea: string;
  type: string;               // 'New Platform' | 'Add-On'
  existingPlatform: string | null;
  description: string;
  useInEmail: boolean;
}
```

**Dropdown filtering logic:**
1. User selects Focus Area -> filter `Platform / Add-On` options to those available for that focus area
2. User selects Platform/Add-On -> if "Add-On", show `Existing Platform (for Add-Ons)` read-only
3. Load matching description into textarea
4. User can edit and save, or toggle "Use in Email"

### useAllFocusAreaDescriptions Hook

```typescript
// Fetch all rows
const { data } = useQuery({
  queryKey: ['all_focus_area_descriptions'],
  queryFn: async () => {
    const { data } = await supabase
      .from('focus_area_description')
      .select('*')
      .order('"LG Focus Area"');
    return data;
  }
});

// Update mutation
const updateMutation = useMutation({
  mutationFn: async ({ uniqueId, description }) => {
    await supabase
      .from('focus_area_description')
      .update({ Description: description })
      .eq('Unique_ID', uniqueId);
  },
  onSuccess: () => queryClient.invalidateQueries(['all_focus_area_descriptions'])
});
```

### Payload Addition

In `EnhancedDraftPayload`, add after `focusAreas`:

```typescript
focusAreaLanguage?: {
  focusArea: string;
  type: string;
  existingPlatform?: string;
  description: string;
  useInEmail: boolean;
};
```

This field is only populated when the user has selected a focus area in the panel and toggled "Use in Email" on.

---

## Placement in Layout

The panel goes in the right column, above `ModulesCard`:

```text
Right Column (lg:col-span-6):
  ┌─────────────────────────┐
  │ Focus Area Language      │  <-- NEW
  │ (collapsible panel)      │
  └─────────────────────────┘
  ┌─────────────────────────┐
  │ Email Modules            │  <-- Existing
  │ (ModulesCard)            │
  └─────────────────────────┘
  ┌─────────────────────────┐
  │ Live Preview             │  <-- Existing
  │ (ModuleContentPreview)   │
  └─────────────────────────┘
```

