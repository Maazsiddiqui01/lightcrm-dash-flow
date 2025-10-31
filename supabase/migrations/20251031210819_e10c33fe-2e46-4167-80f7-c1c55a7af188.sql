-- Remove attendee-count filters from all recency functions

-- 1. Update refresh_contact_recency to include ALL meetings
CREATE OR REPLACE FUNCTION public.refresh_contact_recency(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_latest_email timestamp with time zone;
  v_latest_meeting timestamp with time zone;
  v_most_recent timestamp with time zone;
  v_delta_type text;
BEGIN
  SELECT lower(email_address) INTO v_email
  FROM public.contacts_raw
  WHERE id = p_contact_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  -- Get latest email (no attendee filter)
  SELECT MAX(occurred_at) INTO v_latest_email
  FROM public.emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%email%';

  -- Get latest meeting - REMOVED ATTENDEE FILTER
  SELECT MAX(occurred_at) INTO v_latest_meeting
  FROM public.emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%meeting%';

  -- Determine most recent and type
  IF v_latest_email IS NULL AND v_latest_meeting IS NULL THEN
    v_most_recent := NULL;
    v_delta_type := NULL;
  ELSIF v_latest_email IS NULL THEN
    v_most_recent := v_latest_meeting;
    v_delta_type := 'Meeting';
  ELSIF v_latest_meeting IS NULL THEN
    v_most_recent := v_latest_email;
    v_delta_type := 'Email';
  ELSIF v_latest_meeting > v_latest_email THEN
    v_most_recent := v_latest_meeting;
    v_delta_type := 'Meeting';
  ELSE
    v_most_recent := v_latest_email;
    v_delta_type := 'Email';
  END IF;

  -- Update contact
  UPDATE public.contacts_raw
  SET 
    latest_contact_email = v_latest_email,
    latest_contact_meeting = v_latest_meeting,
    most_recent_contact = v_most_recent,
    delta_type = v_delta_type,
    updated_at = now()
  WHERE id = p_contact_id;

END;
$$;

-- 2. Update refresh_contact_interaction_counts to include ALL meetings
CREATE OR REPLACE FUNCTION public.refresh_contact_interaction_counts(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_email_count int;
  v_meeting_count int;
BEGIN
  SELECT lower(email_address) INTO v_email
  FROM contacts_raw
  WHERE id = p_contact_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  -- Count emails
  SELECT COUNT(*)::int INTO v_email_count
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%email%';

  -- Count meetings - REMOVED ATTENDEE FILTER
  SELECT COUNT(*)::int INTO v_meeting_count
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%meeting%';

  -- Update counts
  UPDATE contacts_raw
  SET 
    of_emails = v_email_count,
    of_meetings = v_meeting_count,
    total_of_contacts = v_email_count + v_meeting_count,
    updated_at = now()
  WHERE id = p_contact_id;

END;
$$;

-- 3. Update refresh_contact_interaction_details to include ALL meetings
CREATE OR REPLACE FUNCTION public.refresh_contact_interaction_details(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_latest_email record;
  v_latest_meeting record;
  v_days_since_email int;
  v_days_since_meeting int;
  v_contact_type text;
BEGIN
  SELECT lower(email_address) INTO v_email
  FROM contacts_raw
  WHERE id = p_contact_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  -- Get latest email details
  SELECT subject, from_email, to_emails, cc_emails, occurred_at
  INTO v_latest_email
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%email%'
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT 1;

  -- Get latest meeting details - REMOVED ATTENDEE FILTER
  SELECT subject, from_email, to_emails, cc_emails, occurred_at
  INTO v_latest_meeting
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%meeting%'
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT 1;

  -- Calculate days since last email
  IF v_latest_email.occurred_at IS NOT NULL THEN
    v_days_since_email := EXTRACT(DAY FROM (now() - v_latest_email.occurred_at))::int;
  END IF;

  -- Calculate days since last meeting
  IF v_latest_meeting.occurred_at IS NOT NULL THEN
    v_days_since_meeting := EXTRACT(DAY FROM (now() - v_latest_meeting.occurred_at))::int;
  END IF;

  -- Determine contact type
  IF v_latest_email.occurred_at IS NULL AND v_latest_meeting.occurred_at IS NULL THEN
    v_contact_type := 'No Contact';
  ELSIF v_latest_email.occurred_at IS NULL THEN
    v_contact_type := 'Meeting Only';
  ELSIF v_latest_meeting.occurred_at IS NULL THEN
    v_contact_type := 'Email Only';
  ELSE
    v_contact_type := 'Both';
  END IF;

  -- Update contact details
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
    days_since_last_email = v_days_since_email,
    days_since_last_meeting = v_days_since_meeting,
    contact_type = v_contact_type,
    updated_at = now()
  WHERE id = p_contact_id;

END;
$$;

-- 4. Backfill all contact data immediately
SELECT public.refresh_all_contact_recency();