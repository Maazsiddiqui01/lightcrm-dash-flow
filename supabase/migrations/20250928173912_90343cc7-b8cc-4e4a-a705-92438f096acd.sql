-- Fix the view with proper array handling
CREATE OR REPLACE VIEW v_contact_email_composer AS
WITH fa AS (
  SELECT 
    c.id as contact_id,
    c.full_name, 
    c.first_name, 
    c.email_address as email, 
    c.organization, 
    c.email_cc as lg_emails_cc,
    c.most_recent_contact, 
    c.outreach_date,
    TRIM(fa_item.value) as focus_area,
    lfa.sector_id,
    fad."Description" as description,
    fad."Platform / Add-On" as platform_type,
    fad."LG Sector" as description_sector,
    dir.lead1_name, 
    dir.lead1_email, 
    dir.lead2_name, 
    dir.lead2_email,
    dir.assistant_name, 
    dir.assistant_email
  FROM contacts_raw c
  LEFT JOIN LATERAL unnest(string_to_array(c.lg_focus_areas_comprehensive_list, ',')) AS fa_item(value) ON true
  LEFT JOIN lookup_focus_areas lfa ON lfa.label = TRIM(fa_item.value)
  LEFT JOIN focus_area_description fad ON fad."LG Focus Area" = TRIM(fa_item.value)
  LEFT JOIN lg_focus_area_directory dir ON dir.focus_area = TRIM(fa_item.value)
  WHERE TRIM(fa_item.value) != '' OR fa_item.value IS NULL
),
fa_rollup AS (
  SELECT
    contact_id,
    full_name, 
    first_name, 
    email, 
    organization, 
    lg_emails_cc,
    most_recent_contact, 
    outreach_date,
    array_remove(array_agg(DISTINCT focus_area), null) as focus_areas,
    array_remove(array_agg(DISTINCT sector_id), null) as fa_sectors,
    COALESCE(
      json_agg(
        jsonb_build_object(
          'focus_area', focus_area,
          'platform_type', platform_type,
          'sector', COALESCE(description_sector, sector_id),
          'description', description
        )
      ) FILTER (WHERE focus_area IS NOT NULL),
      '[]'::json
    ) as fa_descriptions,
    array_remove(
      array_agg(DISTINCT lead1_email) || array_agg(DISTINCT lead2_email), 
      null
    ) as lead_emails,
    array_remove(array_agg(DISTINCT assistant_name), null) as assistant_names,
    array_remove(array_agg(DISTINCT assistant_email), null) as assistant_emails
  FROM fa
  GROUP BY contact_id, full_name, first_name, email, organization, lg_emails_cc, most_recent_contact, outreach_date
),
opps_combined AS (
  SELECT 
    full_name,
    json_agg(
      jsonb_build_object(
        'deal_name', deal_name, 
        'ebitda_in_ms', ebitda_in_ms
      ) 
      ORDER BY ebitda_in_ms DESC NULLS LAST
    ) as opps,
    count(*) > 0 as has_opps
  FROM (
    SELECT deal_source_individual_1 as full_name, deal_name, ebitda_in_ms
    FROM opportunities_raw 
    WHERE deal_source_individual_1 IS NOT NULL
    UNION ALL
    SELECT deal_source_individual_2 as full_name, deal_name, ebitda_in_ms  
    FROM opportunities_raw
    WHERE deal_source_individual_2 IS NOT NULL
  ) combined_opps
  GROUP BY full_name
)
SELECT
  r.contact_id,
  r.full_name, 
  r.first_name, 
  r.email, 
  r.organization, 
  r.lg_emails_cc,
  r.focus_areas,
  COALESCE(array_length(r.focus_areas, 1), 0) as fa_count,
  r.fa_sectors,
  r.fa_descriptions,
  EXISTS(
    SELECT 1 FROM unnest(r.focus_areas) f 
    WHERE lower(f) LIKE '%general bd%' OR lower(f) LIKE '%general business development%'
  ) as gb_present,
  EXISTS(
    SELECT 1 FROM unnest(r.focus_areas) f 
    WHERE lower(f) LIKE '%healthcare services%' OR lower(f) LIKE '%hc:%'
  ) as hs_present,
  EXISTS(
    SELECT 1 FROM unnest(r.focus_areas) f 
    WHERE lower(f) LIKE '%life sciences%'
  ) as ls_present,
  COALESCE(op.has_opps, false) as has_opps,
  COALESCE(op.opps, '[]'::json) as opps,
  '[]'::json as articles,
  r.lead_emails,
  r.assistant_names,
  r.assistant_emails,
  r.most_recent_contact, 
  r.outreach_date
FROM fa_rollup r
LEFT JOIN opps_combined op ON op.full_name = r.full_name;