-- Phase 1: Add group_delta column to contacts_raw
ALTER TABLE contacts_raw 
ADD COLUMN IF NOT EXISTS group_delta INTEGER NULL;

-- Add comment explaining the field
COMMENT ON COLUMN contacts_raw.group_delta IS 'Max lag days for the entire group. Used when contact is part of a group (group_contact is not null).';

-- Create helper function to recalculate group contact dates
CREATE OR REPLACE FUNCTION recalculate_group_contact_date(p_group_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update most_recent_group_contact for all members of the group
  -- to be the MAX of all group members' most_recent_contact
  UPDATE contacts_raw
  SET most_recent_group_contact = (
    SELECT MAX(GREATEST(
      COALESCE(latest_contact_email, '1900-01-01'::timestamptz),
      COALESCE(latest_contact_meeting, '1900-01-01'::timestamptz)
    ))
    FROM contacts_raw
    WHERE group_contact = p_group_name
  )
  WHERE group_contact = p_group_name;
END;
$$;

-- Update the existing update_contacts_from_interaction trigger function
-- to recalculate group dates when a group member has an interaction
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
  v_latest_email_date timestamptz;
  v_latest_meeting_date timestamptz;
  v_group_names text[];
BEGIN
  -- Determine interaction type based on source field
  v_is_email := (NEW.source ILIKE '%email%');
  v_is_meeting := (NEW.source ILIKE '%meeting%');
  
  -- Get the user who created this interaction
  v_user_id := COALESCE(NEW.created_by, auth.uid());
  
  -- Count attendees if it's a meeting
  IF v_is_meeting AND NEW.emails_arr IS NOT NULL THEN
    v_attendee_count := array_length(NEW.emails_arr, 1);
  END IF;
  
  -- Only process meetings with 4 or fewer attendees to exclude large group meetings
  IF v_is_meeting AND (v_attendee_count IS NULL OR v_attendee_count > 4) THEN
    v_is_meeting := false;
  END IF;
  
  -- Collect unique group names that need recalculation
  v_group_names := ARRAY[]::text[];
  
  -- Process each email in the interaction
  IF NEW.emails_arr IS NOT NULL THEN
    FOREACH v_email IN ARRAY NEW.emails_arr
    LOOP
      -- Get current latest dates for this contact
      SELECT latest_contact_email, latest_contact_meeting
      INTO v_latest_email_date, v_latest_meeting_date
      FROM public.contacts_raw
      WHERE lower(email_address) = lower(v_email)
        AND (
          assigned_to = v_user_id OR 
          created_by = v_user_id OR
          public.is_admin(v_user_id)
        )
      LIMIT 1;
      
      -- Update contacts that the user owns or if user is admin
      UPDATE public.contacts_raw
      SET 
        latest_contact_email = CASE 
          WHEN v_is_email AND (latest_contact_email IS NULL OR NEW.occurred_at > latest_contact_email)
          THEN NEW.occurred_at
          ELSE latest_contact_email
        END,
        
        latest_contact_meeting = CASE 
          WHEN v_is_meeting AND (latest_contact_meeting IS NULL OR NEW.occurred_at > latest_contact_meeting)
          THEN NEW.occurred_at
          ELSE latest_contact_meeting
        END,
        
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
        
        -- Update email detail fields if this is the most recent email
        email_subject = CASE
          WHEN v_is_email AND (v_latest_email_date IS NULL OR NEW.occurred_at >= v_latest_email_date)
          THEN NEW.subject
          ELSE email_subject
        END,
        
        email_from = CASE
          WHEN v_is_email AND (v_latest_email_date IS NULL OR NEW.occurred_at >= v_latest_email_date)
          THEN NEW.from_email
          ELSE email_from
        END,
        
        email_to = CASE
          WHEN v_is_email AND (v_latest_email_date IS NULL OR NEW.occurred_at >= v_latest_email_date)
          THEN NEW.to_emails
          ELSE email_to
        END,
        
        email_cc = CASE
          WHEN v_is_email AND (v_latest_email_date IS NULL OR NEW.occurred_at >= v_latest_email_date)
          THEN NEW.cc_emails
          ELSE email_cc
        END,
        
        -- Update meeting detail fields if this is the most recent meeting
        meeting_title = CASE
          WHEN v_is_meeting AND (v_latest_meeting_date IS NULL OR NEW.occurred_at >= v_latest_meeting_date)
          THEN NEW.subject
          ELSE meeting_title
        END,
        
        meeting_from = CASE
          WHEN v_is_meeting AND (v_latest_meeting_date IS NULL OR NEW.occurred_at >= v_latest_meeting_date)
          THEN NEW.from_email
          ELSE meeting_from
        END,
        
        meeting_to = CASE
          WHEN v_is_meeting AND (v_latest_meeting_date IS NULL OR NEW.occurred_at >= v_latest_meeting_date)
          THEN NEW.to_emails
          ELSE meeting_to
        END,
        
        meeting_cc = CASE
          WHEN v_is_meeting AND (v_latest_meeting_date IS NULL OR NEW.occurred_at >= v_latest_meeting_date)
          THEN NEW.cc_emails
          ELSE meeting_cc
        END,
        
        -- Update all_emails field with unique emails from all interactions
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
          WHEN v_is_email THEN COALESCE(of_emails, 0) + 1
          ELSE of_emails
        END,
        
        of_meetings = CASE
          WHEN v_is_meeting THEN COALESCE(of_meetings, 0) + 1
          ELSE of_meetings
        END,
        
        total_of_contacts = COALESCE(of_emails, 0) + COALESCE(of_meetings, 0) + 
          CASE WHEN v_is_email THEN 1 ELSE 0 END +
          CASE WHEN v_is_meeting THEN 1 ELSE 0 END,
        
        updated_at = now()
      WHERE lower(email_address) = lower(v_email)
        AND (
          assigned_to = v_user_id OR 
          created_by = v_user_id OR
          public.is_admin(v_user_id)
        );
      
      -- Collect group names for recalculation
      SELECT array_agg(DISTINCT group_contact) 
      INTO v_group_names
      FROM (
        SELECT unnest(v_group_names) AS group_contact
        UNION
        SELECT group_contact 
        FROM contacts_raw 
        WHERE lower(email_address) = lower(v_email)
          AND group_contact IS NOT NULL
      ) sub
      WHERE group_contact IS NOT NULL;
    END LOOP;
  END IF;
  
  -- Recalculate group contact dates for all affected groups
  IF v_group_names IS NOT NULL AND array_length(v_group_names, 1) > 0 THEN
    DECLARE
      v_group_name text;
    BEGIN
      FOREACH v_group_name IN ARRAY v_group_names
      LOOP
        PERFORM recalculate_group_contact_date(v_group_name);
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;