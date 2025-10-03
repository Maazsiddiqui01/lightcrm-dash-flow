-- Drop the problematic policy that allows users to see unassigned opportunities
DROP POLICY IF EXISTS "users_select_own_opportunities" ON public.opportunities_raw;

-- Ensure we have the correct policies in place
-- 1. Admins see everything
DROP POLICY IF EXISTS "admins_all_opportunities" ON public.opportunities_raw;
CREATE POLICY "admins_all_opportunities"
ON public.opportunities_raw
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. Users see only their assigned or created opportunities
DROP POLICY IF EXISTS "users_select_opportunities" ON public.opportunities_raw;
CREATE POLICY "users_select_opportunities"
ON public.opportunities_raw
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

-- 3. Users can insert opportunities (will be auto-assigned via trigger)
DROP POLICY IF EXISTS "users_insert_opportunities" ON public.opportunities_raw;
CREATE POLICY "users_insert_opportunities"
ON public.opportunities_raw
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) 
  OR created_by = auth.uid() 
  OR assigned_to = auth.uid()
);

-- 4. Users can update their own opportunities
DROP POLICY IF EXISTS "users_update_own_opportunities" ON public.opportunities_raw;
CREATE POLICY "users_update_own_opportunities"
ON public.opportunities_raw
FOR UPDATE
TO authenticated
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

-- 5. Only admins can delete opportunities
DROP POLICY IF EXISTS "admins_delete_opportunities" ON public.opportunities_raw;
CREATE POLICY "admins_delete_opportunities"
ON public.opportunities_raw
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));