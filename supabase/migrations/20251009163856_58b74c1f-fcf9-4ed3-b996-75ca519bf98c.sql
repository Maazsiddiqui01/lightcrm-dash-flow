-- Fix MODERATE ISSUE #1: Add explicit RLS checks to RPC functions
CREATE OR REPLACE FUNCTION public.contacts_ids_by_focus_areas(p_focus_areas text[])
RETURNS TABLE(contact_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id as contact_id
  FROM public.contacts_raw c
  CROSS JOIN LATERAL regexp_split_to_table(
    COALESCE(c.lg_focus_areas_comprehensive_list, ''),
    '\s*,\s*'
  ) AS fa(token)
  WHERE fa.token <> ''
    AND fa.token = ANY(p_focus_areas)
    AND (
      public.is_admin(auth.uid()) OR 
      c.assigned_to = auth.uid() OR 
      c.created_by = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.contacts_ids_by_opportunity_filters(
  p_tier text[] DEFAULT NULL::text[], 
  p_platform_add_on text[] DEFAULT NULL::text[], 
  p_ownership_type text[] DEFAULT NULL::text[], 
  p_status text[] DEFAULT NULL::text[], 
  p_lg_lead text[] DEFAULT NULL::text[], 
  p_date_start text DEFAULT NULL::text, 
  p_date_end text DEFAULT NULL::text, 
  p_ebitda_min numeric DEFAULT NULL::numeric, 
  p_ebitda_max numeric DEFAULT NULL::numeric
)
RETURNS TABLE(contact_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id as contact_id
  FROM contacts_raw c
  INNER JOIN opportunities_app o ON (
    c.full_name = o.deal_source_individual_1 
    OR c.full_name = o.deal_source_individual_2
  )
  WHERE 
    (p_tier IS NULL OR o.tier = ANY(p_tier))
    AND (p_platform_add_on IS NULL OR o.platform_add_on = ANY(p_platform_add_on))
    AND (p_ownership_type IS NULL OR o.ownership_type = ANY(p_ownership_type))
    AND (p_status IS NULL OR o.status = ANY(p_status))
    AND (p_lg_lead IS NULL OR 
         o.investment_professional_point_person_1 ILIKE ANY(SELECT '%' || unnest(p_lg_lead) || '%') OR
         o.investment_professional_point_person_2 ILIKE ANY(SELECT '%' || unnest(p_lg_lead) || '%'))
    AND (p_date_start IS NULL OR o.date_of_origination >= p_date_start::date)
    AND (p_date_end IS NULL OR o.date_of_origination <= p_date_end::date)
    AND (p_ebitda_min IS NULL OR COALESCE(o.ebitda_in_ms, 0) >= p_ebitda_min)
    AND (p_ebitda_max IS NULL OR COALESCE(o.ebitda_in_ms, 0) <= p_ebitda_max)
    AND (
      public.is_admin(auth.uid()) OR 
      c.assigned_to = auth.uid() OR 
      c.created_by = auth.uid()
    );
END;
$$;

-- Fix MODERATE ISSUE #2: Add user ownership validation to interaction sync trigger
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
$$;

-- Fix MODERATE ISSUE #3: Restrict refresh_all_contact_interactions to admins
CREATE OR REPLACE FUNCTION public.refresh_all_contact_interactions()
RETURNS TABLE(contacts_updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Only admins can refresh all contacts
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required to refresh all contacts';
  END IF;
  
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
      AND array_length(emails_arr, 1) <= 4
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

-- Fix MINOR ISSUE #5: Add ownership check to set_intentional_no_outreach
CREATE OR REPLACE FUNCTION public.set_intentional_no_outreach(
  p_contact_id uuid, 
  p_note text DEFAULT NULL::text, 
  p_action_type text DEFAULT 'skip'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify ownership before allowing update
  IF NOT EXISTS (
    SELECT 1 FROM public.contacts_raw 
    WHERE id = p_contact_id 
    AND (
      assigned_to = auth.uid() OR 
      created_by = auth.uid() OR 
      public.is_admin(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this contact';
  END IF;
  
  IF p_action_type = 'skip' THEN
    UPDATE public.contacts_raw
    SET 
      intentional_no_outreach = TRUE,
      intentional_no_outreach_date = now(),
      intentional_no_outreach_note = p_note,
      most_recent_contact = now()::date
    WHERE id = p_contact_id;
  ELSIF p_action_type = 'undo' THEN
    UPDATE public.contacts_raw
    SET 
      intentional_no_outreach = FALSE,
      intentional_no_outreach_date = NULL,
      intentional_no_outreach_note = NULL
    WHERE id = p_contact_id;
  END IF;

  INSERT INTO public.contact_intentional_no_outreach_events (
    contact_id, 
    performed_by, 
    note, 
    action_type
  )
  VALUES (
    p_contact_id, 
    auth.uid(), 
    p_note, 
    p_action_type
  );
END;
$$;