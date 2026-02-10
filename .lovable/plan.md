

# Fix: Sync `email_pipeline_contacts_v` with Linked Email Dates

## Problem

The `email_pipeline_contacts_v` view (used by the Email Builder's "Select Contact" panel) does **not** account for linked email addresses via `contact_email_addresses`. We already fixed `contacts_with_display_fields` to use `GREATEST(c.most_recent_contact, linked_most_recent_contact)`, but the pipeline view still reads `most_recent_contact` directly from `contacts_raw`.

**Result**: Ryan Lindquist shows as **-16d overdue** in the Email Builder (using Dec 11, 2025), but is actually **not overdue** (most recent linked contact is Feb 2, 2026, next due Mar 19, 2026).

## Root Cause

In the `contact_enriched` CTE of the view (line 95):
```sql
c.most_recent_contact,   -- Only reads the individual record's date
```

This feeds into `entity_dates` which computes `effective_last_contact_date` without considering linked emails.

## Fix

Add a `linked_contact_dates` CTE (same pattern as `contacts_with_display_fields`) and incorporate it into `entity_dates`:

```text
linked_contact_dates CTE
  -> Joins contact_email_addresses with contacts_raw
  -> Gets MAX(most_recent_contact) across all records sharing emails
  -> Returns one row per contact_id

entity_dates CTE (modified)
  -> Uses GREATEST(existing dates, linked_most_recent_contact)
```

## Database Migration

A single `CREATE OR REPLACE VIEW` statement for `email_pipeline_contacts_v` that:

1. Adds `linked_contact_dates` CTE between `eligible` and `contact_enriched`
2. Updates `entity_dates` to include the linked date via `GREATEST`

The dependent view `automated_outreach_queue_v` does **not** need changes since it reads from `email_pipeline_contacts_v` which will automatically reflect the corrected dates.

## Expected Result After Fix

| Contact | Before | After |
|---------|--------|-------|
| Ryan Lindquist | Overdue -16d (using Dec 11) | Not overdue, due Mar 19 (using Feb 2) |

The overdue count in Email Builder should drop from 12 to 11, matching the contacts table.

## Files to Modify

| File | Action |
|------|--------|
| New migration SQL | Add `linked_contact_dates` CTE to `email_pipeline_contacts_v` view |

No frontend code changes needed -- the hook `useOverdueContacts` already reads from this view correctly.
