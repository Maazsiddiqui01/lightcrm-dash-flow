-- Phase 1: Critical Security Fix
-- Enable RLS on emails_meetings_raw table

-- Enable Row Level Security
ALTER TABLE public.emails_meetings_raw ENABLE ROW LEVEL SECURITY;

-- Note: Existing policies are already defined and will remain active:
-- 1. admins_all_interactions - Admins can do everything
-- 2. admins_delete_interactions - Admins can delete
-- 3. users_insert_interactions - Users can insert their own or if created_by is NULL
-- 4. users_select_interactions - Users can view their own or contacts they own
-- 5. users_update_interactions - Users can update their own

-- This migration simply enables RLS enforcement on the table
-- The policies will now be actively enforced