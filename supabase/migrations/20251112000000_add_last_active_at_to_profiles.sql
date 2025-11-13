-- Add last_active_at column to profiles table
-- This tracks when the user was last active in the system

-- Add the column with a default value of now() for existing users
ALTER TABLE public.profiles
ADD COLUMN last_active_at timestamp with time zone DEFAULT now();

-- Add comment to document the field
COMMENT ON COLUMN public.profiles.last_active_at IS 'Timestamp of when the user was last active in the system (updated on sign-in and key user actions)';

-- Create an index for better query performance when sorting by last active
CREATE INDEX idx_profiles_last_active_at ON public.profiles(last_active_at DESC);

-- Create a function to update last_active_at
CREATE OR REPLACE FUNCTION public.update_user_last_active(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_last_active(uuid) TO authenticated;

COMMENT ON FUNCTION public.update_user_last_active(uuid) IS 'Updates the last_active_at timestamp for a user';
