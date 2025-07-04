
-- Update the user account arunvaradharajalu@gmail.com to admin role
UPDATE public.profiles 
SET role = 'admin'::public.app_role 
WHERE email = 'arunvaradharajalu@gmail.com';
