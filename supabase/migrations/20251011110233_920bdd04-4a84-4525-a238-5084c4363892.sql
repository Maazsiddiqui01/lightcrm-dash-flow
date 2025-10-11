-- Add custom_module_labels column to email_template_settings
ALTER TABLE public.email_template_settings
ADD COLUMN IF NOT EXISTS custom_module_labels jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.email_template_settings.custom_module_labels IS 
'Stores custom display names for email modules (e.g., "top_opportunities" → "Tier 1 Active Opportunities"). Persists across all contacts using this template.';