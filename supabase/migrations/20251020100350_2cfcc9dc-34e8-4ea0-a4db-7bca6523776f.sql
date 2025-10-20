-- Fix get_group_contacts_view to bypass RLS and work with new schema
DROP FUNCTION IF EXISTS public.get_group_contacts_view();

CREATE OR REPLACE FUNCTION public.get_group_contacts_view()
RETURNS TABLE (
  group_name text,
  member_count bigint,
  members jsonb,
  member_names text,
  to_members text,
  cc_members text,
  bcc_members text,
  max_lag_days integer,
  group_focus_area text,
  group_sector text,
  group_notes text,
  most_recent_contact timestamp with time zone,
  most_recent_email timestamp with time zone,
  most_recent_meeting timestamp with time zone,
  days_since_last_contact integer,
  is_over_max_lag boolean,
  is_overdue boolean,
  days_over_under_max_lag integer,
  next_outreach_date date,
  opportunities text,
  opportunity_count integer,
  all_focus_areas text,
  all_sectors text,
  last_updated timestamp with time zone,
  assigned_to uuid,
  created_by uuid,
  group_created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass RLS within this security definer context
  SET LOCAL row_security = off;
  
  RETURN QUERY
  SELECT 
    g.name as group_name,
    COUNT(DISTINCT cgm.contact_id)::bigint as member_count,
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'id', c.id,
        'full_name', c.full_name,
        'email_address', c.email_address,
        'organization', c.organization,
        'email_role', cgm.email_role,
        'most_recent_contact', c.most_recent_contact
      )
      ORDER BY c.most_recent_contact DESC NULLS LAST
    ) FILTER (WHERE c.id IS NOT NULL) as members,
    string_agg(DISTINCT c.full_name, ', ' ORDER BY c.full_name) as member_names,
    string_agg(DISTINCT c.full_name, ', ') FILTER (WHERE cgm.email_role = 'to') as to_members,
    string_agg(DISTINCT c.full_name, ', ') FILTER (WHERE cgm.email_role = 'cc') as cc_members,
    string_agg(DISTINCT c.full_name, ', ') FILTER (WHERE cgm.email_role = 'bcc') as bcc_members,
    g.max_lag_days,
    g.focus_area as group_focus_area,
    g.sector as group_sector,
    g.notes as group_notes,
    MAX(c.most_recent_contact) as most_recent_contact,
    MAX(c.latest_contact_email) as most_recent_email,
    MAX(c.latest_contact_meeting) as most_recent_meeting,
    EXTRACT(DAY FROM (now() - MAX(c.most_recent_contact)))::integer as days_since_last_contact,
    CASE 
      WHEN g.max_lag_days IS NOT NULL AND EXTRACT(DAY FROM (now() - MAX(c.most_recent_contact))) > g.max_lag_days 
      THEN true 
      ELSE false 
    END as is_over_max_lag,
    CASE 
      WHEN EXTRACT(DAY FROM (now() - MAX(c.most_recent_contact))) > 90 
      THEN true 
      ELSE false 
    END as is_overdue,
    CASE 
      WHEN g.max_lag_days IS NOT NULL 
      THEN EXTRACT(DAY FROM (now() - MAX(c.most_recent_contact)))::integer - g.max_lag_days
      ELSE NULL 
    END as days_over_under_max_lag,
    (MAX(c.most_recent_contact)::date + COALESCE(g.max_lag_days, 90)) as next_outreach_date,
    string_agg(DISTINCT o.deal_name, ', ') as opportunities,
    COUNT(DISTINCT o.id)::integer as opportunity_count,
    string_agg(DISTINCT fa, ', ') FILTER (WHERE fa IS NOT NULL AND fa != '') as all_focus_areas,
    string_agg(DISTINCT c.lg_sector, ', ') FILTER (WHERE c.lg_sector IS NOT NULL AND c.lg_sector != '') as all_sectors,
    g.updated_at as last_updated,
    g.assigned_to,
    g.created_by,
    g.created_at as group_created_at
  FROM public.groups g
  LEFT JOIN public.contact_group_memberships cgm ON cgm.group_id = g.id
  LEFT JOIN public.contacts_raw c ON c.id = cgm.contact_id
  LEFT JOIN public.opportunities_raw o ON (
    c.full_name = o.deal_source_individual_1 OR 
    c.full_name = o.deal_source_individual_2
  )
  LEFT JOIN LATERAL unnest(
    string_to_array(c.lg_focus_areas_comprehensive_list, ',')
  ) fa ON true
  GROUP BY g.id, g.name, g.max_lag_days, g.focus_area, g.sector, g.notes, g.updated_at, g.assigned_to, g.created_by, g.created_at
  ORDER BY most_recent_contact DESC NULLS LAST;
END;
$$;

-- Update add_group_note to use group_id instead of group_name
DROP FUNCTION IF EXISTS public.add_group_note(text, text, text);

CREATE OR REPLACE FUNCTION public.add_group_note(
  p_group_id uuid,
  p_field text,
  p_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_name text;
BEGIN
  -- Get group name for legacy compatibility
  SELECT name INTO v_group_name
  FROM groups
  WHERE id = p_group_id;

  IF v_group_name IS NULL THEN
    RAISE EXCEPTION 'Group not found with id: %', p_group_id;
  END IF;

  -- Update group notes in new schema
  UPDATE groups
  SET 
    notes = p_content,
    updated_at = now()
  WHERE id = p_group_id;
  
  -- Insert into timeline
  INSERT INTO group_note_events (
    group_name,
    field,
    content,
    created_by
  )
  VALUES (
    v_group_name,
    p_field,
    p_content,
    auth.uid()
  );

  -- Also update legacy group_notes on all member contacts for backward compatibility
  UPDATE contacts_raw
  SET 
    group_notes = p_content,
    updated_at = now()
  WHERE id IN (
    SELECT contact_id 
    FROM contact_group_memberships 
    WHERE group_id = p_group_id
  );
END;
$$;

-- Update recalculate_group_contact_date to use group_id
DROP FUNCTION IF EXISTS public.recalculate_group_contact_date(text);

CREATE OR REPLACE FUNCTION public.recalculate_group_contact_date(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update most_recent_group_contact for all members of the group
  -- to be the MAX of all group members' most_recent_contact
  UPDATE contacts_raw
  SET most_recent_group_contact = (
    SELECT MAX(c.most_recent_contact)
    FROM contacts_raw c
    INNER JOIN contact_group_memberships cgm ON cgm.contact_id = c.id
    WHERE cgm.group_id = p_group_id
      AND c.most_recent_contact IS NOT NULL
  )
  WHERE id IN (
    SELECT contact_id 
    FROM contact_group_memberships 
    WHERE group_id = p_group_id
  );
END;
$$;