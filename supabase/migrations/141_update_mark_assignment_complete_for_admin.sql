-- Migration: Update mark_assignment_complete function to allow admin access
-- Description: Allows admins to mark assignments as complete in addition to teachers
-- Date: 2024-12-01

CREATE OR REPLACE FUNCTION public.mark_assignment_complete(
  p_student_id uuid,
  p_course_id uuid,
  p_lesson_id uuid,
  p_content_item_id uuid,
  p_teacher_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_authorized BOOLEAN;
  user_role TEXT;
BEGIN
  -- First check if the user is an admin
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = p_teacher_id;
  
  -- If user is admin, they are always authorized
  IF user_role = 'admin' THEN
    is_authorized := TRUE;
  ELSE
    -- Check if the calling user is a teacher for the specified course
    SELECT EXISTS (
      SELECT 1
      FROM public.course_members
      WHERE course_id = p_course_id
        AND user_id = p_teacher_id
        AND role = 'teacher'
    ) INTO is_authorized;
  END IF;

  IF is_authorized THEN
    -- If the user is authorized (admin or teacher), upsert the progress for the student
    INSERT INTO public.user_content_item_progress (
        user_id,
        course_id,
        lesson_id,
        lesson_content_id,
        status,
        completed_at
    )
    VALUES (
        p_student_id,
        p_course_id,
        p_lesson_id,
        p_content_item_id,
        'completed',
        now()
    )
    ON CONFLICT (user_id, lesson_content_id) DO UPDATE SET
        status = 'completed',
        completed_at = now();
  ELSE
    -- If the user is not authorized, raise an exception
    RAISE EXCEPTION 'User is not an authorized teacher or admin for this course';
  END IF;
END;
$$;

-- Grant execute permission on the updated function
GRANT EXECUTE ON FUNCTION public.mark_assignment_complete(uuid, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_assignment_complete(uuid, uuid, uuid, uuid, uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.mark_assignment_complete(uuid, uuid, uuid, uuid, uuid) IS 
  'Mark assignment as complete - allows both teachers (for their courses) and admins (for any course)';
