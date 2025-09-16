-- Fix ambiguous attempt_id reference in complete_standalone_quiz_manual_grading function

DROP FUNCTION IF EXISTS complete_standalone_quiz_manual_grading(UUID, UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION complete_standalone_quiz_manual_grading(
  input_attempt_id UUID,
  input_teacher_id UUID,
  grades_data JSONB DEFAULT '[]'::jsonb,
  overall_feedback TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  grade_item JSONB;
  total_score NUMERIC := 0;
  total_questions INTEGER := 0;
  text_answer_questions INTEGER := 0;
  auto_graded_score NUMERIC := 0;
  final_score NUMERIC;
  attempt_quiz_id UUID;
BEGIN
  -- Get the attempt details and quiz_id
  SELECT 
    sqa.quiz_id,
    COUNT(sqq.id) as total_questions_count,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_count
  INTO 
    attempt_quiz_id,
    total_questions,
    text_answer_questions
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
  WHERE sqa.id = input_attempt_id
  GROUP BY sqa.quiz_id;

  -- Calculate score from auto-graded questions (non-text answers)
  IF total_questions > text_answer_questions THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN (sqa.results->>sqq.id::text)::jsonb->>'is_correct' = 'true' 
        THEN sqq.points 
        ELSE 0 
      END
    ), 0)
    INTO auto_graded_score
    FROM standalone_quiz_attempts sqa
    JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
    WHERE sqa.id = input_attempt_id 
    AND sqq.question_type != 'text_answer';
  END IF;

  -- Process individual text answer grades
  FOR grade_item IN SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    -- Insert or update individual question grades
    INSERT INTO standalone_quiz_text_answer_grades (
      attempt_id,
      question_id,
      grade,
      feedback,
      graded_by,
      graded_at
    ) VALUES (
      input_attempt_id,
      (grade_item->>'question_id')::UUID,
      (grade_item->>'grade')::NUMERIC,
      grade_item->>'feedback',
      input_teacher_id,
      NOW()
    )
    ON CONFLICT (attempt_id, question_id) 
    DO UPDATE SET
      grade = EXCLUDED.grade,
      feedback = EXCLUDED.feedback,
      graded_by = EXCLUDED.graded_by,
      graded_at = EXCLUDED.graded_at,
      updated_at = NOW();

    -- Add to total score
    total_score := total_score + (grade_item->>'grade')::NUMERIC;
  END LOOP;

  -- Calculate final score percentage
  IF total_questions > 0 THEN
    final_score := ((auto_graded_score + total_score) / (SELECT SUM(points) FROM standalone_quiz_questions WHERE quiz_id = attempt_quiz_id)) * 100;
  ELSE
    final_score := 0;
  END IF;

  -- Update the attempt with final score and mark as completed
  UPDATE standalone_quiz_attempts 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_score = final_score,
    manual_grading_feedback = overall_feedback,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = input_teacher_id,
    score = final_score
  WHERE id = input_attempt_id;
END;
$$;
