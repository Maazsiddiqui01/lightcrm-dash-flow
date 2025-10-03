-- Fix RLS policies to prevent users from seeing unassigned data
-- This addresses the security issue where users can see all data

-- Drop existing policies for contacts
DROP POLICY IF EXISTS "users_select_own_contacts" ON public.contacts_raw;
DROP POLICY IF EXISTS "users_insert_contacts" ON public.contacts_raw;
DROP POLICY IF EXISTS "users_update_own_contacts" ON public.contacts_raw;

-- Create stricter policies for contacts
CREATE POLICY "users_select_own_contacts" ON public.contacts_raw
FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

CREATE POLICY "users_insert_contacts" ON public.contacts_raw
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR created_by = auth.uid() 
  OR assigned_to = auth.uid()
);

CREATE POLICY "users_update_own_contacts" ON public.contacts_raw
FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
)
WITH CHECK (
  is_admin(auth.uid()) 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

-- Drop existing policies for opportunities
DROP POLICY IF EXISTS "users_select_opportunities" ON public.opportunities_raw;
DROP POLICY IF EXISTS "users_insert_opportunities" ON public.opportunities_raw;
DROP POLICY IF EXISTS "users_update_opportunities" ON public.opportunities_raw;

-- Create stricter policies for opportunities
CREATE POLICY "users_select_opportunities" ON public.opportunities_raw
FOR SELECT
USING (
  is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "users_insert_opportunities" ON public.opportunities_raw
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
);

CREATE POLICY "users_update_opportunities" ON public.opportunities_raw
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
)
WITH CHECK (
  is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

-- Drop existing policies for interactions
DROP POLICY IF EXISTS "users_select_interactions" ON public.emails_meetings_raw;

-- Create stricter policy for interactions
-- Users can only see interactions related to their assigned contacts
CREATE POLICY "users_select_interactions" ON public.emails_meetings_raw
FOR SELECT
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    AND c.email_address = ANY(emails_meetings_raw.emails_arr)
  )
);