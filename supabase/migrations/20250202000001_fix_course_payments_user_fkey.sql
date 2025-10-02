-- Fix foreign key constraint on course_payments.user_id to reference profiles instead of auth.users
-- This allows proper joins with the profiles table used throughout the application

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.course_payments 
DROP CONSTRAINT IF EXISTS course_payments_user_id_fkey;

-- Add the correct foreign key constraint to profiles
ALTER TABLE public.course_payments
ADD CONSTRAINT course_payments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT course_payments_user_id_fkey ON public.course_payments 
IS 'Links payment records to user profiles for displaying customer information';

