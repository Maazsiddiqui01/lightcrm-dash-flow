-- Create view that aggregates opportunities per contact
CREATE OR REPLACE VIEW contacts_with_opportunities_v AS
SELECT 
  c.id,
  c.full_name,
  c.email_address,
  string_agg(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) as opportunities
FROM contacts_raw c
LEFT JOIN opportunities_norm o ON (
  normalize_name(c.full_name) = o.norm_src_1 
  OR normalize_name(c.full_name) = o.norm_src_2
)
GROUP BY c.id, c.full_name, c.email_address;

-- Create RPC function to get contact IDs filtered by opportunity criteria
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
  INNER JOIN opportunities_norm on_norm ON (
    normalize_name(c.full_name) = on_norm.norm_src_1 
    OR normalize_name(c.full_name) = on_norm.norm_src_2
  )
  INNER JOIN opportunities_app oa ON on_norm.deal_name = oa.deal_name
  WHERE 
    (p_tier IS NULL OR oa.tier = ANY(p_tier))
    AND (p_platform_add_on IS NULL OR oa.platform_add_on = ANY(p_platform_add_on))
    AND (p_ownership_type IS NULL OR oa.ownership_type = ANY(p_ownership_type))
    AND (p_status IS NULL OR oa.status = ANY(p_status))
    AND (p_lg_lead IS NULL OR 
         oa.investment_professional_point_person_1 ILIKE ANY(SELECT '%' || unnest(p_lg_lead) || '%') OR
         oa.investment_professional_point_person_2 ILIKE ANY(SELECT '%' || unnest(p_lg_lead) || '%'))
    AND (p_date_start IS NULL OR oa.date_of_origination >= p_date_start::date)
    AND (p_date_end IS NULL OR oa.date_of_origination <= p_date_end::date)
    AND (p_ebitda_min IS NULL OR COALESCE(oa.ebitda_in_ms, 0) >= p_ebitda_min)
    AND (p_ebitda_max IS NULL OR COALESCE(oa.ebitda_in_ms, 0) <= p_ebitda_max);
END;
$$;

-- Create index on normalized full_name for performance on contacts_raw (table)
CREATE INDEX IF NOT EXISTS idx_contacts_raw_norm_full_name 
ON contacts_raw (normalize_name(full_name));