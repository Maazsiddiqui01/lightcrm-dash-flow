-- Phase 1: Critical Backend Infrastructure (Fixed)
-- Create necessary tables and functions for Data Maintenance functionality

-- 1. Create lookup_values table for dropdown management
CREATE TABLE IF NOT EXISTS public.lookup_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  field_name text NOT NULL,
  value text NOT NULL,
  label text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(scope, field_name, value)
);

-- Enable RLS on lookup_values
ALTER TABLE public.lookup_values ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view lookup values" ON public.lookup_values;
DROP POLICY IF EXISTS "Admins can manage lookup values" ON public.lookup_values;

-- Create policies
CREATE POLICY "Anyone can view lookup values"
ON public.lookup_values FOR SELECT
USING (true);

CREATE POLICY "Admins can manage lookup values"
ON public.lookup_values FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Create protected_columns table
CREATE TABLE IF NOT EXISTS public.protected_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  column_name text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(table_name, column_name)
);

ALTER TABLE public.protected_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view protected columns" ON public.protected_columns;
DROP POLICY IF EXISTS "Admins can manage protected columns" ON public.protected_columns;

CREATE POLICY "Anyone can view protected columns"
ON public.protected_columns FOR SELECT
USING (true);

CREATE POLICY "Admins can manage protected columns"
ON public.protected_columns FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. Create schema_change_log for audit trail
CREATE TABLE IF NOT EXISTS public.schema_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text NOT NULL,
  column_name text,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.schema_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view schema change logs" ON public.schema_change_log;
DROP POLICY IF EXISTS "Admins can create schema change logs" ON public.schema_change_log;

CREATE POLICY "Admins can view schema change logs"
ON public.schema_change_log FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create schema change logs"
ON public.schema_change_log FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Populate protected_columns
INSERT INTO public.protected_columns (table_name, column_name, reason) VALUES
('contacts_raw', 'id', 'Primary key - system generated'),
('contacts_raw', 'created_at', 'Audit timestamp - system managed'),
('contacts_raw', 'updated_at', 'Audit timestamp - system managed'),
('contacts_raw', 'email_address', 'Core identifier for contacts'),
('contacts_raw', 'created_by', 'Audit field - system managed'),
('contacts_raw', 'assigned_to', 'User assignment field'),
('opportunities_raw', 'id', 'Primary key - system generated'),
('opportunities_raw', 'created_at', 'Audit timestamp - system managed'),
('opportunities_raw', 'updated_at', 'Audit timestamp - system managed'),
('opportunities_raw', 'deal_name', 'Core identifier for opportunities'),
('opportunities_raw', 'created_by', 'Audit field - system managed'),
('opportunities_raw', 'assigned_to', 'User assignment field')
ON CONFLICT (table_name, column_name) DO NOTHING;