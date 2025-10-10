-- Drop foreign key constraint on template_id
ALTER TABLE contact_email_builder_settings 
DROP CONSTRAINT IF EXISTS contact_email_builder_settings_template_id_fkey;

-- Make template_id nullable (for backward compatibility)
ALTER TABLE contact_email_builder_settings 
ALTER COLUMN template_id DROP NOT NULL;

-- Add comment explaining deprecation
COMMENT ON COLUMN contact_email_builder_settings.template_id IS 
'Deprecated: Originally referenced email_templates(id) for case-based templates. Contact settings now use master templates instead. Kept NULL for backward compatibility.';