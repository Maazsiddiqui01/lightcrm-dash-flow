-- Fix all critical issues in get_group_contacts_view
DROP FUNCTION IF EXISTS public.get_group_contacts_view();

CREATE OR REPLACE FUNCTION public.get_group_contacts_view()
RETURNS TABLE (
  group_id uuid,
  group_name text,
  member_count bigint,
  to_members text,
  cc_members text,
  bcc_members text,
  member_names text,
  max_lag_days integer,
  group_focus_area text,
  group_sector text,
  group_notes text,
  most_recent_contact timestamp with time zone,
  most_recent_email timestamp with time zone,
  most_recent_meeting timestamp with time zone,
  days_since_last_contact integer,
  days_over_under_max_lag integer,
  next_outreach_date date,
  is_overdue boolean,
  is_over_max_lag boolean,
  opportunities text,
  opportunity_count integer,
  all_focus_areas text,
  all_sectors text,
  assigned_to uuid,
  created_by uuid,
  group_created_at timestamp with time zone,
  last_updated timestamp with time zone,
  members jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Changed from SECURITY DEFINER - now respects RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH group_members AS (
    -- Pre-aggregate members to avoid DISTINCT in JSONB_AGG
    SELECT 
      cgm.group_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'contact_id', c.id,
          'full_name', c.full_name,
          'email_address', c.email_address,
          'group_email_role', cgm.email_role,
          'organization', c.organization,
          'title', c.title,
          'most_recent_contact', c.most_recent_contact
        ) ORDER BY c.full_name
      ) as members_json,
      STRING_AGG(c.full_name, ', ' ORDER BY c.full_name) FILTER (WHERE cgm.email_role = 'to') as to_names,
      STRING_AGG(c.full_name, ', ' ORDER BY c.full_name) FILTER (WHERE cgm.email_role = 'cc') as cc_names,
      STRING_AGG(c.full_name, ', ' ORDER BY c.full_name) FILTER (WHERE cgm.email_role = 'bcc') as bcc_names,
      STRING_AGG(c.full_name, ', ' ORDER BY c.full_name) as all_names,
      COUNT(c.id) as member_cnt,
      MAX(c.most_recent_contact) as max_contact,
      MAX(c.latest_contact_email) as max_email,
      MAX(c.latest_contact_meeting) as max_meeting,
      STRING_AGG(DISTINCT c.lg_focus_areas_comprehensive_list, ', ') as focus_areas,
      STRING_AGG(DISTINCT c.lg_sector, ', ') as sectors
    FROM contact_group_memberships cgm
    JOIN contacts_raw c ON c.id = cgm.contact_id
    GROUP BY cgm.group_id
  ),
  group_opps AS (
    -- Pre-aggregate opportunities separately
    SELECT 
      cgm.group_id,
      STRING_AGG(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) as opp_names,
      COUNT(DISTINCT o.id) as opp_cnt
    FROM contact_group_memberships cgm
    JOIN contacts_raw c ON c.id = cgm.contact_id
    LEFT JOIN opportunities_raw o ON (
      c.full_name = o.deal_source_individual_1 
      OR c.full_name = o.deal_source_individual_2
    )
    WHERE o.id IS NOT NULL
    GROUP BY cgm.group_id
  )
  SELECT 
    g.id as group_id,
    g.name as group_name,
    COALESCE(gm.member_cnt, 0)::bigint as member_count,
    gm.to_names as to_members,
    gm.cc_names as cc_members,
    gm.bcc_names as bcc_members,
    gm.all_names as member_names,
    g.max_lag_days,
    g.focus_area as group_focus_area,
    g.sector as group_sector,
    g.notes as group_notes,
    gm.max_contact as most_recent_contact,
    gm.max_email as most_recent_email,
    gm.max_meeting as most_recent_meeting,
    CASE 
      WHEN gm.max_contact IS NOT NULL 
      THEN EXTRACT(DAY FROM (NOW() - gm.max_contact))::integer
      ELSE NULL
    END as days_since_last_contact,
    CASE 
      WHEN gm.max_contact IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN EXTRACT(DAY FROM ((gm.max_contact + (g.max_lag_days || ' days')::interval) - NOW()))::integer
      ELSE NULL
    END as days_over_under_max_lag,
    CASE 
      WHEN gm.max_contact IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN (gm.max_contact + (g.max_lag_days || ' days')::interval)::date
      ELSE NULL
    END as next_outreach_date,
    CASE 
      WHEN gm.max_contact IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN (gm.max_contact + (g.max_lag_days || ' days')::interval) < NOW()
      ELSE false
    END as is_overdue,
    CASE 
      WHEN gm.max_contact IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN EXTRACT(DAY FROM (NOW() - gm.max_contact))::integer > g.max_lag_days
      ELSE false
    END as is_over_max_lag,
    go.opp_names as opportunities,
    COALESCE(go.opp_cnt, 0)::integer as opportunity_count,
    gm.focus_areas as all_focus_areas,
    gm.sectors as all_sectors,
    g.assigned_to,
    g.created_by,
    g.created_at as group_created_at,
    g.updated_at as last_updated,
    COALESCE(gm.members_json, '[]'::jsonb) as members
  FROM groups g
  LEFT JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN group_opps go ON go.group_id = g.id
  ORDER BY g.name;
END;
$$;