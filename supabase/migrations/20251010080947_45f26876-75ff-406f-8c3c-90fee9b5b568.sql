-- Add module_defaults and subject_default_id columns to contact and template settings

-- Extend contact_email_builder_settings
ALTER TABLE contact_email_builder_settings 
ADD COLUMN IF NOT EXISTS module_defaults jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS subject_default_id text DEFAULT NULL;

COMMENT ON COLUMN contact_email_builder_settings.module_defaults 
IS 'Per-contact default phrase for each module: {"top_opportunities": "phr_123", "initial_greeting": "phr_456"}';

COMMENT ON COLUMN contact_email_builder_settings.subject_default_id 
IS 'Per-contact default/primary subject line ID from subject_library';

-- Extend email_template_settings
ALTER TABLE email_template_settings 
ADD COLUMN IF NOT EXISTS module_defaults jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS subject_default_id text DEFAULT NULL;

COMMENT ON COLUMN email_template_settings.module_defaults 
IS 'Per-template default phrase for each module: {"top_opportunities": "phr_789"}';

COMMENT ON COLUMN email_template_settings.subject_default_id 
IS 'Per-template default/primary subject line ID from subject_library';