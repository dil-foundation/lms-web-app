-- Fix integrations RLS policies
-- Drop the conflicting policies that reference wrong table names

-- Drop the policies from migration 144 that reference user_profiles (wrong table)
DROP POLICY IF EXISTS "Admin users can view all integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admin users can update integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admin users can insert integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admin users can delete integrations" ON public.integrations;

-- Drop the old policy from migration 143 
DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;

-- Create correct policies using the profiles table (not user_profiles)
CREATE POLICY "Admin users can view all integrations" ON public.integrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin users can update integrations" ON public.integrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin users can insert integrations" ON public.integrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin users can delete integrations" ON public.integrations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
