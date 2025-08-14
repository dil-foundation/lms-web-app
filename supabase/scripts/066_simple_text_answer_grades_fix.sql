-- Simple and effective fix for the duplicate key constraint issue
-- Uses UPSERT (INSERT ... ON CONFLICT) to handle duplicates gracefully

CREATE OR REPLACE FUNCTION save_text_answer_grades(
  submission_id UUID,
  teacher_id UUID,
  grades_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  grade_record RECORD;
BEGIN
  -- Insert or update grades using UPSERT
  -- This handles duplicates automatically without needing to delete first
  FOR grade_record IN 
    SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    INSERT INTO text_answer_grades (
      quiz_submission_id,
      question_id,
      grade,
      feedback,
      graded_by
    ) VALUES (
      submission_id,
      (grade_record.value->>'question_id')::UUID,
      (grade_record.value->>'grade')::NUMERIC(5,2),
      grade_record.value->>'feedback',
      teacher_id
    )
    ON CONFLICT (quiz_submission_id, question_id) 
    DO UPDATE SET
      grade = EXCLUDED.grade,
      feedback = EXCLUDED.feedback,
      graded_by = EXCLUDED.graded_by,
      graded_at = NOW();
  END LOOP;
  
  -- Update the main quiz submission with overall score and completion status
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id
  WHERE id = submission_id;
END;
$$;
