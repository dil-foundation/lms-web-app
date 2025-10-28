-- ============================================
-- Migration: Create auth.users trigger for profile creation
-- ============================================
-- This trigger automatically creates a profile when a user signs up
-- Date: 2025-10-28
-- ============================================

-- Ensure the handle_new_user function exists with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with proper defaults and NULL handling
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    grade,
    teacher_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'),
    NEW.raw_user_meta_data->>'grade',
    NEW.raw_user_meta_data->>'teacher_id',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error creating profile for user % (%): %', NEW.email, NEW.id, SQLERRM;
    -- Re-raise to prevent user creation if profile fails
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up';

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Drop existing trigger if it exists (to make migration idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
-- This will call handle_new_user() after each user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Note: Cannot add comment on auth.users trigger due to permissions
-- The trigger creates a profile entry when a new user signs up

-- Ensure INSERT policy exists for profile creation during signup
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON public.profiles;

CREATE POLICY "Enable insert for authenticated users during signup"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: This policy allows the trigger function to create profiles during user signup

-- Log success
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Auth trigger created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The on_auth_user_created trigger has been set up.';
  RAISE NOTICE 'New user signups will automatically create profiles.';
  RAISE NOTICE '========================================';
END $$;

