-- Create a function to query the group contacts view
CREATE OR REPLACE FUNCTION get_group_contacts_view()
RETURNS TABLE (
  group_name text,
  max_lag_days integer,
  most_recent_contact timestamp with time zone,
  most_recent_email timestamp with time zone,
  most_recent_meeting timestamp with time zone,
  next_outreach_date date,
  member_count bigint,
  members jsonb,
  member_names text,
  to_members text,
  cc_members text,
  bcc_members text,
  opportunities text,
  opportunity_count integer,
  all_focus_areas text,
  all_sectors text,
  last_updated timestamp with time zone,
  group_created_at timestamp with time zone,
  assigned_to uuid,
  created_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM group_contacts_view ORDER BY group_name;
$$;