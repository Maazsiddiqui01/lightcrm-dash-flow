-- Update master template defaults to set all modules to 'always'
UPDATE master_template_defaults 
SET default_modules = jsonb_build_object(
  'subject_line', 'always',
  'initial_greeting', 'always',
  'self_personalization', 'always',
  'article_recommendations', 'always',
  'top_opportunities', 'always',
  'platforms', 'always',
  'suggested_talking_points', 'always',
  'addons', 'always',
  'general_org_update', 'always',
  'meeting_request', 'always',
  'closing_line', 'always'
)
WHERE master_key IN ('relationship_maintenance', 'hybrid_neutral', 'business_development');

-- Update existing contact email builder settings to set all modules to 'always'
UPDATE contact_email_builder_settings
SET module_states = jsonb_build_object(
  'subject_line', 'always',
  'initial_greeting', 'always',
  'self_personalization', 'always',
  'article_recommendations', 'always',
  'top_opportunities', 'always',
  'platforms', 'always',
  'suggested_talking_points', 'always',
  'addons', 'always',
  'general_org_update', 'always',
  'meeting_request', 'always',
  'closing_line', 'always'
),
last_updated = NOW()
WHERE module_states::text LIKE '%sometimes%';