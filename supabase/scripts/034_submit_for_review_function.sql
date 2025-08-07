CREATE OR REPLACE FUNCTION submit_for_review(course_id_in uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has permission (is author OR a teacher member)
  -- AND if the course is in a valid state for submission ('Draft' or 'Rejected').
  IF (
    (SELECT status FROM public.courses WHERE id = course_id_in) IN ('Draft', 'Rejected')
    AND
    (
      (SELECT author_id FROM public.courses WHERE id = course_id_in) = auth.uid()
      OR
      is_teacher_for_course(course_id_in) -- This uses the function we fixed previously
    )
  ) THEN
    -- This update will now bypass the RLS policy because of SECURITY DEFINER.
    UPDATE public.courses
    SET
      status = 'Under Review'
    WHERE id = course_id_in;
  ELSE
    -- The function will raise an error if the user does not have permission.
    RAISE EXCEPTION 'Course cannot be submitted for review. You might not have permission, or the course is not in a Draft or Rejected state.';
  END IF;
END;
$$;
