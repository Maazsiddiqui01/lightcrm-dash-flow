-- ============================================
-- CRITICAL SECURITY FIXES
-- ============================================

-- 1. FIX PUBLIC USER DATA EXPOSURE
-- Change profiles SELECT policy to only allow users to view their own profile
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. ADD PROFILE CREATION TRIGGER
-- Automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role app_role := 'user';
BEGIN
  -- Create profile entry
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );

  -- Assign default role if no role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. EXPAND PROTECTED COLUMNS
-- Add more system-critical columns to protected list
INSERT INTO public.protected_columns (table_name, column_name, reason)
VALUES 
  ('contacts_raw', 'assigned_to', 'User assignment tracking'),
  ('contacts_raw', 'created_by', 'User creation tracking'),
  ('contacts_raw', 'updated_at', 'Timestamp tracking'),
  ('opportunities_raw', 'assigned_to', 'User assignment tracking'),
  ('opportunities_raw', 'created_by', 'User creation tracking'),
  ('opportunities_raw', 'updated_at', 'Timestamp tracking'),
  ('emails_meetings_raw', 'created_by', 'User creation tracking'),
  ('emails_meetings_raw', 'organization_id', 'Organization relationship')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- 4. ADD MISSING RLS POLICIES
-- Fix interactions_n8n table (has RLS enabled but no policies)
CREATE POLICY "n8n_interactions_system_only"
  ON public.interactions_n8n
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix focus_area_descriptions table
CREATE POLICY "focus_area_descriptions_readable"
  ON public.focus_area_descriptions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "focus_area_descriptions_admin_manage"
  ON public.focus_area_descriptions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));