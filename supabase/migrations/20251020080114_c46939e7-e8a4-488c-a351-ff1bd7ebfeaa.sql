-- Drop and recreate group_contacts_view with missing columns
DROP VIEW IF EXISTS public.group_contacts_view;

CREATE VIEW public.group_contacts_view AS
WITH focus_areas_expanded AS (
  SELECT 
    c.group_contact,
    TRIM(fa.focus_area) AS focus_area
  FROM public.contacts_raw c
  CROSS JOIN LATERAL unnest(string_to_array(c.lg_focus_areas_comprehensive_list, ',')) AS fa(focus_area)
  WHERE c.group_contact IS NOT NULL
)
SELECT 
  c.group_contact AS group_name,
  MAX(c.group_delta) AS max_lag_days,
  MAX(c.most_recent_group_contact) AS most_recent_contact,
  MAX(c.latest_contact_email) AS most_recent_email,
  MAX(c.latest_contact_meeting) AS most_recent_meeting,
  MAX(
    CASE 
      WHEN c.group_delta IS NOT NULL AND c.most_recent_group_contact IS NOT NULL
      THEN (c.most_recent_group_contact + (c.group_delta || ' days')::INTERVAL)::DATE
      ELSE NULL
    END
  ) AS next_outreach_date,
  COUNT(DISTINCT c.id) AS member_count,
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'id', c.id,
      'full_name', c.full_name,
      'email_address', c.email_address,
      'group_email_role', c.group_email_role,
      'most_recent_contact', c.most_recent_contact,
      'title', c.title,
      'organization', c.organization
    )
  ) AS members,
  string_agg(DISTINCT c.full_name, ', ' ORDER BY c.full_name) AS member_names,
  string_agg(
    DISTINCT c.full_name, ', ' ORDER BY c.full_name
  ) FILTER (WHERE c.group_email_role = 'to') AS to_members,
  string_agg(
    DISTINCT c.full_name, ', ' ORDER BY c.full_name
  ) FILTER (WHERE c.group_email_role = 'cc') AS cc_members,
  string_agg(
    DISTINCT c.full_name, ', ' ORDER BY c.full_name
  ) FILTER (WHERE c.group_email_role = 'bcc') AS bcc_members,
  string_agg(
    DISTINCT o.deal_name, ', ' ORDER BY o.deal_name
  ) AS opportunities,
  COUNT(DISTINCT o.id)::INTEGER AS opportunity_count,
  (
    SELECT string_agg(DISTINCT fae.focus_area, ', ')
    FROM focus_areas_expanded fae
    WHERE fae.group_contact = c.group_contact
      AND fae.focus_area IS NOT NULL
      AND fae.focus_area != ''
  ) AS all_focus_areas,
  string_agg(DISTINCT c.lg_sector, ', ') AS all_sectors,
  (array_agg(c.group_focus_area ORDER BY c.updated_at DESC NULLS LAST))[1] AS group_focus_area,
  (array_agg(c.group_sector ORDER BY c.updated_at DESC NULLS LAST))[1] AS group_sector,
  (array_agg(c.group_notes ORDER BY c.updated_at DESC NULLS LAST))[1] AS group_notes,
  MAX(c.updated_at) AS last_updated,
  MIN(c.created_at) AS group_created_at,
  (array_agg(c.assigned_to ORDER BY c.created_at))[1] AS assigned_to,
  (array_agg(c.created_by ORDER BY c.created_at))[1] AS created_by,
  EXTRACT(DAY FROM (NOW() - MAX(c.most_recent_group_contact)))::INTEGER AS days_since_last_contact,
  CASE
    WHEN MAX(c.group_delta) IS NOT NULL AND MAX(c.most_recent_group_contact) IS NOT NULL
    THEN EXTRACT(DAY FROM (NOW() - (MAX(c.most_recent_group_contact) + (MAX(c.group_delta) || ' days')::INTERVAL)))::INTEGER
    ELSE NULL
  END AS days_over_under_max_lag,
  CASE
    WHEN MAX(c.most_recent_group_contact) + (MAX(c.group_delta) || ' days')::INTERVAL < NOW()
    THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  CASE
    WHEN MAX(c.group_delta) IS NOT NULL 
      AND MAX(c.most_recent_group_contact) IS NOT NULL
      AND NOW() > MAX(c.most_recent_group_contact) + (MAX(c.group_delta) || ' days')::INTERVAL
    THEN TRUE
    ELSE FALSE
  END AS is_over_max_lag
FROM public.contacts_raw c
LEFT JOIN public.opportunities_raw o ON (
  c.full_name = o.deal_source_individual_1 
  OR c.full_name = o.deal_source_individual_2
)
WHERE c.group_contact IS NOT NULL
GROUP BY c.group_contact
ORDER BY c.group_contact;