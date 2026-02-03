
# Plan: Restructure Opportunities Drawer and Add Opportunity Dialog

## Summary

This plan restructures the Opportunities experience into a cleaner 2-tab layout and fixes the duplicate timeline entries issue. The changes will:
1. Modify the **Add New Opportunity Dialog** to remove duplicate Next Steps field and add file attachments
2. Consolidate the **Opportunity Drawer** from 5 tabs to 2 tabs (Overview + History)
3. Fix the **duplicate timeline entries** issue in the database

---

## Part 1: Fix Add New Opportunity Dialog

**File: `src/components/opportunities/AddOpportunityDialog.tsx`**

### Changes:
1. **Remove duplicate Next Steps field** (lines 576-585) - Currently "Next Steps" appears twice:
   - Line 365-374: First occurrence (after Deal Name) - **KEEP**
   - Line 576-585: Second occurrence (in Additional Information) - **REMOVE**

2. **Add "Add to Do" checkbox and Due Date picker to the first Next Steps field** - To match the Activity tab behavior, add:
   - Optional due date picker
   - "Add in To Do" checkbox
   - These will be displayed below the Next Steps textarea

3. **Add File Attachments section at the bottom** - After Notes field, add:
   - A collapsible attachments section
   - Reuse the existing `AttachmentUpload` component
   - Note: For new opportunities, files will be uploaded AFTER the opportunity is created (show info message)

---

## Part 2: Restructure Opportunity Drawer

**File: `src/components/opportunities/OpportunityDrawer.tsx`**

### Current Tabs (5):
- Overview: Key info, focus areas, sector, tier, LG leads, URL
- Details: Platform/Add-on, process timeline, EBITDA, acquisition date
- Activity: Next Steps with timeline, Notes with timeline
- Source: Deal source company, individuals
- Files: Attachments

### New Tabs (2):

#### Tab 1: "Overview"
All editable fields in a single scrollable form (mirroring Add Opportunity):
- Priority checkbox
- LG Focus Area (multi-select)
- LG Focus Area Consolidated (read-only)
- Sector, Tier
- Summary of Opportunity
- LG Leads (1-4)
- Deal Details (Platform/Add-on, Process Timeline, EBITDA, Funds, Acquisition Date)
- URL
- Deal Source (Company + Individuals)
- Next Steps input (with Add to Do + Due Date) - **NO timeline**
- Notes input - **NO timeline**
- Attachments section (collapsible)

#### Tab 2: "History"
Timeline-focused view showing historical activity:
- Next Steps Timeline (with delete capability)
- Notes Timeline (with delete capability)
- Combined chronological view

### Implementation:
- Merge content from current Overview, Details, Source tabs into new Overview tab
- Move Activity content (timelines only) to new History tab
- Add inline Next Steps/Notes input to Overview WITHOUT timeline display
- Keep file attachments in Overview tab (at bottom)

---

## Part 3: Fix Duplicate Timeline Entries

**Investigation Results:**

The database shows duplicate entries are being created. Looking at the `log_opportunity_note_changes` trigger in migration `20250924121642`:

```sql
if new.next_steps is distinct from old.next_steps and coalesce(new.next_steps,'') <> '' then
  insert into opportunity_note_events(...)
```

The trigger fires on UPDATE, but entries are being inserted twice with identical timestamps. This suggests the trigger is firing correctly, but something is causing double-writes.

**Likely cause:** When the RPC `add_opportunity_note` is called, it updates the `opportunities_raw` table which triggers `log_opportunity_note_changes`. If the update is running in a transaction that retries or if there's a race condition with optimistic UI updates calling the mutation twice, duplicates occur.

**Fix Options:**

A. **Database-side deduplication** - Add a unique constraint or modify the trigger to check for recent duplicates:
```sql
-- In trigger, check if identical entry exists within last 5 seconds
IF NOT EXISTS (
  SELECT 1 FROM opportunity_note_events 
  WHERE opportunity_id = NEW.id 
    AND field = 'next_steps' 
    AND content = NEW.next_steps
    AND created_at > (now() - interval '5 seconds')
) THEN
  INSERT INTO opportunity_note_events(...);
END IF;
```

B. **Frontend-side fix** - Ensure mutations are debounced and not called twice

**Recommendation:** Implement database-side deduplication (Option A) as it's more robust.

---

## Part 4: Create Simplified Notes Input Component

**New File: `src/components/opportunities/SimpleNotesInput.tsx`**

