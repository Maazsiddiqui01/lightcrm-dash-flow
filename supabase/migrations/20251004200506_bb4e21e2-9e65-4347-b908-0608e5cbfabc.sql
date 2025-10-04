-- Add RPC function for text replacement in columns (needed for normalization)
CREATE OR REPLACE FUNCTION public.replace_text_in_column(
  p_table text,
  p_column text,
  p_old_text text,
  p_new_text text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_sql text;
BEGIN
  -- Validate admin access
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Build and execute dynamic UPDATE statement
  v_sql := format(
    'UPDATE %I SET %I = replace(%I, %L, %L) WHERE %I LIKE %L',
    p_table, p_column, p_column, p_old_text, p_new_text, p_column, '%' || p_old_text || '%'
  );
  
  EXECUTE v_sql;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

-- Add table for tracking duplicate merges
CREATE TABLE IF NOT EXISTS public.duplicate_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('contacts', 'opportunities')),
  primary_record_id uuid NOT NULL,
  merged_record_ids uuid[] NOT NULL,
  merged_at timestamp with time zone NOT NULL DEFAULT now(),
  merged_by uuid REFERENCES auth.users(id),
  merge_reason text,
  data_preserved jsonb
);

-- Enable RLS
ALTER TABLE public.duplicate_merge_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all merge logs
CREATE POLICY "Admins view merge logs" ON public.duplicate_merge_log
  FOR SELECT USING (public.is_admin(auth.uid()));

-- System can create merge logs
CREATE POLICY "System creates merge logs" ON public.duplicate_merge_log
  FOR INSERT WITH CHECK (true);

-- Add critical columns protection list
CREATE TABLE IF NOT EXISTS public.protected_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  column_name text NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(table_name, column_name)
);

-- Add protected columns for contacts_raw
INSERT INTO public.protected_columns (table_name, column_name, reason) VALUES
  ('contacts_raw', 'id', 'Primary key - system critical'),
  ('contacts_raw', 'email_address', 'Core identifier for contacts'),
  ('contacts_raw', 'created_at', 'Audit trail - system critical'),
  ('contacts_raw', 'updated_at', 'Audit trail - system critical'),
  ('contacts_raw', 'created_by', 'Ownership tracking - system critical'),
  ('contacts_raw', 'assigned_to', 'Assignment tracking - system critical')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Add protected columns for opportunities_raw
INSERT INTO public.protected_columns (table_name, column_name, reason) VALUES
  ('opportunities_raw', 'id', 'Primary key - system critical'),
  ('opportunities_raw', 'deal_name', 'Core identifier for opportunities'),
  ('opportunities_raw', 'created_at', 'Audit trail - system critical'),
  ('opportunities_raw', 'updated_at', 'Audit trail - system critical'),
  ('opportunities_raw', 'created_by', 'Ownership tracking - system critical'),
  ('opportunities_raw', 'assigned_to', 'Assignment tracking - system critical')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.protected_columns ENABLE ROW LEVEL SECURITY;

-- Anyone can view protected columns
CREATE POLICY "Anyone views protected columns" ON public.protected_columns
  FOR SELECT USING (true);

-- Function to check if column is protected
CREATE OR REPLACE FUNCTION public.is_column_protected(
  p_table text,
  p_column text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.protected_columns
    WHERE table_name = p_table AND column_name = p_column
  );
$$;