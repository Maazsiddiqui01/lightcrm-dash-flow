-- Add closing_line to master template defaults
UPDATE master_template_defaults
SET default_modules = jsonb_set(
  default_modules::jsonb,
  '{closing_line}',
  '"sometimes"'::jsonb
)
WHERE master_key IN ('relationship_maintenance', 'business_development', 'hybrid_neutral')
AND NOT (default_modules::jsonb ? 'closing_line');

-- Add closing_line to module_order in existing contact settings
UPDATE contact_email_builder_settings
SET module_order = (
  SELECT jsonb_agg(elem ORDER BY 
    CASE elem
      WHEN 'subject_line' THEN 1
      WHEN 'initial_greeting' THEN 2
      WHEN 'self_personalization' THEN 3
      WHEN 'article_recommendations' THEN 4
      WHEN 'top_opportunities' THEN 5
      WHEN 'platforms' THEN 6
      WHEN 'suggested_talking_points' THEN 7
      WHEN 'addons' THEN 8
      WHEN 'general_org_update' THEN 9
      WHEN 'meeting_request' THEN 10
      WHEN 'closing_line' THEN 11
    END
  )
  FROM (
    SELECT elem FROM jsonb_array_elements_text(module_order::jsonb) elem
    UNION ALL
    SELECT 'closing_line'
  ) sub
  WHERE elem IN (
    'subject_line', 'initial_greeting', 'self_personalization',
    'article_recommendations', 'top_opportunities', 'platforms',
    'suggested_talking_points', 'addons', 'general_org_update',
    'meeting_request', 'closing_line'
  )
)
WHERE module_order IS NOT NULL
AND NOT (module_order::jsonb @> '["closing_line"]'::jsonb);

-- Add closing_line: 'sometimes' to module_states if missing
UPDATE contact_email_builder_settings
SET module_states = jsonb_set(
  COALESCE(module_states::jsonb, '{}'::jsonb),
  '{closing_line}',
  '"sometimes"'::jsonb
)
WHERE module_states IS NOT NULL
AND NOT (module_states::jsonb ? 'closing_line');