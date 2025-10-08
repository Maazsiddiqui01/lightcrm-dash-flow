-- Add curated_recipients column to contact_email_builder_settings
ALTER TABLE contact_email_builder_settings 
ADD COLUMN IF NOT EXISTS curated_recipients jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN contact_email_builder_settings.curated_recipients IS 'Stores curated team and recipients: {team: [{id,name,email,role}], to: string, cc: [string]}';
