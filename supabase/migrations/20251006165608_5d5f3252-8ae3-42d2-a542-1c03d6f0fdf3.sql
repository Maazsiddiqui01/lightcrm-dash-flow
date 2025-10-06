-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trg_update_contacts_from_interaction ON public.emails_meetings_raw;

-- Updated function with smarter meeting detection
-- Only counts meetings with 4 or fewer attendees as "real" contact meetings
-- This excludes large group meetings where the contact may not have actively participated
CREATE OR REPLACE FUNCTION public.update_contacts_from_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_is_email boolean;
  v_is_meeting boolean;
  v_attendee_count int;
BEGIN
  -- Determine interaction type based on source field
  v_is_email := (NEW.source ILIKE '%email%');
  v_is_meeting := (NEW.source ILIKE '%meeting%');
  
  -- Count attendees if it's a meeting
  IF v_is_meeting AND NEW.emails_arr IS NOT NULL THEN
    v_attendee_count := array_length(NEW.emails_arr, 1);
  END IF;
  
  -- Only process meetings with 4 or fewer attendees to exclude large group meetings
  -- This prevents contacts from being marked as "met" when they were just on a large distribution list
  IF v_is_meeting AND (v_attendee_count IS NULL OR v_attendee_count > 4) THEN
    v_is_meeting := false;
  END IF;
  
  -- Process each email in the interaction
  IF NEW.emails_arr IS NOT NULL THEN
    FOREACH v_email IN ARRAY NEW.emails_arr
    LOOP
      -- Update all contacts matching this email (case-insensitive)
      UPDATE public.contacts_raw
      SET 
        -- Update email interaction date if this is an email and it's newer
        latest_contact_email = CASE 
          WHEN v_is_email AND (latest_contact_email IS NULL OR NEW.occurred_at > latest_contact_email)
          THEN NEW.occurred_at
          ELSE latest_contact_email
        END,
        
        -- Update meeting interaction date if this is a meeting and it's newer
        -- Now only for meetings with 4 or fewer attendees
        latest_contact_meeting = CASE 
          WHEN v_is_meeting AND (latest_contact_meeting IS NULL OR NEW.occurred_at > latest_contact_meeting)
          THEN NEW.occurred_at
          ELSE latest_contact_meeting
        END,
        
        -- Update most_recent_contact to be the latest of email or meeting
        most_recent_contact = GREATEST(
          COALESCE(
            CASE 
              WHEN v_is_email AND (latest_contact_email IS NULL OR NEW.occurred_at > latest_contact_email)
              THEN NEW.occurred_at
              ELSE latest_contact_email
            END,
            '1900-01-01'::timestamp with time zone
          ),
          COALESCE(
            CASE 
              WHEN v_is_meeting AND (latest_contact_meeting IS NULL OR NEW.occurred_at > latest_contact_meeting)
              THEN NEW.occurred_at
              ELSE latest_contact_meeting
            END,
            '1900-01-01'::timestamp with time zone
          )
        ),
        
        updated_at = now()
      WHERE lower(email_address) = lower(v_email);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_update_contacts_from_interaction
  AFTER INSERT OR UPDATE OF occurred_at, emails_arr, source
  ON public.emails_meetings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contacts_from_interaction();

-- Updated refresh function with same logic
CREATE OR REPLACE FUNCTION public.refresh_all_contact_interactions()
RETURNS TABLE(contacts_updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Update all contacts with their latest interaction dates
  -- Only count meetings with 4 or fewer attendees
  WITH email_interactions AS (
    SELECT 
      lower(unnest(emails_arr)) as email_lc,
      MAX(occurred_at) as latest_email
    FROM public.emails_meetings_raw
    WHERE source ILIKE '%email%'
      AND occurred_at IS NOT NULL
    GROUP BY 1
  ),
  meeting_interactions AS (
    SELECT 
      lower(unnest(emails_arr)) as email_lc,
      MAX(occurred_at) as latest_meeting
    FROM public.emails_meetings_raw
    WHERE source ILIKE '%meeting%'
      AND occurred_at IS NOT NULL
      AND array_length(emails_arr, 1) <= 4  -- Only small meetings
    GROUP BY 1
  )
  UPDATE public.contacts_raw c
  SET 
    latest_contact_email = e.latest_email,
    latest_contact_meeting = m.latest_meeting,
    most_recent_contact = GREATEST(
      COALESCE(e.latest_email, '1900-01-01'::timestamp with time zone),
      COALESCE(m.latest_meeting, '1900-01-01'::timestamp with time zone)
    ),
    updated_at = now()
  FROM email_interactions e
  FULL OUTER JOIN meeting_interactions m ON e.email_lc = m.email_lc
  WHERE lower(c.email_address) = COALESCE(e.email_lc, m.email_lc);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$;

-- Run the refresh to fix existing data
SELECT public.refresh_all_contact_interactions();