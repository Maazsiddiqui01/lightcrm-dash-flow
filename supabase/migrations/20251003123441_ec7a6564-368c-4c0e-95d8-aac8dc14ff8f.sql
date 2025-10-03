-- Phase 2 & 3: Secure Employee Directory and Business Strategy Tables
-- This migration restricts access to authenticated users only

-- ============================================================================
-- PHASE 2: SECURE EMPLOYEE DIRECTORY TABLES
-- ============================================================================

-- lg_focus_area_directory - Contains employee names and emails
DROP POLICY IF EXISTS "lg_focus_area_directory_select" ON public.lg_focus_area_directory;

CREATE POLICY "authenticated_users_read_focus_directory"
ON public.lg_focus_area_directory
FOR SELECT
TO authenticated
USING (true);

-- lg_leads_directory - Contains lead names and contact info
DROP POLICY IF EXISTS "lg_leads_directory_select" ON public.lg_leads_directory;

CREATE POLICY "authenticated_users_read_leads_directory"
ON public.lg_leads_directory
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- PHASE 3: SECURE BUSINESS STRATEGY TABLES
-- ============================================================================

-- inquiry_library - Contains proprietary email inquiry templates
DROP POLICY IF EXISTS "inquiry_library_read" ON public.inquiry_library;
DROP POLICY IF EXISTS "inquiry_library_write" ON public.inquiry_library;
DROP POLICY IF EXISTS "inquiry_library_update" ON public.inquiry_library;
DROP POLICY IF EXISTS "inquiry_library_delete" ON public.inquiry_library;

CREATE POLICY "authenticated_users_all_inquiry_library"
ON public.inquiry_library
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- phrase_library - Contains proprietary email phrases
DROP POLICY IF EXISTS "phrase_library_read" ON public.phrase_library;
DROP POLICY IF EXISTS "phrase_library_write" ON public.phrase_library;
DROP POLICY IF EXISTS "phrase_library_update" ON public.phrase_library;
DROP POLICY IF EXISTS "phrase_library_delete" ON public.phrase_library;

CREATE POLICY "authenticated_users_all_phrase_library"
ON public.phrase_library
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- subject_library - Contains proprietary email subject templates
DROP POLICY IF EXISTS "subject_library_read" ON public.subject_library;
DROP POLICY IF EXISTS "subject_library_write" ON public.subject_library;
DROP POLICY IF EXISTS "subject_library_update" ON public.subject_library;
DROP POLICY IF EXISTS "subject_library_delete" ON public.subject_library;

CREATE POLICY "authenticated_users_all_subject_library"
ON public.subject_library
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- signature_library - Contains proprietary email signatures
DROP POLICY IF EXISTS "signature_library_read" ON public.signature_library;
DROP POLICY IF EXISTS "signature_library_write" ON public.signature_library;
DROP POLICY IF EXISTS "signature_library_update" ON public.signature_library;
DROP POLICY IF EXISTS "signature_library_delete" ON public.signature_library;

CREATE POLICY "authenticated_users_all_signature_library"
ON public.signature_library
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);