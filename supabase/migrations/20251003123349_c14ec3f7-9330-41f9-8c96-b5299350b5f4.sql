-- Phase 1: Fix Critical Public Data Exposure
-- This migration removes overly permissive RLS policies that allow public access to sensitive data

-- ============================================================================
-- 1. SECURE opportunities_raw - Remove public access to deal data
-- ============================================================================

-- Drop overly permissive policies that allow anyone to read/write opportunities
DROP POLICY IF EXISTS "opps_read_all" ON public.opportunities_raw;
DROP POLICY IF EXISTS "opps_update" ON public.opportunities_raw;
DROP POLICY IF EXISTS "opps_write" ON public.opportunities_raw;

-- Note: Keeping existing user-specific policies:
-- - users_select_own_opportunities
-- - users_insert_opportunities  
-- - users_update_own_opportunities
-- - admins_all_opportunities

-- ============================================================================
-- 2. SECURE n8n_chat_histories - Remove public access to private chats
-- ============================================================================

DROP POLICY IF EXISTS "n8n_chat_histories_all" ON public.n8n_chat_histories;

-- Note: Keeping existing policy: "Users can access own chat histories"

-- ============================================================================
-- 3. SECURE contact_note_events - Restrict to contact owners only
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "read contact notes" ON public.contact_note_events;
DROP POLICY IF EXISTS "insert contact notes" ON public.contact_note_events;

-- Create new policies that verify user has access to parent contact
CREATE POLICY "admins_all_contact_notes"
ON public.contact_note_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_select_own_contact_notes"
ON public.contact_note_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.id = contact_note_events.contact_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

CREATE POLICY "users_insert_own_contact_notes"
ON public.contact_note_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.id = contact_note_events.contact_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

-- ============================================================================
-- 4. SECURE contact_intentional_no_outreach_events - Restrict to contact owners
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "read intentional no outreach events" ON public.contact_intentional_no_outreach_events;
DROP POLICY IF EXISTS "insert intentional no outreach events" ON public.contact_intentional_no_outreach_events;

-- Create new policies that verify user has access to parent contact
CREATE POLICY "admins_all_intentional_no_outreach"
ON public.contact_intentional_no_outreach_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_select_own_intentional_no_outreach"
ON public.contact_intentional_no_outreach_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.id = contact_intentional_no_outreach_events.contact_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

CREATE POLICY "users_insert_own_intentional_no_outreach"
ON public.contact_intentional_no_outreach_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.id = contact_intentional_no_outreach_events.contact_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);