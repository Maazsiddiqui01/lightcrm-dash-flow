-- Create contact_subject_preferences table for per-contact, per-subject tri-state
CREATE TABLE IF NOT EXISTS public.contact_subject_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  module_key text NOT NULL DEFAULT 'subject_line',
  subject_id uuid NOT NULL REFERENCES public.subject_library(id) ON DELETE CASCADE,
  tri_state text NOT NULL DEFAULT 'sometimes' CHECK (tri_state IN ('never', 'sometimes', 'always')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, module_key, subject_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_subject_prefs_contact_module 
  ON public.contact_subject_preferences(contact_id, module_key);

-- Enable RLS
ALTER TABLE public.contact_subject_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users manage their own contact subject preferences
CREATE POLICY "Users manage own contact subject preferences"
  ON public.contact_subject_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_subject_preferences.contact_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Backfill existing subject defaults as 'always' preferences
INSERT INTO public.contact_subject_preferences (contact_id, module_key, subject_id, tri_state)
SELECT 
  contact_id,
  'subject_line' as module_key,
  subject_id,
  'always' as tri_state
FROM public.contact_subject_defaults
WHERE subject_id IS NOT NULL
ON CONFLICT (contact_id, module_key, subject_id) DO NOTHING;