A lightweight input component for the Overview tab that:
- Has textarea for content
- Has optional due date picker (for Next Steps only)
- Has "Add in To Do" checkbox (for Next Steps only)
- Has "Save" button
- Does NOT show timeline (that's in History tab)

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/opportunities/AddOpportunityDialog.tsx` | Modify | Remove duplicate Next Steps, add due date + Add to Do, add attachments section |
| `src/components/opportunities/OpportunityDrawer.tsx` | Major Modify | Consolidate 5 tabs → 2 tabs (Overview + History) |
| `src/components/opportunities/SimpleNotesInput.tsx` | Create | New lightweight input without timeline |
| `supabase/migrations/[timestamp]_fix_duplicate_timeline.sql` | Create | Add deduplication logic to trigger |
| `src/integrations/supabase/types.ts` | Auto-update | Will be regenerated |

---

## Technical Details

### AddOpportunityDialog Changes:
1. Add state for `nextStepsDueDate` and `addInToDo`
2. Remove the second Next Steps textarea (lines 576-585)
3. Add DatePicker and Checkbox below the first Next Steps field
4. Add AttachmentUpload at bottom with message "Files can be uploaded after the opportunity is created"
5. On submit, if opportunity created successfully, navigate to drawer or show option to upload files

### OpportunityDrawer Tab Restructure:
1. Change TabsList from 5 columns to 2 columns
2. Merge Overview + Details + Source content into "Overview" tab
3. Keep Activity timeline content, move to "History" tab
4. In Overview, replace OpportunityNotesSection with SimpleNotesInput (no timeline)
5. Files section stays in Overview as collapsible

### Timeline Deduplication Fix:
```sql
CREATE OR REPLACE FUNCTION public.log_opportunity_note_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'UPDATE' then
    -- Check for next_steps changes
    if new.next_steps is distinct from old.next_steps 
       and coalesce(new.next_steps,'') <> '' then
      -- Prevent duplicates within 5 second window
      IF NOT EXISTS (
        SELECT 1 FROM opportunity_note_events 
        WHERE opportunity_id = NEW.id 
          AND field = 'next_steps' 
          AND content = NEW.next_steps
          AND created_at > (now() - interval '5 seconds')
      ) THEN
        insert into opportunity_note_events(opportunity_id, field, content, due_date, created_by)
        values (new.id, 'next_steps', new.next_steps, new.next_steps_due_date, auth.uid());
      END IF;
    end if;

    -- Check for most_recent_notes changes
    if new.most_recent_notes is distinct from old.most_recent_notes 
       and coalesce(new.most_recent_notes,'') <> '' then
      -- Prevent duplicates within 5 second window
      IF NOT EXISTS (
        SELECT 1 FROM opportunity_note_events 
        WHERE opportunity_id = NEW.id 
          AND field = 'most_recent_notes' 
          AND content = NEW.most_recent_notes
          AND created_at > (now() - interval '5 seconds')
      ) THEN
        insert into opportunity_note_events(opportunity_id, field, content, created_by)
        values (new.id, 'most_recent_notes', new.most_recent_notes, auth.uid());
      END IF;
    end if;
  end if;
  return new;
end
$function$;
```

---

## Visual Reference

### Current Drawer Layout:
```
[Overview] [Details] [Activity] [Source] [Files]
```

### New Drawer Layout:
```
[Overview] [History]
```

### Overview Tab Content Flow:
```
Priority Checkbox
Focus Area | Sector
Tier | (Priority badge display)
Summary of Opportunity
LG Leads 1-4
─────────────────────
Deal Details
Platform/Add-on | Process Timeline
EBITDA | Acquisition Date
Funds | Date of Origination
─────────────────────
URL
─────────────────────
Deal Source
Company | Individual 1 | Individual 2
─────────────────────
Next Steps (input + due date + add to do) [Save]
Notes (input) [Save]
─────────────────────
▼ Attachments (collapsible)
```

### History Tab Content Flow:
```
Combined Timeline (Next Steps + Notes)
- Sorted by date descending
- Each entry shows: timestamp, type badge, content, delete button
- Optionally: filter by type (Next Steps / Notes)
```

---

## Implementation Order

1. **Fix duplicate timeline issue** (database migration) - Prevents new duplicates
2. **Create SimpleNotesInput component** - Reusable for both Add dialog and drawer
3. **Update AddOpportunityDialog** - Remove duplicate, add due date/todo/attachments
4. **Restructure OpportunityDrawer** - Consolidate to 2 tabs

---

## Notes

- All existing functionality is preserved, just reorganized
- The History tab provides a clean chronological view of all activity
- Timeline deduplication is handled at database level for reliability
- Files in Add dialog will prompt user that files upload after creation (can't upload to non-existent entity)
