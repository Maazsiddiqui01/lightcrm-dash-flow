-- ============================================
-- Phase 3B: Enable RLS on Tables with Policies
-- ============================================
-- This fixes the critical security issue where policies exist but RLS is disabled

-- Enable RLS on main data tables
ALTER TABLE public.contacts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails_meetings_raw ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reference/lookup tables (read-only for authenticated users)
ALTER TABLE public.lg_focus_area_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lg_leads_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lg_focus_area_master ENABLE ROW LEVEL SECURITY;

-- Create policies for reference tables (read-only)
CREATE POLICY "lg_focus_area_directory_select" ON public.lg_focus_area_directory
  FOR SELECT USING (true);

CREATE POLICY "lg_leads_directory_select" ON public.lg_leads_directory
  FOR SELECT USING (true);

CREATE POLICY "lg_focus_area_master_select" ON public.lg_focus_area_master
  FOR SELECT USING (true);

-- Enable RLS on dismissed emails (internal use)
ALTER TABLE public.contacts_dismissed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_dismissed_emails_select" ON public.contacts_dismissed_emails
  FOR SELECT USING (true);

CREATE POLICY "contacts_dismissed_emails_insert" ON public.contacts_dismissed_emails
  FOR INSERT WITH CHECK (true);

CREATE POLICY "contacts_dismissed_emails_update" ON public.contacts_dismissed_emails
  FOR UPDATE USING (true);

-- Enable RLS on n8n chat histories if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'n8n_chat_histories') THEN
    EXECUTE 'ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "n8n_chat_histories_all" ON public.n8n_chat_histories FOR ALL USING (true)';
  END IF;
END $$;

-- Backup tables don't need RLS as they're internal
-- contacts_raw_dedupe_backup_2025_09_10 and opportunities_raw_backup_2025_09_04 can stay without RLS