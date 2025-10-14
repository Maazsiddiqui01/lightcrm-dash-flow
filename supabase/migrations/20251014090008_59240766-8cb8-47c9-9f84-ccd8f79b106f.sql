-- Phase 1: Database Schema Enhancement

-- 1.1 Create contact_phrase_preferences table
CREATE TABLE IF NOT EXISTS public.contact_phrase_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  phrase_id uuid NOT NULL REFERENCES public.phrase_library(id) ON DELETE CASCADE,
  tri_state text NOT NULL DEFAULT 'sometimes' CHECK (tri_state IN ('never', 'sometimes', 'always')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(contact_id, module_key, phrase_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_contact_phrase_prefs_contact_module 
ON public.contact_phrase_preferences(contact_id, module_key);

-- Enable RLS
ALTER TABLE public.contact_phrase_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users manage own contact phrase preferences
CREATE POLICY "Users manage own contact phrase preferences"
ON public.contact_phrase_preferences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c 
    WHERE c.id = contact_phrase_preferences.contact_id 
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- 1.2 Add module_tri_states to contact_email_builder_settings
ALTER TABLE public.contact_email_builder_settings
ADD COLUMN IF NOT EXISTS module_tri_states jsonb DEFAULT '{}'::jsonb;

COMMENT ON TABLE public.contact_phrase_preferences IS 'Stores per-contact, per-module, per-phrase tri-state preferences (never/sometimes/always)';
COMMENT ON COLUMN public.contact_email_builder_settings.module_tri_states IS 'Per-contact, per-module tri-state overrides. Format: {"subject_line": "always", "initial_greeting": "sometimes"}';