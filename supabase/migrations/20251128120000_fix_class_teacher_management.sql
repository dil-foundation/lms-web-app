-- Migration: Allow teachers to manage class members in classes they're assigned to
-- Problem: RLS policies only let teachers delete their OWN assignment, not other teachers
-- This causes class updates to fail with duplicate key errors

-- Solution: Create a SECURITY DEFINER function that can bypass RLS
-- but with proper authorization checks

-- Drop existing function if it exists (to ensure clean update)
DROP FUNCTION IF EXISTS public.update_class_teachers(UUID, UUID[], UUID);

-- Function to update class teachers (bypasses RLS with authorization check)
CREATE OR REPLACE FUNCTION public.update_class_teachers(
  p_class_id UUID,
  p_teacher_ids UUID[],
  p_calling_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_is_authorized BOOLEAN := FALSE;
  v_teacher_id UUID;
  v_is_first BOOLEAN := TRUE;
BEGIN
  -- Get the calling user's ID
  v_user_id := COALESCE(p_calling_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user's role
  SELECT role::TEXT INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Check authorization:
  -- 1. Admins can manage any class
  -- 2. Super users can manage any class
  -- 3. Teachers can only manage classes they're currently assigned to
  IF v_user_role IN ('admin', 'super_user') THEN
    v_is_authorized := TRUE;
  ELSE
    -- Check if user is a teacher in this class
    SELECT EXISTS (
      SELECT 1 FROM public.class_teachers
      WHERE class_id = p_class_id AND teacher_id = v_user_id
    ) INTO v_is_authorized;
  END IF;
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to manage teachers in this class';
  END IF;
  
  -- Delete all existing teachers for this class
  DELETE FROM public.class_teachers
  WHERE class_id = p_class_id;
  
  -- Insert new teachers one by one (first one is primary)
  IF p_teacher_ids IS NOT NULL AND array_length(p_teacher_ids, 1) > 0 THEN
    FOREACH v_teacher_id IN ARRAY p_teacher_ids
    LOOP
      INSERT INTO public.class_teachers (class_id, teacher_id, is_primary, role)
      VALUES (p_class_id, v_teacher_id, v_is_first, 'teacher');
      
      v_is_first := FALSE;  -- Only first iteration sets is_primary = true
    END LOOP;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to update class students (bypasses RLS with authorization check)
CREATE OR REPLACE FUNCTION public.update_class_students(
  p_class_id UUID,
  p_student_ids UUID[],
  p_calling_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_is_authorized BOOLEAN := FALSE;
  v_student_id UUID;
  v_student_number INT := 1;
BEGIN
  -- Get the calling user's ID
  v_user_id := COALESCE(p_calling_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user's role
  SELECT role::TEXT INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Check authorization:
  -- 1. Admins can manage any class
  -- 2. Super users can manage any class
  -- 3. Teachers can only manage classes they're assigned to
  IF v_user_role IN ('admin', 'super_user') THEN
    v_is_authorized := TRUE;
  ELSE
    -- Check if user is a teacher in this class
    SELECT EXISTS (
      SELECT 1 FROM public.class_teachers
      WHERE class_id = p_class_id AND teacher_id = v_user_id
    ) INTO v_is_authorized;
  END IF;
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to manage students in this class';
  END IF;
  
  -- Delete all existing students for this class
  DELETE FROM public.class_students
  WHERE class_id = p_class_id;
  
  -- Insert new students one by one with sequential student numbers
  IF p_student_ids IS NOT NULL AND array_length(p_student_ids, 1) > 0 THEN
    FOREACH v_student_id IN ARRAY p_student_ids
    LOOP
      INSERT INTO public.class_students (class_id, student_id, student_number)
      VALUES (p_class_id, v_student_id, v_student_number);
      
      v_student_number := v_student_number + 1;
    END LOOP;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_class_teachers(UUID, UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_class_students(UUID, UUID[], UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.update_class_teachers IS 'Securely updates class teachers with proper authorization checks. Bypasses RLS to allow authorized users to manage all teachers in a class.';
COMMENT ON FUNCTION public.update_class_students IS 'Securely updates class students with proper authorization checks. Bypasses RLS to allow authorized users to manage all students in a class.';
