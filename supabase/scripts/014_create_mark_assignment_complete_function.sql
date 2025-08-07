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
BEGIN
  -- Check if the calling user is a teacher for the specified course
  SELECT EXISTS (
    SELECT 1
    FROM public.course_members
    WHERE course_id = p_course_id
      AND user_id = p_teacher_id
      AND role = 'teacher'
  ) INTO is_authorized;

  IF is_authorized THEN
    -- If the teacher is authorized, upsert the progress for the student
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
    -- If the user is not a teacher for the course, raise an exception
    RAISE EXCEPTION 'User is not an authorized teacher for this course';
  END IF;
END;
$$;
