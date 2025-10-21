-- Fix get_all_contacts_view function to remove non-existent column reference
CREATE OR REPLACE FUNCTION public.get_all_contacts_view()
RETURNS TABLE (
  id uuid,
  contact_type text,
  name text,
  max_lag_days integer,
  most_recent_contact timestamp with time zone,
  next_outreach_date date,
  days_since_last_contact integer,
  days_over_under_max_lag integer,
  is_overdue boolean,
  focus_area text,
  sector text,
  opportunities text,
  opportunity_count integer,
  organization text,
  title text,
  member_count integer,
  member_names text,
  assigned_to uuid,
  created_by uuid
)
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Part 1: Individual contacts
  SELECT 
    c.id,
    'individual'::text as contact_type,
    c.full_name as name,
    c.delta as max_lag_days,
    c.most_recent_contact,
    CASE WHEN c.most_recent_contact IS NOT NULL AND c.delta IS NOT NULL
      THEN (c.most_recent_contact + (c.delta || ' days')::interval)::date
      ELSE NULL
    END as next_outreach_date,
    CASE WHEN c.most_recent_contact IS NOT NULL
      THEN EXTRACT(DAY FROM (NOW() - c.most_recent_contact))::integer
      ELSE NULL
    END as days_since_last_contact,
    CASE WHEN c.most_recent_contact IS NOT NULL AND c.delta IS NOT NULL
      THEN EXTRACT(DAY FROM ((c.most_recent_contact + (c.delta || ' days')::interval) - NOW()))::integer
      ELSE NULL
    END as days_over_under_max_lag,
    CASE WHEN c.most_recent_contact IS NOT NULL AND c.delta IS NOT NULL
      THEN (c.most_recent_contact + (c.delta || ' days')::interval) < NOW()
      ELSE false
    END as is_overdue,
    c.lg_focus_areas_comprehensive_list as focus_area,
    c.lg_sector as sector,
    (SELECT STRING_AGG(DISTINCT o.deal_name, ', ')
     FROM opportunities_raw o 
     WHERE c.full_name IN (o.deal_source_individual_1, o.deal_source_individual_2)) as opportunities,
    (SELECT COUNT(DISTINCT o.id)::integer
     FROM opportunities_raw o 
     WHERE c.full_name IN (o.deal_source_individual_1, o.deal_source_individual_2)) as opportunity_count,
    c.organization,
    c.title,
    NULL::integer as member_count,
    NULL::text as member_names,
    c.assigned_to,
    c.created_by
  FROM contacts_raw c
  WHERE c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid())

  UNION ALL

  -- Part 2: Group contacts
  SELECT 
    g.group_id as id,
    'group'::text as contact_type,
    g.group_name as name,
    g.max_lag_days,
    g.most_recent_contact,
    g.next_outreach_date,
    g.days_since_last_contact,
    g.days_over_under_max_lag,
    g.is_overdue,
    g.group_focus_area as focus_area,
    g.group_sector as sector,
    g.opportunities,
    g.opportunity_count,
    NULL::text as organization,
    NULL::text as title,
    g.member_count::integer,
    g.member_names,
    g.assigned_to,
    g.created_by
  FROM get_group_contacts_view() g

  ORDER BY name;
END;
$$;