-- Apply the admin assessments migration manually
-- This script creates the get_admin_assessments_data function

-- Create function to get all assessments for admin
CREATE OR REPLACE FUNCTION get_admin_assessments_data(
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_courses AS (
    SELECT c.id, c.title
    FROM courses c
    WHERE c.status = 'Published'
      AND (course_filter_id IS NULL OR c.id = course_filter_id)
  ),
  assessments AS (
    SELECT
      clc.id,
      clc.title,
      ac.title AS course,
      ac.id AS course_id,
      clc.content_type AS type,
      clc.due_date
    FROM course_lesson_content clc
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN all_courses ac ON cs.course_id = ac.id
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
    COALESCE(qs.submissions, asub.submissions, 0) AS submissions,
    COALESCE(qs.graded, asub.graded, 0) AS graded,
    COALESCE(qs.avg_score, asub.avg_score, 0) AS avg_score
  FROM assessments a
  LEFT JOIN quiz_stats qs ON a.id = qs.id AND a.type = 'quiz'
  LEFT JOIN assignment_stats asub ON a.id = asub.id AND a.type = 'assignment'
  ORDER BY a.due_date DESC NULLS LAST, a.title;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_admin_assessments_data(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_assessments_data(TEXT, UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_admin_assessments_data(TEXT, UUID) IS 
  'Get all assessments across all courses for admin view with statistics';
