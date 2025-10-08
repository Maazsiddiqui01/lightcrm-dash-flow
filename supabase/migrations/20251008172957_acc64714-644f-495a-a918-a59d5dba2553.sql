-- Add missing fields to email_template_settings for global defaults tracking
ALTER TABLE email_template_settings 
ADD COLUMN IF NOT EXISTS module_order jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS revision integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add template reference and revision to contact settings
ALTER TABLE contact_email_builder_settings 
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES email_templates(id),
ADD COLUMN IF NOT EXISTS revision integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Create audit trail table for tracking all changes
CREATE TABLE IF NOT EXISTS email_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('contact', 'global')),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('contact', 'template')),
  changes_before jsonb,
  changes_after jsonb NOT NULL,
  revision_before integer,
  revision_after integer,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

-- Indexes for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_audit_entity ON email_settings_audit(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON email_settings_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON email_settings_audit(changed_by);

-- RLS policies for audit table
ALTER TABLE email_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit entries"
  ON email_settings_audit FOR SELECT
  USING (changed_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert audit entries"
  ON email_settings_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger to auto-update updated_at on email_template_settings
CREATE OR REPLACE FUNCTION update_email_template_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER email_template_settings_updated_at
  BEFORE UPDATE ON email_template_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_settings_timestamp();

-- Trigger to auto-update updated_by on contact_email_builder_settings
CREATE OR REPLACE FUNCTION update_contact_settings_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER contact_settings_updated_by
  BEFORE INSERT OR UPDATE ON contact_email_builder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_settings_user();