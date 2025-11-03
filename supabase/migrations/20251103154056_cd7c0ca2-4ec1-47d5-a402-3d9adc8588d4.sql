-- Insert default settings for all templates missing settings
INSERT INTO email_template_settings (
  template_id,
  module_states,
  tone_override,
  length_override,
  subject_pool_override,
  module_order,
  personalization_config,
  inquiry_config,
  quality_rules,
  revision,
  updated_by
)
SELECT 
  et.id,
  '{"ps": "always", "addons": "always", "platforms": "always", "attachments": "always", "top_opportunities": "always", "general_org_update": "always", "article_recommendations": "always", "suggested_talking_points": "always"}'::jsonb,
  NULL,
  NULL,
  NULL,
  NULL,
  '{"sources": {"twitter": "always", "ai_notes": "always", "linkedin": "always", "ai_backup": "always", "user_notes": "always", "self_personalization": "always"}, "self_topics": []}'::jsonb,
  '{"priority": ["opportunity", "article", "focus_area", "generic"], "max_inquiries": 2, "min_inquiries": 1}'::jsonb,
  '{"skip_if_no_opps": false, "ebitda_threshold": 30, "skip_if_no_articles": false, "min_personalization_score": 0}'::jsonb,
  1,
  auth.uid()
FROM email_templates et
WHERE NOT EXISTS (
  SELECT 1 FROM email_template_settings ets WHERE ets.template_id = et.id
);