
-- Create a dummy student user for testing
-- First, we need to insert into auth.users (this is handled by Supabase Auth)
-- Then the trigger will automatically create the profile

-- Note: We cannot directly insert into auth.users table via SQL
-- Instead, I'll provide you with credentials to sign up manually

-- Let's create a sample profile that would be created after signup
-- This is just for reference of what the profile would look like

INSERT INTO public.profiles (id, email, role, full_name, grade, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'student.test@example.com',
  'student',
  'Test Student',
  '10',
  now(),
  now()
) ON CONFLICT DO NOTHING;
