-- Remove ai_backup_personalization and attachments from all module-related columns
-- Clean up master_template_defaults
UPDATE master_template_defaults
SET default_modules = (default_modules::jsonb - 'ai_backup_personalization' - 'attachments')::json
WHERE default_modules IS NOT NULL;

-- Clean up email_template_settings
UPDATE email_template_settings
SET module_states = (module_states::jsonb - 'ai_backup_personalization' - 'attachments')::json
WHERE module_states IS NOT NULL;

UPDATE email_template_settings
SET module_order = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements_text(module_order::jsonb) elem
  WHERE elem NOT IN ('ai_backup_personalization', 'attachments')
)
WHERE module_order IS NOT NULL;

-- Clean up contact_email_builder_settings
UPDATE contact_email_builder_settings
SET module_states = (module_states::jsonb - 'ai_backup_personalization' - 'attachments')::json
WHERE module_states IS NOT NULL;

UPDATE contact_email_builder_settings
SET module_order = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements_text(module_order::jsonb) elem
  WHERE elem NOT IN ('ai_backup_personalization', 'attachments')
)
WHERE module_order IS NOT NULL;