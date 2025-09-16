-- Migration: Extend Admin Assessments with Standalone Quizzes
-- Description: Extend get_admin_assessments_data to include standalone quizzes requiring manual grading
-- Date: 2025-01-15

-- First, drop the existing function to allow return type changes
DROP FUNCTION IF EXISTS get_admin_assessments_data(TEXT, UUID);

-- Create an enhanced version of get_admin_assessments_data that includes standalone quizzes
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
    avg_score NUMERIC,
    is_standalone BOOLEAN,
    author_id UUID
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
      clc.due_date,
      FALSE as is_standalone,
      NULL::UUID as author_id
    FROM course_lesson_content clc
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN all_courses ac ON cs.course_id = ac.id
    WHERE clc.content_type IN ('assignment', 'quiz')
      AND (search_query = '' OR clc.title ILIKE '%' || search_query || '%')
  ),
  standalone_quizzes AS (
    SELECT
      sq.id,
      sq.title,
      'Standalone Quiz'::TEXT AS course,
      NULL::UUID AS course_id,
      'quiz'::TEXT AS type,
      NULL::TIMESTAMPTZ AS due_date,
      TRUE as is_standalone,
      sq.author_id
    FROM standalone_quizzes sq
    WHERE sq.status = 'published'
      AND (search_query = '' OR sq.title ILIKE '%' || search_query || '%')
      AND EXISTS (
        SELECT 1 
        FROM standalone_quiz_attempts sqa
        WHERE sqa.quiz_id = sq.id 
        AND sqa.manual_grading_required = TRUE 
        AND sqa.manual_grading_completed = FALSE
      )
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
  ),
  standalone_quiz_stats AS (
    SELECT
      sq.id,
      COUNT(sqa.id) AS submissions,
      COUNT(CASE WHEN sqa.manual_grading_completed = TRUE THEN 1 END) AS graded,
      COALESCE(AVG(sqa.score), 0)::NUMERIC AS avg_score
    FROM standalone_quizzes sq
    JOIN standalone_quiz_attempts sqa ON sqa.quiz_id = sq.id
    GROUP BY sq.id
  ),
  all_assessments AS (
    SELECT * FROM assessments
    UNION ALL
    SELECT * FROM standalone_quizzes
  )
  SELECT
    a.id,
    a.title,
    a.course,
    a.course_id,
    a.type,
    a.due_date,
    COALESCE(qs.submissions, asub.submissions, sqs.submissions, 0) AS submissions,
    COALESCE(qs.graded, asub.graded, sqs.graded, 0) AS graded,
    COALESCE(qs.avg_score, asub.avg_score, sqs.avg_score, 0) AS avg_score,
    a.is_standalone,
    a.author_id
  FROM all_assessments a
  LEFT JOIN quiz_stats qs ON a.id = qs.id AND a.type = 'quiz' AND a.is_standalone = FALSE
  LEFT JOIN assignment_stats asub ON a.id = asub.id AND a.type = 'assignment'
  LEFT JOIN standalone_quiz_stats sqs ON a.id = sqs.id AND a.is_standalone = TRUE
  ORDER BY a.due_date DESC NULLS LAST, a.title;
END;
$$;

-- Grant execute permission on the updated function
GRANT EXECUTE ON FUNCTION get_admin_assessments_data(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_assessments_data(TEXT, UUID) TO service_role;

-- Update comment
COMMENT ON FUNCTION get_admin_assessments_data(TEXT, UUID) IS 
  'Get all assessments across all courses and standalone quizzes for admin view with statistics';
