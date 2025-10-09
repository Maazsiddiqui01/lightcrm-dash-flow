-- Phase 4: Populate Initial Column Configurations
-- Populate column_configurations with existing table structures

-- Insert contacts_raw columns
INSERT INTO public.column_configurations (table_name, column_name, field_type, display_name, is_editable, is_required)
SELECT 
  'contacts_raw' as table_name,
  column_name,
  CASE 
    WHEN data_type IN ('character varying', 'text') THEN 'text'
    WHEN data_type = 'uuid' THEN 'uuid'
    WHEN data_type IN ('integer', 'bigint', 'smallint') THEN 'integer'
    WHEN data_type = 'numeric' THEN 'number'
    WHEN data_type = 'boolean' THEN 'boolean'
    WHEN data_type = 'timestamp with time zone' THEN 'datetime'
    WHEN data_type = 'date' THEN 'date'
    ELSE 'text'
  END as field_type,
  -- Convert snake_case to Title Case for display
  initcap(replace(column_name, '_', ' ')) as display_name,
  -- System columns are not editable
  CASE 
    WHEN column_name IN ('id', 'created_at', 'updated_at', 'created_by', 'assigned_to', 
                          'locked_by', 'locked_until', 'most_recent_contact', 'latest_contact_email',
                          'latest_contact_meeting', 'outreach_date', 'of_emails', 'of_meetings',
                          'total_of_contacts', 'days_since_last_email', 'days_since_last_meeting',
                          'most_recent_group_contact', 'all_emails', 'email_from', 'email_to',
                          'email_cc', 'meeting_from', 'meeting_to', 'meeting_cc', 'email_subject',
                          'meeting_title', 'no_of_lg_focus_areas', 'all_opps', 'no_of_opps_sourced',
                          'lg_lead', 'lg_assistant') 
    THEN false
    ELSE true
  END as is_editable,
  -- Required fields
  CASE 
    WHEN is_nullable = 'NO' THEN true
    WHEN column_name = 'email_address' THEN true
    ELSE false
  END as is_required
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts_raw'
ON CONFLICT (table_name, column_name) DO UPDATE SET
  field_type = EXCLUDED.field_type,
  display_name = COALESCE(column_configurations.display_name, EXCLUDED.display_name),
  is_editable = EXCLUDED.is_editable,
  is_required = EXCLUDED.is_required,
  updated_at = now();

-- Insert opportunities_raw columns
INSERT INTO public.column_configurations (table_name, column_name, field_type, display_name, is_editable, is_required)
SELECT 
  'opportunities_raw' as table_name,
  column_name,
  CASE 
    WHEN data_type IN ('character varying', 'text') THEN 'text'
    WHEN data_type = 'uuid' THEN 'uuid'
    WHEN data_type IN ('integer', 'bigint', 'smallint') THEN 'integer'
    WHEN data_type = 'numeric' THEN 'number'
    WHEN data_type = 'boolean' THEN 'boolean'
    WHEN data_type = 'timestamp with time zone' THEN 'datetime'
    WHEN data_type = 'date' THEN 'date'
    ELSE 'text'
  END as field_type,
  initcap(replace(column_name, '_', ' ')) as display_name,
  -- System columns are not editable
  CASE 
    WHEN column_name IN ('id', 'created_at', 'updated_at', 'last_modified', 
                          'created_by', 'assigned_to') 
    THEN false
    ELSE true
  END as is_editable,
  -- Required fields
  CASE 
    WHEN is_nullable = 'NO' THEN true
    WHEN column_name = 'deal_name' THEN true
    ELSE false
  END as is_required
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'opportunities_raw'
ON CONFLICT (table_name, column_name) DO UPDATE SET
  field_type = EXCLUDED.field_type,
  display_name = COALESCE(column_configurations.display_name, EXCLUDED.display_name),
  is_editable = EXCLUDED.is_editable,
  is_required = EXCLUDED.is_required,
  updated_at = now();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_column_configurations_table 
ON public.column_configurations(table_name, column_name);