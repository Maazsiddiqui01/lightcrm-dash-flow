-- Fix contacts_ids_by_opportunity_filters to handle date type properly
CREATE OR REPLACE FUNCTION public.contacts_ids_by_opportunity_filters(
  p_tier text[] DEFAULT NULL::text[], 
  p_platform_add_on text[] DEFAULT NULL::text[], 
  p_ownership_type text[] DEFAULT NULL::text[], 
  p_status text[] DEFAULT NULL::text[], 
  p_lg_lead text[] DEFAULT NULL::text[], 
  p_date_start text DEFAULT NULL::text, 
  p_date_end text DEFAULT NULL::text, 
  p_ebitda_min numeric DEFAULT NULL::numeric, 
  p_ebitda_max numeric DEFAULT NULL::numeric
)
RETURNS TABLE(contact_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id as contact_id
  FROM contacts_raw c
  INNER JOIN opportunities_raw o ON (
    c.full_name = o.deal_source_individual_1 
    OR c.full_name = o.deal_source_individual_2
  )
  WHERE 
    (p_tier IS NULL OR o.tier = ANY(p_tier))
    AND (p_platform_add_on IS NULL OR o.platform_add_on = ANY(p_platform_add_on))
    AND (p_ownership_type IS NULL OR o.ownership_type = ANY(p_ownership_type))
    AND (p_status IS NULL OR o.status = ANY(p_status))
    AND (p_lg_lead IS NULL OR 
         o.investment_professional_point_person_1 ILIKE ANY(SELECT '%' || unnest(p_lg_lead) || '%') OR
         o.investment_professional_point_person_2 ILIKE ANY(SELECT '%' || unnest(p_lg_lead) || '%'))
    AND (p_date_start IS NULL OR util_safe_timestamptz(o.date_of_origination)::date >= p_date_start::date)
    AND (p_date_end IS NULL OR util_safe_timestamptz(o.date_of_origination)::date <= p_date_end::date)
    AND (p_ebitda_min IS NULL OR COALESCE(o.ebitda_in_ms, 0) >= p_ebitda_min)
    AND (p_ebitda_max IS NULL OR COALESCE(o.ebitda_in_ms, 0) <= p_ebitda_max)
    AND (
      public.is_admin(auth.uid()) OR 
      c.assigned_to = auth.uid() OR 
      c.created_by = auth.uid()
    );
END;
$function$;