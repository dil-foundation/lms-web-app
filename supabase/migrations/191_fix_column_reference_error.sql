-- Fix the column reference error in complete_standalone_quiz_manual_grading function
-- The error was: "column sq.quiz_id does not exist" - should be sqa.quiz_id

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
  update_count INTEGER;
  attempt_exists BOOLEAN := FALSE;
  teacher_exists BOOLEAN := FALSE;
  quiz_author_id UUID;
BEGIN
  -- Debug: Log the function call
  RAISE NOTICE 'Starting manual grading for attempt_id: %, teacher_id: %', input_attempt_id, input_teacher_id;
  
  -- First, verify the attempt exists and get quiz details
  SELECT 
    EXISTS(SELECT 1 FROM standalone_quiz_attempts WHERE id = input_attempt_id),
    sqa.quiz_id,  -- Fixed: was sq.quiz_id, now sqa.quiz_id
    sq.author_id
  INTO 
    attempt_exists,
    attempt_quiz_id,
    quiz_author_id
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
  WHERE sqa.id = input_attempt_id;
  
  IF NOT attempt_exists THEN
    RAISE EXCEPTION 'Attempt % does not exist in standalone_quiz_attempts table', input_attempt_id;
  END IF;
  
  RAISE NOTICE 'Attempt % exists, quiz_id: %, quiz_author_id: %', input_attempt_id, attempt_quiz_id, quiz_author_id;
  
  -- Verify the teacher exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = input_teacher_id
  ) INTO teacher_exists;
  
  IF NOT teacher_exists THEN
    RAISE EXCEPTION 'Teacher % does not exist in auth.users table', input_teacher_id;
  END IF;
  
  RAISE NOTICE 'Teacher % exists in auth.users', input_teacher_id;
  
  -- Get question counts
  SELECT 
    COUNT(sqq.id) as total_questions_count,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_count
  INTO 
    total_questions,
    text_answer_questions
  FROM standalone_quiz_questions sqq
  WHERE sqq.quiz_id = attempt_quiz_id;

  -- Debug: Log the question details
  RAISE NOTICE 'Question details - total_questions: %, text_answer_questions: %', 
    total_questions, text_answer_questions;

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

  -- Debug: Log auto-graded score
  RAISE NOTICE 'Auto-graded score: %', auto_graded_score;

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
    
    -- Debug: Log each grade
    RAISE NOTICE 'Processed grade for question %: % points', 
      grade_item->>'question_id', grade_item->>'grade';
  END LOOP;

  -- Debug: Log total score
  RAISE NOTICE 'Total manual grading score: %', total_score;

  -- Calculate final score percentage
  IF total_questions > 0 THEN
    final_score := ((auto_graded_score + total_score) / (SELECT SUM(points) FROM standalone_quiz_questions WHERE quiz_id = attempt_quiz_id)) * 100;
  ELSE
    final_score := 0;
  END IF;

  -- Debug: Log final score
  RAISE NOTICE 'Final calculated score: %', final_score;

  -- Debug: Log the exact UPDATE statement values
  RAISE NOTICE 'About to update attempt % with: manual_grading_completed=TRUE, manual_grading_score=%, score=%, manual_grading_completed_by=%', 
    input_attempt_id, final_score, final_score, input_teacher_id;

  -- Try the update with explicit error handling
  BEGIN
    UPDATE standalone_quiz_attempts 
    SET 
      manual_grading_completed = TRUE,
      manual_grading_score = final_score,
      manual_grading_feedback = overall_feedback,
      manual_grading_completed_at = NOW(),
      manual_grading_completed_by = input_teacher_id,
      score = final_score
    WHERE id = input_attempt_id;
    
    -- Get the number of rows updated
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    -- Debug: Log update result
    RAISE NOTICE 'Updated % rows for attempt_id: %', update_count, input_attempt_id;
    
    -- Verify the update
    IF update_count = 0 THEN
      RAISE EXCEPTION 'Failed to update attempt % - no rows were updated. Attempt exists but UPDATE failed. Check constraints or triggers.', input_attempt_id;
    END IF;
    
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Foreign key constraint violation when updating attempt %. Check if teacher_id % exists in auth.users. Error: %', input_attempt_id, input_teacher_id, SQLERRM;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error updating attempt %: %', input_attempt_id, SQLERRM;
  END;
  
  RAISE NOTICE 'Manual grading completed successfully for attempt_id: %', input_attempt_id;
END;
$$;
