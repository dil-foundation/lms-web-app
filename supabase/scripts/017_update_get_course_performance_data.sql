DROP FUNCTION IF EXISTS public.get_course_performance_data(uuid);

CREATE OR REPLACE FUNCTION public.get_course_performance_data(teacher_id uuid)
RETURNS TABLE(course_title text, enrolled_students integer, completed_students integer, in_progress_students integer, avg_rating numeric)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    -- Find all courses taught by the given teacher
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  course_stats AS (
    SELECT
      c.id,
      c.title AS course_title,
      -- Count all enrolled students for each course
      COUNT(DISTINCT cm_student.user_id)::INTEGER AS enrolled_students
    FROM teacher_courses tc
    JOIN courses c ON tc.course_id = c.id
    LEFT JOIN course_members cm_student ON c.id = cm_student.course_id AND cm_student.role = 'student'
    WHERE c.status = 'Published'
    GROUP BY c.id, c.title
  ),
  completion_stats AS (
    -- Separately, count students who have completed at least one item in any of the teacher's courses
    SELECT
      ucip.course_id,
      COUNT(DISTINCT ucip.user_id)::INTEGER as completed_students
    FROM user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses) AND ucip.completed_at IS NOT NULL
    GROUP BY ucip.course_id
  )
  SELECT
    cs.course_title,
    cs.enrolled_students,
    COALESCE(cp.completed_students, 0)::INTEGER,
    -- Calculate in-progress students
    GREATEST(0, cs.enrolled_students - COALESCE(cp.completed_students, 0))::INTEGER AS in_progress_students,
    -- Using a placeholder for average rating as in the original function
    4.5::NUMERIC AS avg_rating
  FROM course_stats cs
  LEFT JOIN completion_stats cp ON cs.id = cp.course_id
  WHERE cs.enrolled_students > 0

  UNION ALL

  -- If the teacher has no active courses with students, return a placeholder row
  SELECT
    'No Active Courses'::TEXT,
    0::INTEGER,
    0::INTEGER,
    0::INTEGER,
    0.0::NUMERIC
  WHERE NOT EXISTS (
    SELECT 1 FROM course_stats cs WHERE cs.enrolled_students > 0
  )

  ORDER BY enrolled_students DESC
  LIMIT 5;
END;
$$;
