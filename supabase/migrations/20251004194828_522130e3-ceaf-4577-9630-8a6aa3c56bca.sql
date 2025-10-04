-- Phase 1: Database Infrastructure

-- Create schema_change_log table for audit trail
CREATE TABLE IF NOT EXISTS public.schema_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  column_name TEXT,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create column_configurations table for dynamic display names and configs
CREATE TABLE IF NOT EXISTS public.column_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_editable BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(table_name, column_name)
);

-- Create lookup_values table for dropdown options
CREATE TABLE IF NOT EXISTS public.lookup_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL, -- 'contacts', 'opportunities', 'global'
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(scope, field_name, value)
);

-- Create secure execute_admin_sql RPC function (admin-only)
CREATE OR REPLACE FUNCTION public.execute_admin_sql(sql_statement TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_data JSONB;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Execute the SQL statement
  EXECUTE sql_statement;
  
  -- Return success
  RETURN jsonb_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.schema_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schema_change_log
CREATE POLICY "Admins can view schema changes"
  ON public.schema_change_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert schema changes"
  ON public.schema_change_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for column_configurations
CREATE POLICY "Anyone can view column configurations"
  ON public.column_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage column configurations"
  ON public.column_configurations FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for lookup_values
CREATE POLICY "Anyone can view active lookup values"
  ON public.lookup_values FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage lookup values"
  ON public.lookup_values FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Insert initial column configurations for contacts_raw
INSERT INTO public.column_configurations (table_name, column_name, display_name, field_type, is_editable) VALUES
  ('contacts_raw', 'full_name', 'Full Name', 'text', true),
  ('contacts_raw', 'email_address', 'Email Address', 'email', true),
  ('contacts_raw', 'organization', 'Organization', 'text', true),
  ('contacts_raw', 'title', 'Title', 'text', true),
  ('contacts_raw', 'lg_sector', 'LG Sector', 'select', true),
  ('contacts_raw', 'category', 'Category', 'select', true),
  ('contacts_raw', 'contact_type', 'Contact Type', 'select', true),
  ('contacts_raw', 'delta_type', 'Delta Type', 'select', true),
  ('contacts_raw', 'delta', 'Delta (Days)', 'number', true),
  ('contacts_raw', 'notes', 'Notes', 'textarea', true)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Insert initial column configurations for opportunities_raw
INSERT INTO public.column_configurations (table_name, column_name, display_name, field_type, is_editable) VALUES
  ('opportunities_raw', 'deal_name', 'Deal Name', 'text', true),
  ('opportunities_raw', 'sector', 'Sector', 'select', true),
  ('opportunities_raw', 'lg_focus_area', 'LG Focus Area', 'select', true),
  ('opportunities_raw', 'tier', 'Tier', 'select', true),
  ('opportunities_raw', 'status', 'Status', 'select', true),
  ('opportunities_raw', 'platform_add_on', 'Platform/Add-On', 'select', true),
  ('opportunities_raw', 'ownership_type', 'Ownership Type', 'select', true),
  ('opportunities_raw', 'ebitda_in_ms', 'EBITDA (M)', 'number', true)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Insert initial lookup values from existing data
INSERT INTO public.lookup_values (scope, field_name, value, label) 
SELECT DISTINCT 'contacts', 'category', category, category 
FROM contacts_raw WHERE category IS NOT NULL AND category != ''
ON CONFLICT (scope, field_name, value) DO NOTHING;

INSERT INTO public.lookup_values (scope, field_name, value, label)
SELECT DISTINCT 'contacts', 'contact_type', contact_type, contact_type
FROM contacts_raw WHERE contact_type IS NOT NULL AND contact_type != ''
ON CONFLICT (scope, field_name, value) DO NOTHING;

INSERT INTO public.lookup_values (scope, field_name, value, label)
SELECT DISTINCT 'contacts', 'delta_type', delta_type, delta_type
FROM contacts_raw WHERE delta_type IS NOT NULL AND delta_type != ''
ON CONFLICT (scope, field_name, value) DO NOTHING;

INSERT INTO public.lookup_values (scope, field_name, value, label)
SELECT DISTINCT 'opportunities', 'status', status, status
FROM opportunities_raw WHERE status IS NOT NULL AND status != ''
ON CONFLICT (scope, field_name, value) DO NOTHING;

INSERT INTO public.lookup_values (scope, field_name, value, label)
SELECT DISTINCT 'opportunities', 'tier', tier::text, tier::text
FROM opportunities_raw WHERE tier IS NOT NULL
ON CONFLICT (scope, field_name, value) DO NOTHING;

INSERT INTO public.lookup_values (scope, field_name, value, label)
SELECT DISTINCT 'opportunities', 'platform_add_on', platform_add_on, platform_add_on
FROM opportunities_raw WHERE platform_add_on IS NOT NULL AND platform_add_on != ''
ON CONFLICT (scope, field_name, value) DO NOTHING;

INSERT INTO public.lookup_values (scope, field_name, value, label)
SELECT DISTINCT 'opportunities', 'ownership_type', ownership_type, ownership_type
FROM opportunities_raw WHERE ownership_type IS NOT NULL AND ownership_type != ''
ON CONFLICT (scope, field_name, value) DO NOTHING;