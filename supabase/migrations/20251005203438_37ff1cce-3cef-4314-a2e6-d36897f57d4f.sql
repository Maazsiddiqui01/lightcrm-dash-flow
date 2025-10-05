-- Create RPC to get contact IDs by focus areas using exact token matching
CREATE OR REPLACE FUNCTION public.contacts_ids_by_focus_areas(p_focus_areas text[])
RETURNS TABLE(contact_id uuid)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id as contact_id
  FROM public.contacts_raw c
  CROSS JOIN LATERAL regexp_split_to_table(
    COALESCE(c.lg_focus_areas_comprehensive_list, ''),
    '\s*,\s*'
  ) AS fa(token)
  WHERE fa.token <> ''
    AND fa.token = ANY(p_focus_areas);
END;
$$;