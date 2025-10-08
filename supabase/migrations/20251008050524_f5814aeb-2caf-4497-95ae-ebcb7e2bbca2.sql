-- Add module_order column to contact_email_builder_settings table
ALTER TABLE contact_email_builder_settings 
ADD COLUMN IF NOT EXISTS module_order jsonb DEFAULT NULL;

COMMENT ON COLUMN contact_email_builder_settings.module_order IS 'User-defined order of email modules (array of module keys)';