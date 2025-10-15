-- Phase 1 Critical Fixes: Database Security & Cascade Delete

-- Fix #2: Enable RLS on phrase_library
ALTER TABLE public.phrase_library ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all phrases (global + template-specific)
CREATE POLICY "authenticated_users_read_phrases"
ON public.phrase_library
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create/update phrases
CREATE POLICY "authenticated_users_write_phrases"
ON public.phrase_library
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_phrases"
ON public.phrase_library
FOR UPDATE
TO authenticated
USING (true);

-- Only admins can delete phrases
CREATE POLICY "admins_delete_phrases"
ON public.phrase_library
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix #2: Enable RLS on inquiry_library
ALTER TABLE public.inquiry_library ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all inquiries
CREATE POLICY "authenticated_users_read_inquiries"
ON public.inquiry_library
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create/update inquiries
CREATE POLICY "authenticated_users_write_inquiries"
ON public.inquiry_library
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_inquiries"
ON public.inquiry_library
FOR UPDATE
TO authenticated
USING (true);

-- Only admins can delete inquiries
CREATE POLICY "admins_delete_inquiries"
ON public.inquiry_library
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix #4: Add cascade delete for phrase_rotation_log
ALTER TABLE public.phrase_rotation_log
DROP CONSTRAINT IF EXISTS phrase_rotation_log_phrase_id_fkey;

ALTER TABLE public.phrase_rotation_log
ADD CONSTRAINT phrase_rotation_log_phrase_id_fkey
FOREIGN KEY (phrase_id) REFERENCES public.phrase_library(id)
ON DELETE CASCADE;

-- Fix #4: Add cascade delete for inquiry_rotation_log
ALTER TABLE public.inquiry_rotation_log
DROP CONSTRAINT IF EXISTS inquiry_rotation_log_inquiry_id_fkey;

ALTER TABLE public.inquiry_rotation_log
ADD CONSTRAINT inquiry_rotation_log_inquiry_id_fkey
FOREIGN KEY (inquiry_id) REFERENCES public.inquiry_library(id)
ON DELETE CASCADE;

-- Add helpful comment
COMMENT ON POLICY "authenticated_users_read_phrases" ON public.phrase_library IS 'All authenticated users can read phrases for email builder';
COMMENT ON POLICY "admins_delete_phrases" ON public.phrase_library IS 'Only admins can delete phrases to prevent accidental data loss';
COMMENT ON POLICY "authenticated_users_read_inquiries" ON public.inquiry_library IS 'All authenticated users can read inquiries for email builder';
COMMENT ON POLICY "admins_delete_inquiries" ON public.inquiry_library IS 'Only admins can delete inquiries to prevent accidental data loss';