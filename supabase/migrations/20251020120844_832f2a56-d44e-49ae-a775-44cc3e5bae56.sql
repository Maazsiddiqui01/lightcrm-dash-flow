-- Fix get_group_contacts_view RPC to use SQL SECURITY DEFINER
-- This prevents "SET not allowed within security-restricted operation" errors

-- Drop the problematic PL/pgSQL version
DROP FUNCTION IF EXISTS public.get_group_contacts_view();

-- Create the SQL version with SECURITY DEFINER to bypass RLS properly
CREATE OR REPLACE FUNCTION public.get_group_contacts_view()
RETURNS TABLE (
  group_id uuid,
  group_name text,
  group_sector text,
  group_focus_area text,
  group_notes text,
  max_lag_days integer,
  member_count bigint,
  member_names text,
  members jsonb,
  to_members text,
  cc_members text,
  bcc_members text,
  most_recent_contact timestamp with time zone,
  most_recent_email timestamp with time zone,
  most_recent_meeting timestamp with time zone,
  days_since_last_contact integer,
  is_overdue boolean,
  is_over_max_lag boolean,
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH group_data AS (
    SELECT 
      g.id as group_id,
      g.name as group_name,
      g.sector as group_sector,
      g.focus_area as group_focus_area,
      g.notes as group_notes,
      g.max_lag_days,
      g.assigned_to,
      g.created_by,
      g.created_at as group_created_at,
      g.updated_at as last_updated,
      COUNT(DISTINCT cgm.contact_id) as member_count,
      string_agg(DISTINCT c.full_name, ', ' ORDER BY c.full_name) as member_names,
      MAX(c.most_recent_contact) as most_recent_contact,
      MAX(c.latest_contact_email) as most_recent_email,
      MAX(c.latest_contact_meeting) as most_recent_meeting,
      string_agg(
        DISTINCT c.full_name, ', ' ORDER BY c.full_name
      ) FILTER (WHERE cgm.email_role = 'to') as to_members,
      string_agg(
        DISTINCT c.full_name, ', ' ORDER BY c.full_name
      ) FILTER (WHERE cgm.email_role = 'cc') as cc_members,
      string_agg(
        DISTINCT c.full_name, ', ' ORDER BY c.full_name
      ) FILTER (WHERE cgm.email_role = 'bcc') as bcc_members,
      string_agg(
        DISTINCT c.lg_focus_areas_comprehensive_list, ', '
      ) FILTER (WHERE c.lg_focus_areas_comprehensive_list IS NOT NULL AND c.lg_focus_areas_comprehensive_list != '') as all_focus_areas,
      string_agg(
        DISTINCT c.lg_sector, ', ' ORDER BY c.lg_sector
      ) FILTER (WHERE c.lg_sector IS NOT NULL AND c.lg_sector != '') as all_sectors,
      jsonb_agg(
        jsonb_build_object(
          'contact_id', c.id,
          'full_name', c.full_name,
          'email_address', c.email_address,
          'email_role', cgm.email_role,
          'organization', c.organization,
          'title', c.title,
          'most_recent_contact', c.most_recent_contact
        ) ORDER BY c.full_name
      ) as members
    FROM public.groups g
    LEFT JOIN public.contact_group_memberships cgm ON cgm.group_id = g.id
    LEFT JOIN public.contacts_raw c ON c.id = cgm.contact_id
    WHERE public.is_admin(auth.uid()) 
       OR g.assigned_to = auth.uid() 
       OR g.created_by = auth.uid()
    GROUP BY g.id, g.name, g.sector, g.focus_area, g.notes, g.max_lag_days, 
             g.assigned_to, g.created_by, g.created_at, g.updated_at
  ),
  with_opps AS (
    SELECT 
      gd.*,
      string_agg(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) as opportunities,
      COUNT(DISTINCT o.id)::integer as opportunity_count
    FROM group_data gd
    LEFT JOIN public.contact_group_memberships cgm2 ON cgm2.group_id = gd.group_id
    LEFT JOIN public.contacts_raw c2 ON c2.id = cgm2.contact_id
    LEFT JOIN public.opportunities_raw o ON (
      c2.full_name = o.deal_source_individual_1 
      OR c2.full_name = o.deal_source_individual_2
    )
    GROUP BY gd.group_id, gd.group_name, gd.group_sector, gd.group_focus_area, 
             gd.group_notes, gd.max_lag_days, gd.member_count, gd.member_names,
             gd.members, gd.to_members, gd.cc_members, gd.bcc_members,
             gd.most_recent_contact, gd.most_recent_email, gd.most_recent_meeting,
             gd.all_focus_areas, gd.all_sectors, gd.last_updated,
             gd.assigned_to, gd.created_by, gd.group_created_at
  )
  SELECT 
    group_id,
    group_name,
    group_sector,
    group_focus_area,
    group_notes,
    max_lag_days,
    member_count,
    member_names,
    members,
    to_members,
    cc_members,
    bcc_members,
    most_recent_contact,
    most_recent_email,
    most_recent_meeting,
    CASE 
      WHEN most_recent_contact IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (now() - most_recent_contact))::integer
    END as days_since_last_contact,
    CASE
      WHEN most_recent_contact IS NULL THEN false
      WHEN max_lag_days IS NULL THEN false
      ELSE EXTRACT(DAY FROM (now() - most_recent_contact))::integer > max_lag_days
    END as is_overdue,
    CASE
      WHEN most_recent_contact IS NULL THEN false
      WHEN max_lag_days IS NULL THEN false
      ELSE EXTRACT(DAY FROM (now() - most_recent_contact))::integer > max_lag_days
    END as is_over_max_lag,
    CASE
      WHEN most_recent_contact IS NULL OR max_lag_days IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (now() - most_recent_contact))::integer - max_lag_days
    END as days_over_under_max_lag,
    CASE
      WHEN most_recent_contact IS NULL OR max_lag_days IS NULL THEN NULL
      ELSE (most_recent_contact + (max_lag_days || ' days')::interval)::date
    END as next_outreach_date,
    opportunities,
    opportunity_count,
    all_focus_areas,
    all_sectors,
    last_updated,
    assigned_to,
    created_by,
    group_created_at
  FROM with_opps
  ORDER BY most_recent_contact DESC NULLS LAST;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_group_contacts_view() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_group_contacts_view() IS 'Returns group contacts view with all member details. Uses SECURITY DEFINER to bypass RLS and avoid recursion while filtering by user ownership within the query.';
