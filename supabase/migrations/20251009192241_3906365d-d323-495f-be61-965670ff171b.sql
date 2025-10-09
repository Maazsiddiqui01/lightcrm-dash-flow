-- Add custom_module_labels column to contact_email_builder_settings table
ALTER TABLE contact_email_builder_settings 
ADD COLUMN IF NOT EXISTS custom_module_labels jsonb DEFAULT '{}'::jsonb;