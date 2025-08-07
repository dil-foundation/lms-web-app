DROP FUNCTION IF EXISTS public.get_course_performance_data_admin();

CREATE OR REPLACE FUNCTION public.get_course_performance_data_admin()
RETURNS TABLE(
    course_title TEXT,
    enrollments INTEGER,
    completion_rate INTEGER,
    avg_rating NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT
      c.id,
      c.title AS course_title,
      (SELECT COUNT(DISTINCT cm.user_id) FROM public.course_members cm WHERE cm.course_id = c.id AND cm.role = 'student') AS enrollments,
      (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.course_id = c.id AND ucp.status = 'completed') AS completed_students
    FROM public.courses c
    WHERE c.status = 'Published'
  )
  SELECT
    cs.course_title,
    cs.enrollments::INTEGER,
    CASE
      WHEN cs.enrollments > 0 THEN
        ROUND((cs.completed_students::DECIMAL / cs.enrollments) * 100)::INTEGER
      ELSE 0
    END AS completion_rate,
    4.5 AS avg_rating -- Placeholder
  FROM course_stats cs
  WHERE cs.enrollments > 0
  ORDER BY cs.enrollments DESC
  LIMIT 5;
END;
$$;