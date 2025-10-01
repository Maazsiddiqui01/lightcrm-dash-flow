-- Drop the incorrect view
DROP VIEW IF EXISTS contacts_with_opportunities_v;

-- Create corrected view matching full_name to deal source individuals
CREATE VIEW contacts_with_opportunities_v AS
SELECT 
  c.id,
  c.full_name,
  c.email_address,
  string_agg(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) as opportunities
FROM contacts_raw c
LEFT JOIN opportunities_app o ON (
  c.full_name = o.deal_source_individual_1 
  OR c.full_name = o.deal_source_individual_2
)
WHERE o.deal_name IS NOT NULL OR c.id IS NOT NULL
GROUP BY c.id, c.full_name, c.email_address;

-- Update RPC to use the correct join as well
CREATE OR REPLACE FUNCTION contacts_ids_by_opportunity_filters(
  p_tier text[] DEFAULT NULL,
  p_platform_add_on text[] DEFAULT NULL,
  p_ownership_type text[] DEFAULT NULL,
  p_status text[] DEFAULT NULL,
  p_lg_lead text[] DEFAULT NULL,
  p_date_start text DEFAULT NULL,
  p_date_end text DEFAULT NULL,
  p_ebitda_min numeric DEFAULT NULL,
  p_ebitda_max numeric DEFAULT NULL
)
RETURNS TABLE(contact_id uuid)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id as contact_id
  FROM contacts_raw c
  INNER JOIN opportunities_app o ON (
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
    AND (p_date_start IS NULL OR o.date_of_origination >= p_date_start::date)
    AND (p_date_end IS NULL OR o.date_of_origination <= p_date_end::date)
    AND (p_ebitda_min IS NULL OR COALESCE(o.ebitda_in_ms, 0) >= p_ebitda_min)
    AND (p_ebitda_max IS NULL OR COALESCE(o.ebitda_in_ms, 0) <= p_ebitda_max);
END;
$$;