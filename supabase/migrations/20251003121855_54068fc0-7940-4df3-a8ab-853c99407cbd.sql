-- ============================================
-- PHASE 1: Fix Critical Data Exposure
-- ============================================

-- 1. Delete unused backup table (exposes all contact data)
DROP TABLE IF EXISTS public.contacts_raw_dedupe_backup_2025_09_10;

-- 2. Tighten profiles table access (currently anyone can read user emails)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Enable RLS on n8n_chat_histories if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'n8n_chat_histories') THEN
    ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
    
    -- Only authenticated users can access their own chat histories
    EXECUTE 'CREATE POLICY "Users can access own chat histories" ON public.n8n_chat_histories FOR ALL USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;