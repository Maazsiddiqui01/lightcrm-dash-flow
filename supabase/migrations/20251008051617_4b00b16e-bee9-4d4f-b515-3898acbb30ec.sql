
-- Add module_selections column to contact_email_builder_settings
ALTER TABLE contact_email_builder_settings 
ADD COLUMN IF NOT EXISTS module_selections jsonb DEFAULT NULL;

COMMENT ON COLUMN contact_email_builder_settings.module_selections 
IS 'User-selected items for each module (articles, phrases, inquiries, etc.)';
