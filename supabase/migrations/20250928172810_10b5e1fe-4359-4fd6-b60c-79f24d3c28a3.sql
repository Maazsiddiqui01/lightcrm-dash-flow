-- Create consolidated email composer view
CREATE OR REPLACE VIEW v_contact_email_composer AS
WITH contact_focus_areas AS (
  -- Parse and deduplicate focus areas from the comprehensive list
  SELECT 
    c.id as contact_id,
    c.full_name,
    c.first_name,
    c.email_address as email,
    c.organization,
    c.most_recent_contact,
    c.outreach_date,
    c.email_cc as lg_emails_cc,
    c.all_opps,
    -- Parse focus areas into array, removing empty strings
    array_remove(
      string_to_array(
        regexp_replace(coalesce(c.lg_focus_areas_comprehensive_list, ''), '\s*,\s*', ',', 'g'), 
        ','
      ), 
      ''
    ) as focus_areas_array
  FROM contacts_raw c
),
fa_with_metadata AS (
  -- Get focus area descriptions and sector mappings
  SELECT 
    cfa.contact_id,
    cfa.full_name,
    cfa.first_name, 
    cfa.email,
    cfa.organization,
    cfa.most_recent_contact,
    cfa.outreach_date,
    cfa.lg_emails_cc,
    cfa.all_opps,
    cfa.focus_areas_array,
    -- Aggregate focus area descriptions
    array_agg(DISTINCT jsonb_build_object(
      'focus_area', fa.focus_area,
      'platform_type', fad."Platform / Add-On",
      'sector', fad."LG Sector", 
      'description', fad."Description"
    )) FILTER (WHERE fa.focus_area IS NOT NULL) as fa_descriptions,
    -- Aggregate sector IDs
    array_agg(DISTINCT lfa.sector_id) FILTER (WHERE lfa.sector_id IS NOT NULL) as fa_sectors,
    -- Check for specific focus area patterns
    bool_or(fa.focus_area ILIKE '%healthcare%' OR fa.focus_area ILIKE '%hc:%') as hs_present,
    bool_or(fa.focus_area ILIKE '%life sciences%' OR fa.focus_area ILIKE '%ls:%') as ls_present,
    bool_or(fa.focus_area ILIKE '%general bd%' OR fa.focus_area ILIKE '%business development%') as gb_present,
    array_length(array_remove(cfa.focus_areas_array, ''), 1) as fa_count
  FROM contact_focus_areas cfa
  LEFT JOIN unnest(cfa.focus_areas_array) as fa(focus_area) ON fa.focus_area != ''
  LEFT JOIN focus_area_description fad ON fad."LG Focus Area" = fa.focus_area
  LEFT JOIN lookup_focus_areas lfa ON lfa.label = fa.focus_area
  GROUP BY 
    cfa.contact_id, cfa.full_name, cfa.first_name, cfa.email, cfa.organization,
    cfa.most_recent_contact, cfa.outreach_date, cfa.lg_emails_cc, cfa.all_opps,
    cfa.focus_areas_array
),
fa_with_leads AS (
  -- Get lead and assistant information
  SELECT 
    fwm.*,
    -- Get unique lead emails
    array_remove(array_agg(DISTINCT dir.lead1_email) || array_agg(DISTINCT dir.lead2_email), NULL) as lead_emails,
    -- Get unique assistant names and emails  
    array_agg(DISTINCT dir.assistant_name) FILTER (WHERE dir.assistant_name IS NOT NULL) as assistant_names,
    array_agg(DISTINCT dir.assistant_email) FILTER (WHERE dir.assistant_email IS NOT NULL) as assistant_emails
  FROM fa_with_metadata fwm
  LEFT JOIN unnest(fwm.focus_areas_array) as fa(focus_area) ON fa.focus_area != ''
  LEFT JOIN lg_focus_area_directory dir ON dir.focus_area = fa.focus_area
  GROUP BY 
    fwm.contact_id, fwm.full_name, fwm.first_name, fwm.email, fwm.organization,
    fwm.most_recent_contact, fwm.outreach_date, fwm.lg_emails_cc, fwm.all_opps,
    fwm.focus_areas_array, fwm.fa_descriptions, fwm.fa_sectors, 
    fwm.hs_present, fwm.ls_present, fwm.gb_present, fwm.fa_count
),
contact_opportunities AS (
  -- Get opportunities for each contact
  SELECT 
    fwl.*,
    -- Get opportunities as JSON array sorted by EBITDA
    coalesce(
      array_agg(
        jsonb_build_object(
          'deal_name', o.deal_name,
          'ebitda_in_ms', o.ebitda_in_ms
        ) 
        ORDER BY o.ebitda_in_ms DESC NULLS LAST
      ) FILTER (WHERE o.deal_name IS NOT NULL),
      '{}'::jsonb[]
    ) as opps,
    -- Boolean indicating if contact has opportunities
    coalesce(fwl.all_opps > 0, false) OR count(o.id) > 0 as has_opps
  FROM fa_with_leads fwl  
  LEFT JOIN opportunities_raw o ON (
    o.deal_source_individual_1 = fwl.full_name OR 
    o.deal_source_individual_2 = fwl.full_name
  )
  GROUP BY 
    fwl.contact_id, fwl.full_name, fwl.first_name, fwl.email, fwl.organization,
    fwl.most_recent_contact, fwl.outreach_date, fwl.lg_emails_cc, fwl.all_opps,
    fwl.focus_areas_array, fwl.fa_descriptions, fwl.fa_sectors,
    fwl.hs_present, fwl.ls_present, fwl.gb_present, fwl.fa_count,
    fwl.lead_emails, fwl.assistant_names, fwl.assistant_emails
)
SELECT 
  co.contact_id,
  co.full_name,
  co.first_name,
  co.email,
  co.organization,
  -- Clean up focus areas array, removing nulls and empty strings
  array_remove(co.focus_areas_array, '') as focus_areas,
  coalesce(co.fa_descriptions, '{}'::jsonb[]) as fa_descriptions,
  coalesce(co.fa_sectors, '{}'::text[]) as fa_sectors,
  coalesce(co.hs_present, false) as hs_present,
  coalesce(co.ls_present, false) as ls_present, 
  coalesce(co.gb_present, false) as gb_present,
  coalesce(co.fa_count, 0) as fa_count,
  coalesce(co.lead_emails, '{}'::text[]) as lead_emails,
  coalesce(co.assistant_names, '{}'::text[]) as assistant_names,
  coalesce(co.assistant_emails, '{}'::text[]) as assistant_emails,
  coalesce(co.lg_emails_cc, '') as lg_emails_cc,
  co.opps,
  co.has_opps,
  -- Get articles for the contact's focus areas
  coalesce(
    (
      SELECT array_agg(
        jsonb_build_object(
          'focus_area', a.focus_area,
          'article_link', a.article_link,
          'last_date_to_use', a.last_date_to_use
        )
      )
      FROM articles a
      WHERE a.focus_area = ANY(co.focus_areas_array)
        AND (a.last_date_to_use IS NULL OR a.last_date_to_use >= current_date)
    ),
    '{}'::jsonb[]
  ) as articles,
  co.most_recent_contact,
  co.outreach_date
FROM contact_opportunities co;