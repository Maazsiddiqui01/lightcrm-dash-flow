-- Create efficient recency refresh functions and supporting indexes
-- 1) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_meetings_emails_arr ON public.emails_meetings_raw USING GIN (emails_arr);
CREATE INDEX IF NOT EXISTS idx_emails_meetings_occurred_at ON public.emails_meetings_raw (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON public.contacts_raw ((lower(email_address)));
CREATE INDEX IF NOT EXISTS idx_contact_emails_email_lower ON public.contact_email_addresses ((lower(email_address)));

-- 2) Function: refresh_contact_recency - updates latest email/meeting and most_recent_contact for a single contact
CREATE OR REPLACE FUNCTION public.refresh_contact_recency(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_latest_email timestamptz;
  v_latest_meeting timestamptz;
  v_most_recent timestamptz;
  v_delta_type text;
BEGIN
  -- Fetch primary email
  SELECT lower(email_address) INTO v_email
  FROM public.contacts_raw
  WHERE id = p_contact_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  -- Latest email
  SELECT MAX(occurred_at) INTO v_latest_email
  FROM public.emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%email%';

  -- Latest meeting (exclude large meetings > 4 attendees)
  SELECT MAX(occurred_at) INTO v_latest_meeting
  FROM public.emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%meeting%'
    AND (emails_arr IS NULL OR array_length(emails_arr, 1) <= 4);

  v_most_recent := GREATEST(COALESCE(v_latest_email, '1900-01-01'), COALESCE(v_latest_meeting, '1900-01-01'));
  IF v_most_recent = '1900-01-01' THEN
    v_most_recent := NULL;
  END IF;

  v_delta_type := CASE 
    WHEN v_latest_email IS NOT NULL AND (v_latest_meeting IS NULL OR v_latest_email >= v_latest_meeting) THEN 'Email'
    WHEN v_latest_meeting IS NOT NULL THEN 'Meeting'
    ELSE NULL
  END;

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

-- 3) Function: refresh_contacts_by_emails - refresh contacts matching provided emails (including alternate emails)
CREATE OR REPLACE FUNCTION public.refresh_contacts_by_emails(p_emails text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ids uuid[];
  v_id uuid;
  n int := 0;
BEGIN
  IF p_emails IS NULL OR array_length(p_emails,1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Collect distinct contact ids by primary or alternate emails
  SELECT ARRAY(
    SELECT DISTINCT c.id
    FROM public.contacts_raw c
    LEFT JOIN public.contact_email_addresses cea ON cea.contact_id = c.id
    WHERE lower(c.email_address) = ANY(SELECT lower(e) FROM unnest(p_emails) e)
       OR lower(cea.email_address) = ANY(SELECT lower(e) FROM unnest(p_emails) e)
  ) INTO v_ids;

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    PERFORM public.refresh_contact_recency(v_id);
    n := n + 1;
  END LOOP;

  -- Refresh group most recent dates only for groups that include these contacts
  PERFORM public.recalculate_group_contact_date(gid)
  FROM (
    SELECT DISTINCT cgm.group_id AS gid
    FROM public.contact_group_memberships cgm
    WHERE cgm.contact_id = ANY(v_ids)
  ) g;

  RETURN n;
END;
$$;

-- 4) Function: refresh_all_contact_recency - backfill for all contacts
CREATE OR REPLACE FUNCTION public.refresh_all_contact_recency()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  n int := 0;
BEGIN
  FOR v_id IN 
    SELECT id FROM public.contacts_raw 
    WHERE email_address IS NOT NULL AND trim(email_address) <> ''
  LOOP
    PERFORM public.refresh_contact_recency(v_id);
    n := n + 1;
  END LOOP;

  -- Refresh all group most recent dates after contact recency is updated
  PERFORM public.recalculate_group_contact_date(g.id)
  FROM public.groups g;

  RETURN n;
END;
$$;