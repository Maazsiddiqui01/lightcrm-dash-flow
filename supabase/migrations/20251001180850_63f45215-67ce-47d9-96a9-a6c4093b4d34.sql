-- Create signature_library table
CREATE TABLE IF NOT EXISTS public.signature_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tone TEXT NOT NULL CHECK (tone IN ('formal', 'hybrid', 'casual')),
  signature_text TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT true,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tone, template_id)
);

-- Enable RLS
ALTER TABLE public.signature_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "signature_library_read" ON public.signature_library
  FOR SELECT USING (true);

CREATE POLICY "signature_library_write" ON public.signature_library
  FOR INSERT WITH CHECK (true);

CREATE POLICY "signature_library_update" ON public.signature_library
  FOR UPDATE USING (true);

CREATE POLICY "signature_library_delete" ON public.signature_library
  FOR DELETE USING (true);

-- Insert default signatures
INSERT INTO public.signature_library (tone, signature_text, is_global) VALUES
  ('casual', '-Tom', true),
  ('hybrid', 'Best, Tom', true),
  ('formal', 'Regards, Tom', true)
ON CONFLICT DO NOTHING;

-- Add sync_behavior column to phrase_library
ALTER TABLE public.phrase_library 
ADD COLUMN IF NOT EXISTS sync_behavior TEXT DEFAULT 'inherit' CHECK (sync_behavior IN ('inherit', 'override', 'append'));

-- Add sync_behavior column to inquiry_library  
ALTER TABLE public.inquiry_library
ADD COLUMN IF NOT EXISTS sync_behavior TEXT DEFAULT 'inherit' CHECK (sync_behavior IN ('inherit', 'override', 'append'));

-- Add sync_behavior column to subject_library
ALTER TABLE public.subject_library
ADD COLUMN IF NOT EXISTS sync_behavior TEXT DEFAULT 'inherit' CHECK (sync_behavior IN ('inherit', 'override', 'append'));

-- Add probability_weight to email_template_settings module_states
COMMENT ON COLUMN public.email_template_settings.module_states IS 'JSONB with tri_state and optional probability_weight per module';

-- Create trigger for updated_at on signature_library using existing function
CREATE TRIGGER set_signature_library_updated_at
  BEFORE UPDATE ON public.signature_library
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();