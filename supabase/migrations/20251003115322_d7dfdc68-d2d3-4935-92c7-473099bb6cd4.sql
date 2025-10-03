-- Phase 1: User Roles Foundation
-- This creates the foundation for role-based access without impacting existing functionality

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'viewer');

-- 2. Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by authenticated users
CREATE POLICY "profiles_select_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view roles (needed for UI)
CREATE POLICY "user_roles_select_authenticated"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify roles (we'll check this in application logic initially)
CREATE POLICY "user_roles_modify_admin"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 4. Create helper functions with SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Helper to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'user' THEN 2
      WHEN 'viewer' THEN 3
    END
  LIMIT 1
$$;

-- 5. Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- First user becomes admin, others become regular users
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill existing user (make them admin)
DO $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Get the first existing user
  SELECT id INTO existing_user_id FROM auth.users LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    -- Create profile if doesn't exist
    INSERT INTO public.profiles (id, email, full_name)
    SELECT id, email, raw_user_meta_data->>'full_name'
    FROM auth.users
    WHERE id = existing_user_id
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;