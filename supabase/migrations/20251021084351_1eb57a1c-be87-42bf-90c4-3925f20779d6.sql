-- Fix get_group_contacts_view to use correct member attribute names
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    COUNT(DISTINCT cgm.contact_id)::bigint as member_count,
    STRING_AGG(DISTINCT c.full_name, ', ' ORDER BY c.full_name) FILTER (WHERE cgm.email_role = 'to') as to_members,
    STRING_AGG(DISTINCT c.full_name, ', ' ORDER BY c.full_name) FILTER (WHERE cgm.email_role = 'cc') as cc_members,
    STRING_AGG(DISTINCT c.full_name, ', ' ORDER BY c.full_name) FILTER (WHERE cgm.email_role = 'bcc') as bcc_members,
    STRING_AGG(DISTINCT c.full_name, ', ' ORDER BY c.full_name) as member_names,
    g.max_lag_days,
    g.focus_area as group_focus_area,
    g.sector as group_sector,
    g.notes as group_notes,
    MAX(c.most_recent_contact) as most_recent_contact,
    MAX(c.latest_contact_email) as most_recent_email,
    MAX(c.latest_contact_meeting) as most_recent_meeting,
    CASE 
      WHEN MAX(c.most_recent_contact) IS NOT NULL 
      THEN EXTRACT(DAY FROM (NOW() - MAX(c.most_recent_contact)))::integer
      ELSE NULL
    END as days_since_last_contact,
    CASE 
      WHEN MAX(c.most_recent_contact) IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN EXTRACT(DAY FROM ((MAX(c.most_recent_contact) + (g.max_lag_days || ' days')::interval) - NOW()))::integer
      ELSE NULL
    END as days_over_under_max_lag,
    CASE 
      WHEN MAX(c.most_recent_contact) IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN (MAX(c.most_recent_contact) + (g.max_lag_days || ' days')::interval)::date
      ELSE NULL
    END as next_outreach_date,
    CASE 
      WHEN MAX(c.most_recent_contact) IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN (MAX(c.most_recent_contact) + (g.max_lag_days || ' days')::interval) < NOW()
      ELSE false
    END as is_overdue,
    CASE 
      WHEN MAX(c.most_recent_contact) IS NOT NULL AND g.max_lag_days IS NOT NULL 
      THEN EXTRACT(DAY FROM (NOW() - MAX(c.most_recent_contact)))::integer > g.max_lag_days
      ELSE false
    END as is_over_max_lag,
    STRING_AGG(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) as opportunities,
    COUNT(DISTINCT o.id)::integer as opportunity_count,
    STRING_AGG(DISTINCT c.lg_focus_areas_comprehensive_list, ', ') as all_focus_areas,
    STRING_AGG(DISTINCT c.lg_sector, ', ') as all_sectors,
    g.assigned_to,
    g.created_by,
    g.created_at as group_created_at,
    g.updated_at as last_updated,
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id', c.id::text,
        'contact_id', c.id::text,
        'full_name', c.full_name,
        'email_address', c.email_address,
        'group_email_role', cgm.email_role,
        'organization', c.organization,
        'title', c.title,
        'most_recent_contact', c.most_recent_contact
      )
    ) as members
  FROM groups g
  LEFT JOIN contact_group_memberships cgm ON cgm.group_id = g.id
  LEFT JOIN contacts_raw c ON c.id = cgm.contact_id
  LEFT JOIN opportunities_raw o ON (
    c.full_name = o.deal_source_individual_1 
    OR c.full_name = o.deal_source_individual_2
  )
  GROUP BY g.id, g.name, g.max_lag_days, g.focus_area, g.sector, g.notes, 
           g.assigned_to, g.created_by, g.created_at, g.updated_at
  ORDER BY g.name;
END;
$$;