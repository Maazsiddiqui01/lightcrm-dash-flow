-- Phase 2: Data Integrity - Add Foreign Key Constraints
-- Add foreign keys to link user references properly

-- Add foreign keys to contacts_raw
ALTER TABLE public.contacts_raw
  ADD CONSTRAINT fk_contacts_assigned_to 
  FOREIGN KEY (assigned_to) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE public.contacts_raw
  ADD CONSTRAINT fk_contacts_created_by 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Add foreign keys to opportunities_raw
ALTER TABLE public.opportunities_raw
  ADD CONSTRAINT fk_opportunities_assigned_to 
  FOREIGN KEY (assigned_to) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE public.opportunities_raw
  ADD CONSTRAINT fk_opportunities_created_by 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Add foreign keys to emails_meetings_raw
ALTER TABLE public.emails_meetings_raw
  ADD CONSTRAINT fk_interactions_assigned_to 
  FOREIGN KEY (assigned_to) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE public.emails_meetings_raw
  ADD CONSTRAINT fk_interactions_created_by 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Add cascade delete to audit logs
ALTER TABLE public.email_settings_audit
  DROP CONSTRAINT IF EXISTS email_settings_audit_changed_by_fkey,
  ADD CONSTRAINT email_settings_audit_changed_by_fkey 
  FOREIGN KEY (changed_by) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.duplicate_merge_log
  DROP CONSTRAINT IF EXISTS duplicate_merge_log_merged_by_fkey,
  ADD CONSTRAINT duplicate_merge_log_merged_by_fkey 
  FOREIGN KEY (merged_by) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;