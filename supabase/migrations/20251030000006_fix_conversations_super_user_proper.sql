-- Migration: Fix conversations RLS policies to include super_user access (CORRECTED)
-- Issue: Super users cannot access conversations management features like admins
-- Date: 2025-10-30
-- 
-- Analysis: The conversations table RLS policies only check for 'admin' role but not 'super_user'.
-- This migration updates the policies to use the established helper functions that already
-- include super_user access, following the pattern from 20251028000000_add_new_user_roles.sql

-- ============================================
-- CONVERSATIONS TABLE - Update RLS policies to use established helper functions
-- ============================================

-- Update conversation update policy to use has_elevated_privileges() helper function
-- This function already includes both admin and super_user roles (from 20251028000000_add_new_user_roles.sql)
DROP POLICY IF EXISTS "Conversation creators can update their conversations" ON public.conversations;
CREATE POLICY "Conversation creators can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  (auth.uid() = created_by) 
  OR has_elevated_privileges(auth.uid())
);

-- Update conversation delete policy to use is_admin_user() helper function  
-- This function was already updated to include super_user (from 20251028000000_add_new_user_roles.sql)
DROP POLICY IF EXISTS "Only admins can delete conversations" ON public.conversations;
CREATE POLICY "Admins and super users can delete conversations" 
ON public.conversations 
FOR DELETE 
USING (
  is_admin_user(auth.uid())
);

-- Add comments explaining the updated policies
COMMENT ON POLICY "Conversation creators can update their conversations" ON public.conversations IS 
'Allow conversation creators and users with elevated privileges (admin/super_user) to update conversations. Uses has_elevated_privileges() helper function.';

COMMENT ON POLICY "Admins and super users can delete conversations" ON public.conversations IS 
'Allow users with elevated admin privileges (admin/super_user) to delete any conversation. Uses is_admin_user() helper function.';
