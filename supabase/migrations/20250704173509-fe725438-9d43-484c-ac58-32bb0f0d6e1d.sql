
-- Fix the handle_new_user function to properly reference the app_role enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, grade, teacher_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'::public.app_role),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'grade',
    NEW.raw_user_meta_data ->> 'teacher_id'
  );
  RETURN NEW;
END;
$$;
