-- Phase 1: Add style column to phrase_library
ALTER TABLE public.phrase_library
ADD COLUMN IF NOT EXISTS style text NULL
CHECK (style IN ('formal', 'hybrid', 'casual'));

-- Phase 2: Migrate all subjects from subject_library to phrase_library
INSERT INTO public.phrase_library (
  id,
  category,
  phrase_text,
  style,
  template_id,
  tri_state,
  weight,
  is_global,
  sync_behavior,
  created_at,
  updated_at
)
SELECT
  id,
  'subject' as category,
  subject_template as phrase_text,
  style,
  NULL as template_id,
  'sometimes' as tri_state,
  1 as weight,
  is_global,
  'inherit' as sync_behavior,
  created_at,
  updated_at
FROM public.subject_library
ON CONFLICT (id) DO NOTHING;

-- Phase 3: Migrate subject preferences to phrase preferences
INSERT INTO public.contact_phrase_preferences (
  contact_id,
  module_key,
  phrase_id,
  tri_state,
  created_at,
  updated_at
)
SELECT
  contact_id,
  module_key,
  subject_id as phrase_id,
  tri_state,
  created_at,
  updated_at
FROM public.contact_subject_preferences
ON CONFLICT (contact_id, module_key, phrase_id) DO NOTHING;

-- Phase 4: Migrate subject defaults to phrase defaults (contact_subject_defaults -> contact_module_defaults)
INSERT INTO public.contact_module_defaults (
  contact_id,
  template_id,
  module_key,
  phrase_id,
  phrase_text,
  updated_by,
  created_at,
  updated_at
)
SELECT
  contact_id,
  template_id,
  'subject_line' as module_key,
  subject_id as phrase_id,
  subject_text as phrase_text,
  updated_by,
  created_at,
  updated_at
FROM public.contact_subject_defaults
ON CONFLICT (contact_id, template_id, module_key) DO NOTHING;

-- Phase 5: Drop legacy tables
DROP TABLE IF EXISTS public.contact_subject_preferences CASCADE;
DROP TABLE IF EXISTS public.contact_subject_defaults CASCADE;
DROP TABLE IF EXISTS public.subject_library CASCADE;