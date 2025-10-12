-- Update master_template_defaults to match the canonical configuration
-- All 3 templates should have the same default_modules configuration

UPDATE master_template_defaults
SET default_modules = jsonb_build_object(
  'subject_line', 'always',
  'initial_greeting', 'always',
  'self_personalization', 'always',
  'article_recommendations', 'sometimes',
  'top_opportunities', 'sometimes',
  'platforms', 'always',
  'suggested_talking_points', 'always',
  'addons', 'always',
  'general_org_update', 'always',
  'meeting_request', 'sometimes'
)
WHERE master_key IN ('relationship_maintenance', 'business_development', 'hybrid_neutral');