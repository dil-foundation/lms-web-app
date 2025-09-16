-- Fix ambiguous attempt_id reference in get_standalone_quiz_text_answers_for_grading function

DROP FUNCTION IF EXISTS get_standalone_quiz_text_answers_for_grading(UUID);

CREATE OR REPLACE FUNCTION get_standalone_quiz_text_answers_for_grading(input_attempt_id UUID)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  question_position INTEGER,
  question_points NUMERIC,
  student_answer TEXT,
  current_grade NUMERIC,
  current_feedback TEXT,
  graded_by TEXT,
  graded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqq.id as question_id,
    sqq.question_text,
    sqq.position as question_position,
    sqq.points as question_points,
    (sqa.answers->>sqq.id::text)::jsonb->>'textAnswer' as student_answer,
    sqtag.grade as current_grade,
    sqtag.feedback as current_feedback,
    p.first_name || ' ' || p.last_name as graded_by,
    sqtag.graded_at
  FROM standalone_quiz_questions sqq
  JOIN standalone_quiz_attempts sqa ON sqa.id = input_attempt_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.question_id = sqq.id AND sqtag.attempt_id = input_attempt_id
  LEFT JOIN profiles p ON p.id = sqtag.graded_by
  WHERE sqq.quiz_id = (SELECT quiz_id FROM standalone_quiz_attempts WHERE id = input_attempt_id)
    AND sqq.question_type = 'text_answer'
  ORDER BY sqq.position ASC;
END;
$$;
