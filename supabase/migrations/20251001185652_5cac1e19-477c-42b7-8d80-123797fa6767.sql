-- Create table for storing per-contact email builder settings
CREATE TABLE IF NOT EXISTS public.contact_email_builder_settings (
  contact_id UUID PRIMARY KEY REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  module_states JSONB NOT NULL DEFAULT '{}',
  delta_type TEXT DEFAULT 'Email',
  selected_article_id UUID,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contact_email_builder_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write settings
CREATE POLICY "contact_settings_read" ON public.contact_email_builder_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contact_settings_write" ON public.contact_email_builder_settings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contact_settings_update" ON public.contact_email_builder_settings
  FOR UPDATE TO authenticated USING (true);

-- Add trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION public.update_contact_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_settings_updated_at
  BEFORE UPDATE ON public.contact_email_builder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_settings_timestamp();