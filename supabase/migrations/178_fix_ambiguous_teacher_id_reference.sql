-- Migration: Fix Ambiguous teacher_id Reference
-- Description: Fix ambiguous teacher_id reference in get_standalone_quiz_attempts_requiring_grading function
-- Date: 2025-01-15

-- First, drop the existing function to allow parameter name change
DROP FUNCTION IF EXISTS get_standalone_quiz_attempts_requiring_grading(UUID);

-- Fix the ambiguous teacher_id reference in the get_standalone_quiz_attempts_requiring_grading function
CREATE OR REPLACE FUNCTION get_standalone_quiz_attempts_requiring_grading(input_teacher_id UUID DEFAULT NULL)
RETURNS TABLE (
  attempt_id UUID,
  quiz_id UUID,
  quiz_title TEXT,
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  attempt_number INTEGER,
  submitted_at TIMESTAMPTZ,
  total_questions BIGINT,
  text_answer_questions BIGINT,
  auto_graded_score NUMERIC,
  pending_grades BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id as attempt_id,
    sqa.quiz_id,
    sq.title as quiz_title,
    sqa.user_id as student_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.email as student_email,
    sqa.attempt_number,
    sqa.submitted_at,
    COUNT(sqq.id) as total_questions,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_questions,
    COALESCE(SUM(
      CASE 
        WHEN sqq.question_type != 'text_answer' 
        AND (sqa.results->>sqq.id::text)::jsonb->>'is_correct' = 'true'
        THEN sqq.points 
        ELSE 0 
      END
    ), 0) as auto_graded_score,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) - 
    COUNT(sqtag.id) as pending_grades
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
  JOIN profiles p ON p.id = sqa.user_id
  JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.attempt_id = sqa.id AND sqtag.question_id = sqq.id
  WHERE sqa.manual_grading_required = TRUE 
  AND sqa.manual_grading_completed = FALSE
  AND (input_teacher_id IS NULL OR sq.author_id = input_teacher_id)  -- Fixed: qualified with input_teacher_id
  GROUP BY sqa.id, sqa.quiz_id, sq.title, sqa.user_id, p.first_name, p.last_name, p.email, sqa.attempt_number, sqa.submitted_at
  ORDER BY sqa.submitted_at ASC;
END;
$$;
