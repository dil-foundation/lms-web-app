-- Migration: Create initial super user account
-- This migration creates the first super user account for the system
-- There should only be ONE super user in the system
-- Date: 2025-10-28

-- NOTE: This migration should be run AFTER 20251028000000_add_new_user_roles.sql

-- Step 1: Add a constraint to ensure only one super_user can exist
-- Create a unique partial index to enforce single super user
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_super_user 
ON public.profiles (role) 
WHERE role = 'super_user';

COMMENT ON INDEX idx_single_super_user IS 'Ensures only one super_user can exist in the system';

-- Step 2: Create a function to check super user limit
CREATE OR REPLACE FUNCTION public.check_super_user_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If trying to insert or update to super_user role
  IF NEW.role = 'super_user' THEN
    -- Check if a super user already exists (excluding current record in case of update)
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE role = 'super_user' 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Only one super user is allowed in the system. A super user already exists.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_super_user_limit() IS 'Ensures only one super_user can exist in the system';

-- Step 3: Create trigger to enforce super user limit
DROP TRIGGER IF EXISTS enforce_single_super_user ON public.profiles;
CREATE TRIGGER enforce_single_super_user
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_super_user_limit();

COMMENT ON TRIGGER enforce_single_super_user ON public.profiles IS 'Prevents creation of multiple super users';

-- Step 4: Instructions for creating the super user
-- The super user should be created manually through Supabase Auth or via a secure setup script
-- DO NOT create it here in the migration to avoid hardcoding credentials

-- To create the super user account:
-- 1. Create the user through Supabase Auth Dashboard or API
-- 2. Update the profiles table with the super_user role:
--
-- UPDATE public.profiles 
-- SET role = 'super_user'
-- WHERE email = 'superadmin@yourdomain.com';
--
-- OR use the Supabase dashboard to manually update the role

-- Log a notice about super user creation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPER USER SETUP REQUIRED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'This migration has configured the system to support ONE super user.';
  RAISE NOTICE '';
  RAISE NOTICE 'To create your super user account:';
  RAISE NOTICE '1. Create a user account through Supabase Auth';
  RAISE NOTICE '2. Run this SQL command:';
  RAISE NOTICE '   UPDATE public.profiles SET role = ''super_user'' WHERE email = ''your-admin@domain.com'';';
  RAISE NOTICE '';
  RAISE NOTICE 'The super user will have full administrative access to the system.';
  RAISE NOTICE '========================================';
END $$;

-- Migration completed successfully

