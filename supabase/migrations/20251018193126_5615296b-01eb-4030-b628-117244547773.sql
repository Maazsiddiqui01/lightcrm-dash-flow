-- Add proper cascade delete constraints for contact-related tables
-- This ensures that when a contact is deleted, all related data is automatically cleaned up

-- Contact email builder settings
ALTER TABLE contact_email_builder_settings 
  DROP CONSTRAINT IF EXISTS contact_email_builder_settings_contact_id_fkey,
  ADD CONSTRAINT contact_email_builder_settings_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts_raw(id) ON DELETE CASCADE;

-- Contact note events
ALTER TABLE contact_note_events 
  DROP CONSTRAINT IF EXISTS contact_note_events_contact_id_fkey,
  ADD CONSTRAINT contact_note_events_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts_raw(id) ON DELETE CASCADE;

-- Contact phrase preferences
ALTER TABLE contact_phrase_preferences 
  DROP CONSTRAINT IF EXISTS contact_phrase_preferences_contact_id_fkey,
  ADD CONSTRAINT contact_phrase_preferences_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts_raw(id) ON DELETE CASCADE;

-- Contact module defaults
ALTER TABLE contact_module_defaults 
  DROP CONSTRAINT IF EXISTS contact_module_defaults_contact_id_fkey,
  ADD CONSTRAINT contact_module_defaults_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts_raw(id) ON DELETE CASCADE;

-- Contact intentional no outreach events
ALTER TABLE contact_intentional_no_outreach_events 
  DROP CONSTRAINT IF EXISTS contact_intentional_no_outreach_events_contact_id_fkey,
  ADD CONSTRAINT contact_intentional_no_outreach_events_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts_raw(id) ON DELETE CASCADE;