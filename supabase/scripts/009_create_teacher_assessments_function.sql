CREATE OR REPLACE FUNCTION get_teacher_assessments_data(
  teacher_id UUID,
  search_query TEXT DEFAULT '',
  course_filter_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    course TEXT,
    course_id UUID,
    type TEXT,
    due_date TIMESTAMPTZ,
    submissions BIGINT,
    graded BIGINT,
    avg_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT c.id, c.title
    FROM courses c
    JOIN course_members cm ON c.id = cm.course_id
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
      AND (course_filter_id IS NULL OR c.id = course_filter_id)
  ),
  assessments AS (
    SELECT
      clc.id,
      clc.title,
      tc.title AS course,
      tc.id AS course_id,
      clc.content_type AS type,
      cl.due_date
    FROM course_lesson_content clc
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.id
    WHERE clc.content_type IN ('assignment', 'quiz')
      AND (search_query = '' OR clc.title ILIKE '%' || search_query || '%')
  ),
  quiz_stats AS (
    SELECT
      a.id,
      COUNT(qs.id) AS submissions,
      COUNT(qs.id) AS graded,
      COALESCE(AVG(qs.score), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN quiz_submissions qs ON a.id = qs.lesson_content_id
    WHERE a.type = 'quiz'
    GROUP BY a.id
  ),
  assignment_stats AS (
    SELECT
      a.id,
      COUNT(asub.id) AS submissions,
      COUNT(CASE WHEN asub.status = 'graded' THEN 1 END) AS graded,
      COALESCE(AVG(asub.grade), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN assignment_submissions asub ON a.id = asub.assignment_id
    WHERE a.type = 'assignment'
    GROUP BY a.id
  )
  SELECT
    a.id,
    a.title,
    a.course,
    a.course_id,
    a.type,
    a.due_date,
    COALESCE(qs.submissions, assignments.submissions, 0) AS submissions,
    COALESCE(qs.graded, assignments.graded, 0) AS graded,
    COALESCE(qs.avg_score, assignments.avg_score, 0) AS avg_score
  FROM assessments a
  LEFT JOIN quiz_stats qs ON a.id = qs.id
  LEFT JOIN assignment_stats assignments ON a.id = assignments.id;
END;
$$;
