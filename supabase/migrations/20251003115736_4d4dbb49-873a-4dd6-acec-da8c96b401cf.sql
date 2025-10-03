-- Phase 3: Enable Proper RLS Policies
-- This restricts access: Admins see all, Users see only their assigned records

-- ========================================
-- CONTACTS_RAW POLICIES
-- ========================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "contacts_read_all" ON public.contacts_raw;
DROP POLICY IF EXISTS "contacts_write" ON public.contacts_raw;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts_raw;

-- Admin can see and do everything
CREATE POLICY "admins_all_contacts"
ON public.contacts_raw
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Users can see contacts they own or are assigned to
CREATE POLICY "users_select_own_contacts"
ON public.contacts_raw
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
  -- If no assignment yet, all users can see (for existing data)
  OR (assigned_to IS NULL AND created_by IS NULL)
);

-- Users can insert contacts (auto-assigned to them via trigger)
CREATE POLICY "users_insert_contacts"
ON public.contacts_raw
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  -- Allow insert even if fields not set (trigger will handle it)
  OR (created_by IS NULL AND assigned_to IS NULL)
);

-- Users can update their own contacts
CREATE POLICY "users_update_own_contacts"
ON public.contacts_raw
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

-- Only admins can delete contacts
CREATE POLICY "admins_delete_contacts"
ON public.contacts_raw
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ========================================
-- OPPORTUNITIES_RAW POLICIES
-- ========================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "opportunities_read_all" ON public.opportunities_raw;
DROP POLICY IF EXISTS "opportunities_write" ON public.opportunities_raw;
DROP POLICY IF EXISTS "opportunities_update" ON public.opportunities_raw;

-- Admin can see and do everything
CREATE POLICY "admins_all_opportunities"
ON public.opportunities_raw
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Users can see opportunities they own or are assigned to
CREATE POLICY "users_select_own_opportunities"
ON public.opportunities_raw
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
  -- If no assignment yet, all users can see (for existing data)
  OR (assigned_to IS NULL AND created_by IS NULL)
);

-- Users can insert opportunities
CREATE POLICY "users_insert_opportunities"
ON public.opportunities_raw
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (created_by IS NULL AND assigned_to IS NULL)
);

-- Users can update their own opportunities
CREATE POLICY "users_update_own_opportunities"
ON public.opportunities_raw
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

-- Only admins can delete opportunities
CREATE POLICY "admins_delete_opportunities"
ON public.opportunities_raw
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ========================================
-- EMAILS_MEETINGS_RAW POLICIES
-- ========================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "interactions_read_all" ON public.emails_meetings_raw;
DROP POLICY IF EXISTS "inter_write" ON public.emails_meetings_raw;
DROP POLICY IF EXISTS "inter_update" ON public.emails_meetings_raw;

-- Admin can see and do everything
CREATE POLICY "admins_all_interactions"
ON public.emails_meetings_raw
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Users can see interactions they created or related to their contacts
CREATE POLICY "users_select_interactions"
ON public.emails_meetings_raw
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  -- If no creator set, allow access (for existing data)
  OR created_by IS NULL
  -- Or if interaction involves a contact they own
  OR EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    AND c.email_address = ANY(emails_meetings_raw.emails_arr)
  )
);

-- Users can insert interactions
CREATE POLICY "users_insert_interactions"
ON public.emails_meetings_raw
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR created_by IS NULL
);

-- Users can update their own interactions
CREATE POLICY "users_update_interactions"
ON public.emails_meetings_raw
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR created_by IS NULL
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);

-- Only admins can delete interactions
CREATE POLICY "admins_delete_interactions"
ON public.emails_meetings_raw
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ========================================
-- OTHER TABLES - BASIC POLICIES
-- ========================================

-- Email Templates - all authenticated users can manage
DROP POLICY IF EXISTS "Templates are readable by everyone" ON public.email_templates;
DROP POLICY IF EXISTS "Templates can be inserted by everyone" ON public.email_templates;
DROP POLICY IF EXISTS "Templates can be updated by everyone" ON public.email_templates;
DROP POLICY IF EXISTS "Templates can be deleted by everyone" ON public.email_templates;

CREATE POLICY "templates_select_auth" ON public.email_templates
FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_insert_auth" ON public.email_templates
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "templates_update_auth" ON public.email_templates
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "templates_delete_admin" ON public.email_templates
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Articles - all authenticated users can manage
DROP POLICY IF EXISTS "Articles are readable by everyone" ON public.articles;
DROP POLICY IF EXISTS "Articles can be inserted by everyone" ON public.articles;
DROP POLICY IF EXISTS "Articles can be updated by everyone" ON public.articles;
DROP POLICY IF EXISTS "Articles can be deleted by everyone" ON public.articles;

CREATE POLICY "articles_select_auth" ON public.articles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "articles_insert_auth" ON public.articles
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "articles_update_auth" ON public.articles
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "articles_delete_admin" ON public.articles
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));