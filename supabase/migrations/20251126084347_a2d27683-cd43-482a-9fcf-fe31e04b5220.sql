-- Create helper function to detect columns missing from views
-- This function compares base tables with their dependent views
-- and returns any columns that exist in the base but are missing from views

CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  columns text[];
BEGIN
  SELECT array_agg(column_name::text ORDER BY ordinal_position)
  INTO columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name;
  
  RETURN COALESCE(columns, ARRAY[]::text[]);
END;
$$;

-- Function to validate view columns against base tables
CREATE OR REPLACE FUNCTION public.validate_view_columns()
RETURNS TABLE(
  view_name text,
  missing_column text,
  base_table text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_cols text[];
  view_cols text[];
  col text;
BEGIN
  -- Check opportunities_raw -> opportunities_with_display_fields
  base_cols := public.get_table_columns('opportunities_raw');
  view_cols := public.get_table_columns('opportunities_with_display_fields');
  
  FOREACH col IN ARRAY base_cols
  LOOP
    -- Skip computed display fields that don't exist in base table
    IF col NOT IN ('next_steps_display', 'notes_display', 'next_steps_due_date_display') THEN
      IF NOT (col = ANY(view_cols)) THEN
        view_name := 'opportunities_with_display_fields';
        missing_column := col;
        base_table := 'opportunities_raw';
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  -- Check contacts_raw -> contacts_app
  base_cols := public.get_table_columns('contacts_raw');
  view_cols := public.get_table_columns('contacts_app');
  
  FOREACH col IN ARRAY base_cols
  LOOP
    IF col NOT IN ('notes_display', 'next_steps_display') THEN
      IF NOT (col = ANY(view_cols)) THEN
        view_name := 'contacts_app';
        missing_column := col;
        base_table := 'contacts_raw';
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  -- Check contacts_raw -> contacts_norm
  view_cols := public.get_table_columns('contacts_norm');
  
  FOREACH col IN ARRAY base_cols
  LOOP
    IF col NOT IN ('notes_display', 'next_steps_display') THEN
      IF NOT (col = ANY(view_cols)) THEN
        view_name := 'contacts_norm';
        missing_column := col;
        base_table := 'contacts_raw';
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.get_table_columns IS 
'Returns array of column names for a given table in the public schema';

COMMENT ON FUNCTION public.validate_view_columns IS 
'Validates that dependent views contain all columns from their base tables. Returns missing columns.';