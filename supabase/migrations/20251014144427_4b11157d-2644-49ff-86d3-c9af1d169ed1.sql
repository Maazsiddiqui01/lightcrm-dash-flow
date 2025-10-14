-- ============================================
-- IMMEDIATE & HIGH PRIORITY FIXES FOR CONTACTS
-- ============================================

-- 1. Add database indexes for better filter performance
CREATE INDEX IF NOT EXISTS idx_contacts_lg_sector ON contacts_raw(lg_sector) WHERE lg_sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts_raw(organization) WHERE organization IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts_raw(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_delta_type ON contacts_raw(delta_type) WHERE delta_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_most_recent_contact ON contacts_raw(most_recent_contact DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contacts_delta ON contacts_raw(delta) WHERE delta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts_raw(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts_raw(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_intentional_no_outreach ON contacts_raw(intentional_no_outreach) WHERE intentional_no_outreach = true;

-- Index for email uniqueness checks
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON contacts_raw(lower(email_address)) WHERE email_address IS NOT NULL;

-- 2. Create function to refresh interaction counts for a single contact
CREATE OR REPLACE FUNCTION refresh_contact_interaction_counts(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_email_count int;
  v_meeting_count int;
BEGIN
  -- Get contact email
  SELECT lower(email_address) INTO v_email
  FROM contacts_raw
  WHERE id = p_contact_id;
  
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;
  
  -- Count emails (excluding large group meetings)
  SELECT COUNT(*)::int INTO v_email_count
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%email%';
  
  -- Count meetings (excluding large group meetings > 4 attendees)
  SELECT COUNT(*)::int INTO v_meeting_count
  FROM emails_meetings_raw
  WHERE emails_arr @> ARRAY[v_email]
    AND source ILIKE '%meeting%'
    AND (emails_arr IS NULL OR array_length(emails_arr, 1) <= 4);
  
  -- Update contact
  UPDATE contacts_raw
  SET 
    of_emails = v_email_count,
    of_meetings = v_meeting_count,
    total_of_contacts = v_email_count + v_meeting_count,
    updated_at = now()
  WHERE id = p_contact_id;
END;
$$;

-- 3. Create function to refresh all contact interaction counts
CREATE OR REPLACE FUNCTION refresh_all_contact_interactions()
RETURNS TABLE(contacts_updated int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
  contact_rec record;
BEGIN
  -- Loop through all contacts with email addresses
  FOR contact_rec IN 
    SELECT id, lower(email_address) as email
    FROM contacts_raw
    WHERE email_address IS NOT NULL AND email_address != ''
  LOOP
    -- Update email count
    UPDATE contacts_raw c
    SET of_emails = (
      SELECT COUNT(*)::int
      FROM emails_meetings_raw i
      WHERE i.emails_arr @> ARRAY[contact_rec.email]
        AND i.source ILIKE '%email%'
    )
    WHERE c.id = contact_rec.id;
    
    -- Update meeting count (exclude large meetings)
    UPDATE contacts_raw c
    SET of_meetings = (
      SELECT COUNT(*)::int
      FROM emails_meetings_raw i
      WHERE i.emails_arr @> ARRAY[contact_rec.email]
        AND i.source ILIKE '%meeting%'
        AND (i.emails_arr IS NULL OR array_length(i.emails_arr, 1) <= 4)
    )
    WHERE c.id = contact_rec.id;
    
    -- Update total
    UPDATE contacts_raw c
    SET total_of_contacts = COALESCE(c.of_emails, 0) + COALESCE(c.of_meetings, 0),
        updated_at = now()
    WHERE c.id = contact_rec.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_count;
END;
$$;

-- 4. Update the interaction trigger to also update email/meeting counts
CREATE OR REPLACE FUNCTION update_contacts_from_interaction()
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_contact_interaction_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_contact_interactions() TO authenticated;

COMMENT ON FUNCTION refresh_contact_interaction_counts(uuid) IS 'Refreshes email and meeting counts for a single contact';
COMMENT ON FUNCTION refresh_all_contact_interactions() IS 'Refreshes email and meeting counts for all contacts - use sparingly';
COMMENT ON INDEX idx_contacts_lg_sector IS 'Performance index for sector filtering';
COMMENT ON INDEX idx_contacts_most_recent_contact IS 'Performance index for date sorting and filtering';