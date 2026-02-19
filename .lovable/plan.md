

# Fix: Use All Email Addresses for Contact Recency

## Problem

When a contact has multiple email addresses (e.g., Stephanie Davies with 3 emails), the system only checks the **primary** email address when calculating `most_recent_contact`. If an interaction happened via an alternate email, it's ignored -- making the contact appear overdue when they're not.

## Root Cause

The database function `refresh_contact_recency(p_contact_id)` does this:

```text
1. Look up contacts_raw.email_address (primary only)
2. Search emails_meetings_raw WHERE emails_arr @> ARRAY[primary_email]
3. Update most_recent_contact based on matches
```

It never checks the alternate emails stored in `contact_email_addresses`.

## Fix

Update `refresh_contact_recency` to gather ALL email addresses for the contact (from both `contacts_raw.email_address` and `contact_email_addresses`), then search interactions against all of them.

### Database Migration

Create a new migration that replaces `refresh_contact_recency`:

```sql
CREATE OR REPLACE FUNCTION public.refresh_contact_recency(p_contact_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_emails text[];
  v_latest_email timestamptz;
  v_latest_meeting timestamptz;
  v_most_recent timestamptz;
  v_delta_type text;
BEGIN
  -- Gather ALL email addresses: primary + alternates
  SELECT array_agg(DISTINCT lower(e))
  INTO v_emails
  FROM (
    SELECT email_address AS e FROM contacts_raw WHERE id = p_contact_id AND email_address IS NOT NULL
    UNION
    SELECT email_address FROM contact_email_addresses WHERE contact_id = p_contact_id AND email_address IS NOT NULL
  ) sub;

  IF v_emails IS NULL OR array_length(v_emails, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Latest email across ALL addresses
  SELECT MAX(occurred_at) INTO v_latest_email
  FROM emails_meetings_raw
  WHERE emails_arr && v_emails        -- overlap operator: any email matches
    AND source ILIKE '%email%';

  -- Latest meeting across ALL addresses
  SELECT MAX(occurred_at) INTO v_latest_meeting
  FROM emails_meetings_raw
  WHERE emails_arr && v_emails
    AND source ILIKE '%meeting%';

  -- Determine most recent and type (same logic as before)
  IF v_latest_email IS NULL AND v_latest_meeting IS NULL THEN
    v_most_recent := NULL; v_delta_type := NULL;
  ELSIF v_latest_email IS NULL THEN
    v_most_recent := v_latest_meeting; v_delta_type := 'Meeting';
  ELSIF v_latest_meeting IS NULL THEN
    v_most_recent := v_latest_email; v_delta_type := 'Email';
  ELSIF v_latest_meeting > v_latest_email THEN
    v_most_recent := v_latest_meeting; v_delta_type := 'Meeting';
  ELSE
    v_most_recent := v_latest_email; v_delta_type := 'Email';
  END IF;

  UPDATE contacts_raw SET
    latest_contact_email = v_latest_email,
    latest_contact_meeting = v_latest_meeting,
    most_recent_contact = v_most_recent,
    delta_type = v_delta_type,
    updated_at = now()
  WHERE id = p_contact_id;
END;
$$;
```

Key change: uses the `&&` (array overlap) operator instead of `@>` (array contains), checking against ALL emails for the contact rather than just the primary one.

### Also Update: `update_contacts_from_interaction` Trigger

The trigger `trg_emails_meetings_raw_sync` fires when new interactions are inserted and calls `update_contacts_from_interaction`. This function currently only matches on `contacts_raw.email_address`. It needs to also check `contact_email_addresses` so that inserting an interaction for an alternate email triggers the recency update for the right contact.

### Files to Modify

| File | Change |
|------|--------|
| New SQL migration | Replace `refresh_contact_recency` to use all emails via `contact_email_addresses` |
| Same migration | Update `update_contacts_from_interaction` / trigger to match on alternate emails too |

### No Frontend Changes Needed

The views (`contacts_with_display_fields`, `email_pipeline_contacts_v`) already have a `linked_contact_dates` CTE for cross-record aggregation. But the underlying `most_recent_contact` in `contacts_raw` is what feeds everything -- fixing that at the source means all downstream views automatically show the correct date.

### After Deployment

Run `SELECT refresh_all_contact_recency()` once to backfill all contacts with the corrected logic. This will update any contacts like Stephanie whose alternate-email interactions were previously missed.

