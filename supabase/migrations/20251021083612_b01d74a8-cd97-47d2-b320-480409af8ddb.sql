-- Phase 2: Create trigger to auto-update group interaction dates
CREATE OR REPLACE FUNCTION sync_group_interaction_dates()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_ids uuid[];
  v_group_ids uuid[];
  v_group_id uuid;
  v_is_email boolean;
  v_is_meeting boolean;
  v_attendee_count int;
BEGIN
  -- Determine interaction type
  v_is_email := (NEW.source ILIKE '%email%');
  v_is_meeting := (NEW.source ILIKE '%meeting%');
  
  -- Count attendees if it's a meeting
  IF v_is_meeting AND NEW.emails_arr IS NOT NULL THEN
    v_attendee_count := array_length(NEW.emails_arr, 1);
  END IF;
  
  -- Only process meetings with 4 or fewer attendees
  IF v_is_meeting AND (v_attendee_count IS NULL OR v_attendee_count > 4) THEN
    RETURN NEW;
  END IF;
  
  -- Skip if not email or valid meeting
  IF NOT (v_is_email OR v_is_meeting) THEN
    RETURN NEW;
  END IF;
  
  -- Extract contact IDs from the interaction
  SELECT ARRAY_AGG(DISTINCT c.id)
  INTO v_contact_ids
  FROM contacts_raw c
  WHERE NEW.emails_arr @> ARRAY[lower(c.email_address)];

  -- If no contacts found, exit early
  IF v_contact_ids IS NULL OR array_length(v_contact_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Get all groups these contacts belong to
  SELECT ARRAY_AGG(DISTINCT cgm.group_id)
  INTO v_group_ids
  FROM contact_group_memberships cgm
  WHERE cgm.contact_id = ANY(v_contact_ids);

  -- Recalculate dates for each affected group
  IF v_group_ids IS NOT NULL AND array_length(v_group_ids, 1) > 0 THEN
    FOREACH v_group_id IN ARRAY v_group_ids
    LOOP
      PERFORM recalculate_group_contact_date(v_group_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on emails_meetings_raw
DROP TRIGGER IF EXISTS sync_group_interaction_dates_trigger ON emails_meetings_raw;
CREATE TRIGGER sync_group_interaction_dates_trigger
AFTER INSERT OR UPDATE OF occurred_at, emails_arr, source ON emails_meetings_raw
FOR EACH ROW
EXECUTE FUNCTION sync_group_interaction_dates();