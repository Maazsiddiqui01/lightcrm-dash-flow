-- Add subject_line to default_modules JSONB in master_template_defaults
UPDATE master_template_defaults
SET default_modules = jsonb_set(
  default_modules::jsonb,
  '{subject_line}',
  '"always"'::jsonb
)
WHERE NOT (default_modules::jsonb ? 'subject_line');

-- Migrate existing subject_line_pool selections to subject_line (single-select)
-- Convert multi-select pool to single selection using defaultSubjectId
UPDATE contact_email_builder_settings
SET module_selections = jsonb_set(
  COALESCE(module_selections, '{}'::jsonb),
  '{subject_line}',
  jsonb_build_object(
    'type', 'phrase',
    'category', 'subject',
    'phraseId', module_selections->'subject_line_pool'->>'defaultSubjectId',
    'phraseText', (
      SELECT subject_template 
      FROM subject_library 
      WHERE id = (module_selections->'subject_line_pool'->>'defaultSubjectId')::uuid
    ),
    'defaultPhraseId', module_selections->'subject_line_pool'->>'defaultSubjectId'
  )
)
WHERE module_selections->'subject_line_pool'->>'defaultSubjectId' IS NOT NULL;

-- Add subject_line to module_order arrays at position 1
UPDATE contact_email_builder_settings
SET module_order = (
  SELECT jsonb_agg(elem ORDER BY idx)
  FROM (
    SELECT 'subject_line' as elem, 0 as idx
    UNION ALL
    SELECT elem::text, row_number() OVER () as idx
    FROM jsonb_array_elements_text(module_order::jsonb) elem
    WHERE elem::text != 'subject_line'
  ) sub
)
WHERE module_order IS NOT NULL
AND NOT (module_order::jsonb @> '["subject_line"]'::jsonb);

-- Same for email_template_settings (global templates)
UPDATE email_template_settings
SET module_order = (
  SELECT jsonb_agg(elem ORDER BY idx)
  FROM (
    SELECT 'subject_line' as elem, 0 as idx
    UNION ALL
    SELECT elem::text, row_number() OVER () as idx
    FROM jsonb_array_elements_text(module_order::jsonb) elem
    WHERE elem::text != 'subject_line'
  ) sub
)
WHERE module_order IS NOT NULL
AND NOT (module_order::jsonb @> '["subject_line"]'::jsonb);