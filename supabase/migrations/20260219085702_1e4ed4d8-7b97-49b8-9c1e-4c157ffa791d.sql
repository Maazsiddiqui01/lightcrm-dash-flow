-- Replace refresh_contact_recency to use ALL email addresses (primary + alternates)
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
  WHERE emails_arr && v_emails
    AND source ILIKE '%email%';

  -- Latest meeting across ALL addresses
  SELECT MAX(occurred_at) INTO v_latest_meeting
  FROM emails_meetings_raw
  WHERE emails_arr && v_emails
    AND source ILIKE '%meeting%';

  -- Determine most recent and type
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