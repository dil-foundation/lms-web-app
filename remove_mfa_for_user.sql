-- Script: Remove MFA Factors for Specific User
-- Description: Removes MFA factors for user arunyuvraj1998@gmail.com
-- Date: 2024-01-15

-- First, let's find the user ID for the email
DO $$
DECLARE
  target_user_id UUID;
  result JSONB;
BEGIN
  -- Get the user ID for the email
  SELECT id INTO target_user_id 
  FROM profiles 
  WHERE email = 'arunyuvraj1998@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email arunyuvraj1998@gmail.com not found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user ID: % for email: arunyuvraj1998@gmail.com', target_user_id;
  
  -- Check current MFA status before removal
  RAISE NOTICE 'Checking current MFA status...';
  
  -- Check if user has MFA factors
  IF EXISTS (
    SELECT 1 FROM auth.mfa_factors 
    WHERE user_id = target_user_id AND status = 'verified'
  ) THEN
    RAISE NOTICE 'User has verified MFA factors - proceeding with removal';
  ELSE
    RAISE NOTICE 'User does not have verified MFA factors';
  END IF;
  
  -- Call the admin_disable_mfa_for_user function
  SELECT admin_disable_mfa_for_user(target_user_id) INTO result;
  
  -- Display the result
  RAISE NOTICE 'MFA removal result: %', result;
  
  -- Verify the removal
  IF NOT EXISTS (
    SELECT 1 FROM auth.mfa_factors 
    WHERE user_id = target_user_id
  ) THEN
    RAISE NOTICE 'SUCCESS: All MFA factors have been removed for user arunyuvraj1998@gmail.com';
  ELSE
    RAISE NOTICE 'WARNING: Some MFA factors may still exist';
  END IF;
  
END $$;

-- Display the current MFA status for all users (for verification)
SELECT 
  p.email,
  p.role,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.mfa_factors mf 
      WHERE mf.user_id = p.id AND mf.status = 'verified'
    ) THEN 'MFA Enabled'
    ELSE 'MFA Disabled'
  END as mfa_status,
  CASE 
    WHEN (u.raw_app_meta_data->>'mfa_disabled_by_admin')::boolean = true THEN 'Disabled by Admin'
    ELSE 'Not Disabled by Admin'
  END as admin_disabled_status
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'arunyuvraj1998@gmail.com'
ORDER BY p.email;
