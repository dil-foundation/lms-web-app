-- Enable RLS on integrations table
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Policy for admin users to view all integrations
CREATE POLICY "Admin users can view all integrations" ON public.integrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- Policy for admin users to update integrations
CREATE POLICY "Admin users can update integrations" ON public.integrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- Policy for admin users to insert integrations
CREATE POLICY "Admin users can insert integrations" ON public.integrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- Policy for admin users to delete integrations
CREATE POLICY "Admin users can delete integrations" ON public.integrations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);
