
DECLARE
  is_admin_user BOOLEAN;
  target_published_id uuid;
BEGIN
  -- Verify that the user performing this action is an admin.
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO is_admin_user;
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only admins can approve course submissions.';
  END IF;

  -- Verify the course is actually under review.
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = course_id_in AND status = 'Under Review') THEN
    RAISE EXCEPTION 'Course is not under review.';
  END IF;

  -- Check if this draft is an update to an existing published course.
  SELECT published_course_id INTO target_published_id FROM public.courses WHERE id = course_id_in;

  IF target_published_id IS NULL THEN
    -- This is a new course. Mark it as 'Published'.
    UPDATE public.courses
    SET
      status = 'Published',
      review_feedback = NULL
    WHERE id = course_id_in;
  ELSE
    -- This is an update to an existing course. Use the 'publish_draft' function.
    PERFORM publish_draft(course_id_in, target_published_id);
  END IF;
END;
