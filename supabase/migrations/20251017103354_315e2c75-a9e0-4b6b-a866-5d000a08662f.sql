-- Update the trigger function to also update interaction detail fields
CREATE OR REPLACE FUNCTION public.update_contacts_from_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_is_email boolean;
  v_is_meeting boolean;
  v_attendee_count int;
  v_user_id uuid;
  v_latest_email_date timestamptz;
  v_latest_meeting_date timestamptz;
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
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create function to refresh interaction details for a single contact
CREATE OR REPLACE FUNCTION public.refresh_contact_interaction_details(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_latest_email record;
  v_latest_meeting record;
  v_all_emails text;
BEGIN
  -- Get contact email
  SELECT lower(email_address) INTO v_email
  FROM contacts_raw
  WHERE id = p_contact_id;
  
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;
  
  -- Find latest email interaction
  SELECT subject, from_email, to_emails, cc_emails
  INTO v_latest_email
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%email%'
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT 1;
  
  -- Find latest meeting interaction (excluding large meetings)
  SELECT subject, from_email, to_emails, cc_emails
  INTO v_latest_meeting
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%meeting%'
    AND (emails_arr IS NULL OR array_length(emails_arr, 1) <= 4)
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT 1;
  
  -- Build all_emails list
  SELECT string_agg(DISTINCT email, '; ' ORDER BY email)
  INTO v_all_emails
  FROM unnest(
    ARRAY(
      SELECT DISTINCT unnest(emails_arr)
      FROM emails_meetings_raw
      WHERE emails_arr @> ARRAY[v_email]
    )
  ) AS email;
  
  -- Update contact with latest interaction details
  UPDATE contacts_raw
  SET 
    email_subject = v_latest_email.subject,
    email_from = v_latest_email.from_email,
    email_to = v_latest_email.to_emails,
    email_cc = v_latest_email.cc_emails,
    meeting_title = v_latest_meeting.subject,
    meeting_from = v_latest_meeting.from_email,
    meeting_to = v_latest_meeting.to_emails,
    meeting_cc = v_latest_meeting.cc_emails,
    all_emails = v_all_emails,
    updated_at = now()
  WHERE id = p_contact_id;
END;
$function$;

-- Create function to refresh all contacts' interaction details
CREATE OR REPLACE FUNCTION public.refresh_all_contact_interaction_details()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_rec record;
  updated_count integer := 0;
BEGIN
  -- Update all contacts with their latest interaction details
  FOR contact_rec IN 
    SELECT id
    FROM public.contacts_raw 
    WHERE email_address IS NOT NULL 
      AND email_address != ''
  LOOP
    PERFORM public.refresh_contact_interaction_details(contact_rec.id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$function$;

-- Initial data sync: populate all existing contacts with their latest interaction details
SELECT public.refresh_all_contact_interaction_details();