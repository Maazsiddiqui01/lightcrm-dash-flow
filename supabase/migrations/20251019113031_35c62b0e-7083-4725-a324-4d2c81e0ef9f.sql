-- Create group contacts aggregated view
CREATE OR REPLACE VIEW group_contacts_view 
WITH (security_invoker = true) 
AS
SELECT 
  c.group_contact AS group_name,
  c.group_delta AS max_lag_days,
  c.most_recent_group_contact AS most_recent_contact,
  MAX(c.latest_contact_email) AS most_recent_email,
  MAX(c.latest_contact_meeting) AS most_recent_meeting,
  
  -- Calculate next outreach date using group logic
  CASE 
    WHEN c.most_recent_group_contact IS NOT NULL AND c.group_delta IS NOT NULL 
    THEN (c.most_recent_group_contact + (c.group_delta || ' days')::INTERVAL)::DATE 
    ELSE NULL 
  END AS next_outreach_date,
  
  -- Count members
  COUNT(*) AS member_count,
  
  -- Aggregate members with their roles
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', c.id,
      'full_name', c.full_name,
      'email_address', c.email_address,
      'group_email_role', c.group_email_role,
      'most_recent_contact', c.most_recent_contact,
      'title', c.title,
      'organization', c.organization
    ) ORDER BY c.group_email_role, c.full_name
  ) AS members,
  
  -- Comma-separated member names for quick display
  STRING_AGG(DISTINCT c.full_name, ', ' ORDER BY c.full_name) AS member_names,
  
  -- Aggregate email roles
  STRING_AGG(
    CASE WHEN c.group_email_role = 'to' THEN c.full_name END, 
    ', ' 
    ORDER BY c.full_name
  ) FILTER (WHERE c.group_email_role = 'to') AS to_members,
  
  STRING_AGG(
    CASE WHEN c.group_email_role = 'cc' THEN c.full_name END, 
    ', ' 
    ORDER BY c.full_name
  ) FILTER (WHERE c.group_email_role = 'cc') AS cc_members,
  
  STRING_AGG(
    CASE WHEN c.group_email_role = 'bcc' THEN c.full_name END, 
    ', ' 
    ORDER BY c.full_name
  ) FILTER (WHERE c.group_email_role = 'bcc') AS bcc_members,
  
  -- Aggregate opportunities from all members
  (
    SELECT STRING_AGG(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name)
    FROM opportunities_raw o
    WHERE o.deal_source_individual_1 IN (
      SELECT full_name FROM contacts_raw WHERE contacts_raw.group_contact = c.group_contact
    )
    OR o.deal_source_individual_2 IN (
      SELECT full_name FROM contacts_raw WHERE contacts_raw.group_contact = c.group_contact
    )
  ) AS opportunities,
  
  -- Count of opportunities
  (
    SELECT COUNT(DISTINCT o.id)::INTEGER
    FROM opportunities_raw o
    WHERE o.deal_source_individual_1 IN (
      SELECT full_name FROM contacts_raw WHERE contacts_raw.group_contact = c.group_contact
    )
    OR o.deal_source_individual_2 IN (
      SELECT full_name FROM contacts_raw WHERE contacts_raw.group_contact = c.group_contact
    )
  ) AS opportunity_count,
  
  -- Aggregate focus areas from all members
  STRING_AGG(DISTINCT c.lg_focus_areas_comprehensive_list, ', ') AS all_focus_areas,
  
  -- Aggregate sectors
  STRING_AGG(DISTINCT c.lg_sector, ', ') AS all_sectors,
  
  -- Other useful aggregates
  MAX(c.updated_at) AS last_updated,
  MAX(c.created_at) AS group_created_at,
  
  -- RLS fields - use array aggregation for UUIDs
  (ARRAY_AGG(c.assigned_to ORDER BY c.created_at))[1] AS assigned_to,
  (ARRAY_AGG(c.created_by ORDER BY c.created_at))[1] AS created_by

FROM contacts_raw c
WHERE c.group_contact IS NOT NULL
  AND (
    is_admin(auth.uid()) OR 
    c.assigned_to = auth.uid() OR 
    c.created_by = auth.uid()
  )
GROUP BY c.group_contact, c.group_delta, c.most_recent_group_contact;