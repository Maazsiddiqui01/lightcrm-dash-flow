-- Fix get_group_contacts_view to work with new many-to-many schema

-- Drop the old function
DROP FUNCTION IF EXISTS public.get_group_contacts_view();

-- Recreate the function to query from the groups table and join with memberships
CREATE OR REPLACE FUNCTION public.get_group_contacts_view()
RETURNS TABLE(
  group_name TEXT,
  max_lag_days INTEGER,
  most_recent_contact TIMESTAMPTZ,
  most_recent_email TIMESTAMPTZ,
  most_recent_meeting TIMESTAMPTZ,
  next_outreach_date DATE,
  member_count BIGINT,
  members JSONB,
  member_names TEXT,
  to_members TEXT,
  cc_members TEXT,
  bcc_members TEXT,
  opportunities TEXT,
  opportunity_count INTEGER,
  all_focus_areas TEXT,
  all_sectors TEXT,
  group_focus_area TEXT,
  group_sector TEXT,
  group_notes TEXT,
  last_updated TIMESTAMPTZ,
  group_created_at TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID,
  days_since_last_contact INTEGER,
  days_over_under_max_lag INTEGER,
  is_overdue BOOLEAN,
  is_over_max_lag BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH group_aggregates AS (
    SELECT 
      g.id AS group_id,
      g.name AS group_name,
      g.max_lag_days,
      g.focus_area AS group_focus_area,
      g.sector AS group_sector,
      g.notes AS group_notes,
      g.created_at AS group_created_at,
      g.updated_at AS last_updated,
      g.assigned_to,
      g.created_by,
      MAX(c.most_recent_contact) AS most_recent_contact,
      MAX(c.latest_contact_email) AS most_recent_email,
      MAX(c.latest_contact_meeting) AS most_recent_meeting,
      COUNT(DISTINCT cgm.contact_id) AS member_count,
      string_agg(DISTINCT c.full_name, ', ' ORDER BY c.full_name) AS member_names,
      string_agg(
        DISTINCT c.full_name, ', ' ORDER BY c.full_name
      ) FILTER (WHERE cgm.email_role = 'to') AS to_members,
      string_agg(
        DISTINCT c.full_name, ', ' ORDER BY c.full_name
      ) FILTER (WHERE cgm.email_role = 'cc') AS cc_members,
      string_agg(
        DISTINCT c.full_name, ', ' ORDER BY c.full_name
      ) FILTER (WHERE cgm.email_role = 'bcc') AS bcc_members,
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', c.id,
          'full_name', c.full_name,
          'email_address', c.email_address,
          'group_email_role', cgm.email_role,
          'most_recent_contact', c.most_recent_contact,
          'title', c.title,
          'organization', c.organization
        )
      ) AS members,
      string_agg(DISTINCT c.lg_sector, ', ') AS all_sectors
    FROM groups g
    LEFT JOIN contact_group_memberships cgm ON cgm.group_id = g.id
    LEFT JOIN contacts_raw c ON c.id = cgm.contact_id
    GROUP BY g.id, g.name, g.max_lag_days, g.focus_area, g.sector, g.notes, 
             g.created_at, g.updated_at, g.assigned_to, g.created_by
  ),
  focus_areas_agg AS (
    SELECT 
      g.id AS group_id,
      string_agg(DISTINCT TRIM(fa.focus_area), ', ') AS all_focus_areas
    FROM groups g
    LEFT JOIN contact_group_memberships cgm ON cgm.group_id = g.id
    LEFT JOIN contacts_raw c ON c.id = cgm.contact_id
    CROSS JOIN LATERAL unnest(string_to_array(c.lg_focus_areas_comprehensive_list, ',')) AS fa(focus_area)
    WHERE TRIM(fa.focus_area) IS NOT NULL AND TRIM(fa.focus_area) != ''
    GROUP BY g.id
  ),
  opportunities_agg AS (
    SELECT 
      g.id AS group_id,
      string_agg(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) AS opportunities,
      COUNT(DISTINCT o.id)::INTEGER AS opportunity_count
    FROM groups g
    LEFT JOIN contact_group_memberships cgm ON cgm.group_id = g.id
    LEFT JOIN contacts_raw c ON c.id = cgm.contact_id
    LEFT JOIN opportunities_raw o ON (
      c.full_name = o.deal_source_individual_1 
      OR c.full_name = o.deal_source_individual_2
    )
    GROUP BY g.id
  )
  SELECT 
    ga.group_name,
    ga.max_lag_days,
    ga.most_recent_contact,
    ga.most_recent_email,
    ga.most_recent_meeting,
    CASE 
      WHEN ga.max_lag_days IS NOT NULL AND ga.most_recent_contact IS NOT NULL
      THEN (ga.most_recent_contact + (ga.max_lag_days || ' days')::INTERVAL)::DATE
      ELSE NULL
    END AS next_outreach_date,
    ga.member_count,
    ga.members,
    ga.member_names,
    ga.to_members,
    ga.cc_members,
    ga.bcc_members,
    COALESCE(oa.opportunities, '') AS opportunities,
    COALESCE(oa.opportunity_count, 0) AS opportunity_count,
    fa.all_focus_areas,
    ga.all_sectors,
    ga.group_focus_area,
    ga.group_sector,
    ga.group_notes,
    ga.last_updated,
    ga.group_created_at,
    ga.assigned_to,
    ga.created_by,
    EXTRACT(DAY FROM (NOW() - ga.most_recent_contact))::INTEGER AS days_since_last_contact,
    CASE
      WHEN ga.max_lag_days IS NOT NULL AND ga.most_recent_contact IS NOT NULL
      THEN EXTRACT(DAY FROM (NOW() - (ga.most_recent_contact + (ga.max_lag_days || ' days')::INTERVAL)))::INTEGER
      ELSE NULL
    END AS days_over_under_max_lag,
    CASE
      WHEN ga.most_recent_contact + (ga.max_lag_days || ' days')::INTERVAL < NOW()
      THEN TRUE
      ELSE FALSE
    END AS is_overdue,
    CASE
      WHEN ga.max_lag_days IS NOT NULL 
        AND ga.most_recent_contact IS NOT NULL
        AND NOW() > ga.most_recent_contact + (ga.max_lag_days || ' days')::INTERVAL
      THEN TRUE
      ELSE FALSE
    END AS is_over_max_lag
  FROM group_aggregates ga
  LEFT JOIN focus_areas_agg fa ON fa.group_id = ga.group_id
  LEFT JOIN opportunities_agg oa ON oa.group_id = ga.group_id
  WHERE (
    is_admin(auth.uid()) OR 
    ga.assigned_to = auth.uid() OR 
    ga.created_by = auth.uid()
  )
  ORDER BY ga.group_name;
$$;