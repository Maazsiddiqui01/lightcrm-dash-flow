-- Update group_contacts_view to use first_name instead of full_name for member displays
DROP VIEW IF EXISTS group_contacts_view;

CREATE VIEW group_contacts_view 
WITH (security_invoker = true) 
AS
SELECT 
  c.group_contact AS group_name,
  c.group_delta AS max_lag_days,
  MAX(c.most_recent_group_contact) AS most_recent_contact,
  MAX(c.latest_contact_email) AS most_recent_email,
  MAX(c.latest_contact_meeting) AS most_recent_meeting,
  CASE 
    WHEN c.group_delta IS NOT NULL AND MAX(c.most_recent_group_contact) IS NOT NULL 
    THEN (MAX(c.most_recent_group_contact)::date + c.group_delta * INTERVAL '1 day')::date
    ELSE NULL
  END AS next_outreach_date,
  COUNT(c.id) AS member_count,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id', c.id,
      'full_name', c.full_name,
      'first_name', c.first_name,
      'email_address', c.email_address,
      'title', c.title,
      'organization', c.organization,
      'group_email_role', c.group_email_role,
      'most_recent_contact', c.most_recent_contact
    ) ORDER BY c.full_name
  ) AS members,
  -- Use first_name for comma-separated display
  STRING_AGG(DISTINCT c.first_name, ', ' ORDER BY c.first_name) AS member_names,
  -- Email role aggregations using first_name
  STRING_AGG(
    CASE WHEN c.group_email_role = 'to' THEN c.first_name END, 
    ', ' 
    ORDER BY c.first_name
  ) FILTER (WHERE c.group_email_role = 'to') AS to_members,
  STRING_AGG(
    CASE WHEN c.group_email_role = 'cc' THEN c.first_name END, 
    ', ' 
    ORDER BY c.first_name
  ) FILTER (WHERE c.group_email_role = 'cc') AS cc_members,
  STRING_AGG(
    CASE WHEN c.group_email_role = 'bcc' THEN c.first_name END, 
    ', ' 
    ORDER BY c.first_name
  ) FILTER (WHERE c.group_email_role = 'bcc') AS bcc_members,
  -- Aggregate opportunities
  (
    SELECT STRING_AGG(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name)
    FROM opportunities_raw o
    WHERE o.deal_source_individual_1 = ANY(ARRAY_AGG(c.full_name))
       OR o.deal_source_individual_2 = ANY(ARRAY_AGG(c.full_name))
  ) AS opportunities,
  (
    SELECT COUNT(DISTINCT o.id)::int
    FROM opportunities_raw o
    WHERE o.deal_source_individual_1 = ANY(ARRAY_AGG(c.full_name))
       OR o.deal_source_individual_2 = ANY(ARRAY_AGG(c.full_name))
  ) AS opportunity_count,
  STRING_AGG(DISTINCT c.lg_focus_areas_comprehensive_list, ', ') AS all_focus_areas,
  STRING_AGG(DISTINCT c.lg_sector, ', ') AS all_sectors,
  MAX(c.updated_at) AS last_updated,
  MIN(c.created_at) AS group_created_at,
  (ARRAY_AGG(c.assigned_to))[1] AS assigned_to,
  (ARRAY_AGG(c.created_by))[1] AS created_by
FROM contacts_raw c
WHERE c.group_contact IS NOT NULL
GROUP BY c.group_contact, c.group_delta;