-- Phase 1: Multi-Email Support Schema

-- Create contact_email_addresses table
CREATE TABLE IF NOT EXISTS public.contact_email_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'primary' CHECK (email_type IN ('primary', 'work', 'personal', 'alternate')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'merge', 'sync')),
  UNIQUE(contact_id, email_address)
);

-- Create indexes
CREATE INDEX idx_contact_email_addresses_contact_id ON public.contact_email_addresses(contact_id);
CREATE INDEX idx_contact_email_addresses_email ON public.contact_email_addresses(email_address);
CREATE INDEX idx_contact_email_addresses_primary ON public.contact_email_addresses(contact_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.contact_email_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view emails for their contacts"
  ON public.contact_email_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_email_addresses.contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can manage emails for their contacts"
  ON public.contact_email_addresses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_email_addresses.contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- Function to ensure only one primary email per contact
CREATE OR REPLACE FUNCTION public.ensure_single_primary_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other emails for this contact to non-primary
    UPDATE public.contact_email_addresses
    SET is_primary = false
    WHERE contact_id = NEW.contact_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure single primary email
CREATE TRIGGER ensure_single_primary_email_trigger
  BEFORE INSERT OR UPDATE ON public.contact_email_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_email();

-- Backfill existing data from contacts_raw
INSERT INTO public.contact_email_addresses (contact_id, email_address, email_type, is_primary, source)
SELECT 
  id,
  email_address,
  'primary',
  true,
  'import'
FROM public.contacts_raw
WHERE email_address IS NOT NULL AND email_address != ''
ON CONFLICT (contact_id, email_address) DO NOTHING;