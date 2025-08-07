DROP FUNCTION IF EXISTS public.get_course_analytics_data();

CREATE OR REPLACE FUNCTION public.get_course_analytics_data()
RETURNS TABLE(
    course_title TEXT,
    enrolled_students INTEGER,
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
      (SELECT COUNT(DISTINCT cm.user_id) FROM public.course_members cm WHERE cm.course_id = c.id AND cm.role = 'student') AS enrolled_students,
      (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.course_id = c.id AND ucp.status = 'completed') AS completed_students
    FROM public.courses c
    WHERE c.status = 'Published'
  )
  SELECT
    cs.course_title,
    cs.enrolled_students::INTEGER,
    CASE
      WHEN cs.enrolled_students > 0 THEN
        ROUND((cs.completed_students::DECIMAL / cs.enrolled_students) * 100)::INTEGER
      ELSE 0
    END AS completion_rate,
    4.5 AS avg_rating
  FROM course_stats cs
  WHERE cs.enrolled_students > 0
  ORDER BY cs.enrolled_students DESC
  LIMIT 5;
END;
$$;