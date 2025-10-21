-- Fix interaction trigger to handle UI imports and alternate emails
-- Add backfill functions and performance indexes

-- Add performance indexes for email matching
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON public.contacts_raw (lower(email_address));
CREATE INDEX IF NOT EXISTS idx_contact_emails_email_lower ON public.contact_email_addresses (lower(email_address));
CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at ON public.emails_meetings_raw (occurred_at DESC);

-- Update trigger to handle NULL created_by and alternate emails
CREATE OR REPLACE FUNCTION public.update_contacts_from_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_is_email boolean;
  v_is_meeting boolean;
  v_attendee_count int;
  v_user_id uuid;
BEGIN
  -- Determine interaction type
  v_is_email := (NEW.source ILIKE '%email%');
  v_is_meeting := (NEW.source ILIKE '%meeting%');
  
  -- Get user (NULL for UI imports is OK)
  v_user_id := COALESCE(NEW.created_by, auth.uid());
  
  -- Count attendees if meeting
  IF v_is_meeting AND NEW.emails_arr IS NOT NULL THEN
    v_attendee_count := array_length(NEW.emails_arr, 1);
  END IF;
  
  -- Only process meetings with 4 or fewer attendees
  IF v_is_meeting AND (v_attendee_count IS NULL OR v_attendee_count > 4) THEN
    v_is_meeting := false;
  END IF;
  
  -- Process each email in the interaction
  IF NEW.emails_arr IS NOT NULL THEN
    FOREACH v_email IN ARRAY NEW.emails_arr
    LOOP
      -- Update contacts matching this email (via primary OR alternate email)
      UPDATE public.contacts_raw c
      SET 
        latest_contact_email = CASE 
          WHEN v_is_email AND (c.latest_contact_email IS NULL OR NEW.occurred_at > c.latest_contact_email)
          THEN NEW.occurred_at
          ELSE c.latest_contact_email
        END,
        
        latest_contact_meeting = CASE 
          WHEN v_is_meeting AND (c.latest_contact_meeting IS NULL OR NEW.occurred_at > c.latest_contact_meeting)
          THEN NEW.occurred_at
          ELSE c.latest_contact_meeting
        END,
        
        most_recent_contact = GREATEST(
          COALESCE(
            CASE 
              WHEN v_is_email AND (c.latest_contact_email IS NULL OR NEW.occurred_at > c.latest_contact_email)
              THEN NEW.occurred_at
              ELSE c.latest_contact_email
            END,
            '1900-01-01'::timestamp with time zone
          ),
          COALESCE(
            CASE 
              WHEN v_is_meeting AND (c.latest_contact_meeting IS NULL OR NEW.occurred_at > c.latest_contact_meeting)
              THEN NEW.occurred_at
              ELSE c.latest_contact_meeting
            END,
            '1900-01-01'::timestamp with time zone
          )
        ),
        
        -- Update email detail fields if this is the most recent email
        email_subject = CASE
          WHEN v_is_email AND (c.latest_contact_email IS NULL OR NEW.occurred_at >= c.latest_contact_email)
          THEN NEW.subject
          ELSE c.email_subject
        END,
        
        email_from = CASE
          WHEN v_is_email AND (c.latest_contact_email IS NULL OR NEW.occurred_at >= c.latest_contact_email)
          THEN NEW.from_email
          ELSE c.email_from
        END,
        
        email_to = CASE
          WHEN v_is_email AND (c.latest_contact_email IS NULL OR NEW.occurred_at >= c.latest_contact_email)
          THEN NEW.to_emails
          ELSE c.email_to
        END,
        
        email_cc = CASE
          WHEN v_is_email AND (c.latest_contact_email IS NULL OR NEW.occurred_at >= c.latest_contact_email)
          THEN NEW.cc_emails
          ELSE c.email_cc
        END,
        
        -- Update meeting detail fields if this is the most recent meeting
        meeting_title = CASE
          WHEN v_is_meeting AND (c.latest_contact_meeting IS NULL OR NEW.occurred_at >= c.latest_contact_meeting)
          THEN NEW.subject
          ELSE c.meeting_title
        END,
        
        meeting_from = CASE
          WHEN v_is_meeting AND (c.latest_contact_meeting IS NULL OR NEW.occurred_at >= c.latest_contact_meeting)
          THEN NEW.from_email
          ELSE c.meeting_from
        END,
        
        meeting_to = CASE
          WHEN v_is_meeting AND (c.latest_contact_meeting IS NULL OR NEW.occurred_at >= c.latest_contact_meeting)
          THEN NEW.to_emails
          ELSE c.meeting_to
        END,
        
        meeting_cc = CASE
          WHEN v_is_meeting AND (c.latest_contact_meeting IS NULL OR NEW.occurred_at >= c.latest_contact_meeting)
          THEN NEW.cc_emails
          ELSE c.meeting_cc
        END,
        
        -- Update all_emails field
        all_emails = (
          SELECT string_agg(DISTINCT email, '; ' ORDER BY email)
          FROM unnest(
            ARRAY(
              SELECT DISTINCT unnest(i.emails_arr)
              FROM public.emails_meetings_raw i
              WHERE i.emails_arr @> ARRAY[lower(v_email)]
            )
          ) AS email
        ),
        
        -- Increment counts
        of_emails = CASE 
          WHEN v_is_email THEN COALESCE(c.of_emails, 0) + 1
          ELSE c.of_emails
        END,
        
        of_meetings = CASE
          WHEN v_is_meeting THEN COALESCE(c.of_meetings, 0) + 1
          ELSE c.of_meetings
        END,
        
        total_of_contacts = COALESCE(c.of_emails, 0) + COALESCE(c.of_meetings, 0) + 
          CASE WHEN v_is_email THEN 1 ELSE 0 END +
          CASE WHEN v_is_meeting THEN 1 ELSE 0 END,
        
        updated_at = now()
      WHERE
        -- Match via primary OR alternate email
        (
          lower(c.email_address) = lower(v_email) 
          OR EXISTS (
            SELECT 1 FROM public.contact_email_addresses cea 
            WHERE cea.contact_id = c.id 
            AND lower(cea.email_address) = lower(v_email)
          )
        )
        -- Allow updates for UI imports (NULL user) or if user owns/created contact
        AND (
          v_user_id IS NULL 
          OR public.is_admin(v_user_id) 
          OR c.assigned_to = v_user_id 
          OR c.created_by = v_user_id
        );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to refresh all group contact dates
CREATE OR REPLACE FUNCTION public.refresh_all_group_contact_dates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  gid uuid;
  n integer := 0;
BEGIN
  FOR gid IN SELECT id FROM public.groups LOOP
    PERFORM public.recalculate_group_contact_date(gid);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Run backfill to fix existing data
DO $$
DECLARE
  contacts_updated integer;
  groups_updated integer;
BEGIN
  -- Refresh all contact interactions
  SELECT public.refresh_all_contact_interaction_details() INTO contacts_updated;
  RAISE NOTICE 'Refreshed % contact interaction details', contacts_updated;
  
  -- Refresh all group contact dates
  SELECT public.refresh_all_group_contact_dates() INTO groups_updated;
  RAISE NOTICE 'Refreshed % group contact dates', groups_updated;
END $$;