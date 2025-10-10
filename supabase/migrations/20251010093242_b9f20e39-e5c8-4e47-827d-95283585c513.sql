-- Create tables for module & subject defaults persistence
-- Enables per-contact and per-template default phrase/subject configuration

-- Contact-level module defaults (phrase selections)
CREATE TABLE IF NOT EXISTS public.contact_module_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  phrase_id UUID REFERENCES public.phrase_library(id) ON DELETE SET NULL,
  phrase_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(contact_id, template_id, module_key)
);

-- Template-level module defaults (phrase selections)
CREATE TABLE IF NOT EXISTS public.template_module_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  phrase_id UUID REFERENCES public.phrase_library(id) ON DELETE SET NULL,
  phrase_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(template_id, module_key)
);

-- Contact-level subject defaults
CREATE TABLE IF NOT EXISTS public.contact_subject_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subject_library(id) ON DELETE SET NULL,
  subject_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(contact_id, template_id)
);

-- Template-level subject defaults
CREATE TABLE IF NOT EXISTS public.template_subject_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subject_library(id) ON DELETE SET NULL,
  subject_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(template_id)
);

-- Enable RLS on all tables
ALTER TABLE public.contact_module_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_module_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_subject_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_subject_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_module_defaults
CREATE POLICY "Users view own contact module defaults"
  ON public.contact_module_defaults FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users manage own contact module defaults"
  ON public.contact_module_defaults FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- RLS Policies for template_module_defaults
CREATE POLICY "All users view template module defaults"
  ON public.template_module_defaults FOR SELECT
  USING (true);

CREATE POLICY "Admins manage template module defaults"
  ON public.template_module_defaults FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for contact_subject_defaults
CREATE POLICY "Users view own contact subject defaults"
  ON public.contact_subject_defaults FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users manage own contact subject defaults"
  ON public.contact_subject_defaults FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- RLS Policies for template_subject_defaults
CREATE POLICY "All users view template subject defaults"
  ON public.template_subject_defaults FOR SELECT
  USING (true);

CREATE POLICY "Admins manage template subject defaults"
  ON public.template_subject_defaults FOR ALL
  USING (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_contact_module_defaults_contact 
  ON public.contact_module_defaults(contact_id);
CREATE INDEX idx_contact_module_defaults_template 
  ON public.contact_module_defaults(template_id);
CREATE INDEX idx_template_module_defaults_template 
  ON public.template_module_defaults(template_id);
CREATE INDEX idx_contact_subject_defaults_contact 
  ON public.contact_subject_defaults(contact_id);
CREATE INDEX idx_template_subject_defaults_template 
  ON public.template_subject_defaults(template_id);

-- Add updated_at trigger
CREATE TRIGGER update_contact_module_defaults_updated_at
  BEFORE UPDATE ON public.contact_module_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_template_module_defaults_updated_at
  BEFORE UPDATE ON public.template_module_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_contact_subject_defaults_updated_at
  BEFORE UPDATE ON public.contact_subject_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_template_subject_defaults_updated_at
  BEFORE UPDATE ON public.template_subject_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.contact_module_defaults IS 
  'Stores per-contact default phrase selections for each module';
COMMENT ON TABLE public.template_module_defaults IS 
  'Stores per-template default phrase selections for each module';
COMMENT ON TABLE public.contact_subject_defaults IS 
  'Stores per-contact default subject line selection';
COMMENT ON TABLE public.template_subject_defaults IS 
  'Stores per-template default subject line selection';