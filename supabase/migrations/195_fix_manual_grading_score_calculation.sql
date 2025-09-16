-- Fix manual grading score calculation
-- The issue: grade is a percentage (0-100) but was being added directly to total_score
-- Solution: Calculate actual points earned based on question points and grade percentage

DROP FUNCTION IF EXISTS complete_standalone_quiz_manual_grading(UUID, UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION complete_standalone_quiz_manual_grading(
  input_attempt_id UUID,
  input_teacher_id UUID,
  grades_data JSONB,
  overall_feedback TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_quiz_id UUID;
  total_questions INTEGER;
  text_answer_questions INTEGER;
  auto_graded_score NUMERIC := 0;
  total_score NUMERIC := 0;
  final_score NUMERIC := 0;
  grade_item JSONB;
  question_points NUMERIC;
  grade_percentage NUMERIC;
  earned_points NUMERIC;
  update_count INTEGER;
BEGIN
  -- Debug: Log function start
  RAISE NOTICE 'Starting manual grading completion for attempt: %', input_attempt_id;
  
  -- First get the quiz ID from the attempt
  SELECT quiz_id INTO attempt_quiz_id
  FROM standalone_quiz_attempts
  WHERE id = input_attempt_id;
  
  -- Then get question counts for this quiz
  SELECT 
    COUNT(*) as total_questions,
    COUNT(CASE WHEN question_type = 'text_answer' THEN 1 END) as text_answer_questions
  INTO 
    total_questions,
    text_answer_questions
  FROM standalone_quiz_questions
  WHERE quiz_id = attempt_quiz_id;

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
    -- Get question points for this text answer question
    SELECT points INTO question_points
    FROM standalone_quiz_questions
    WHERE id = (grade_item->>'question_id')::UUID;
    
    -- The grade is already in points (0 to question_points), not percentage
    earned_points := (grade_item->>'grade')::NUMERIC;
    
    -- Add to total score
    total_score := total_score + earned_points;
    
    -- Debug: Log each grade calculation
    RAISE NOTICE 'Question %: grade=%, question_points=%, earned_points=%', 
      grade_item->>'question_id', earned_points, question_points, earned_points;
    
    -- Insert/update the grade record
    -- Convert points to percentage for storage: (earned_points / question_points) * 100
    INSERT INTO standalone_quiz_text_answer_grades (
      attempt_id, question_id, grade, feedback, graded_by, graded_at
    ) VALUES (
      input_attempt_id,
      (grade_item->>'question_id')::UUID,
      (earned_points / question_points) * 100,
      COALESCE(grade_item->>'feedback', ''),
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
  END LOOP;

  -- Debug: Log total score
  RAISE NOTICE 'Total manual grading score (points): %', total_score;

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

  -- Update the results array with correct earned_points for text answer questions
  -- This ensures the frontend displays correct/incorrect counts properly
  DECLARE
    updated_results JSONB;
    result_item JSONB;
    grade_item JSONB;
    question_points NUMERIC;
    grade_percentage NUMERIC;
    earned_points NUMERIC;
    result_index INTEGER;
  BEGIN
    -- Get current results
    SELECT results INTO updated_results
    FROM standalone_quiz_attempts
    WHERE id = input_attempt_id;
    
    -- Update each result item
    FOR result_item IN SELECT * FROM jsonb_array_elements(updated_results)
    LOOP
      -- Check if this is a text answer question that was graded
      FOR grade_item IN SELECT * FROM jsonb_array_elements(grades_data)
      LOOP
        IF (result_item->>'question_id')::UUID = (grade_item->>'question_id')::UUID THEN
          -- Get question points
          SELECT points INTO question_points
          FROM standalone_quiz_questions
          WHERE id = (grade_item->>'question_id')::UUID;
          
          -- The grade is already in points (0 to question_points), not percentage
          -- So we can use it directly as earned_points
          earned_points := (grade_item->>'grade')::NUMERIC;
          
          -- Find the index of this result item
          SELECT ordinality - 1 INTO result_index
          FROM jsonb_array_elements(updated_results) WITH ORDINALITY
          WHERE value = result_item;
          
          -- Update the earned_points for this question
          updated_results := jsonb_set(
            updated_results,
            ARRAY[result_index::text, 'earned_points'],
            to_jsonb(earned_points)
          );
          
          -- Debug: Log the update
          RAISE NOTICE 'Updated earned_points for question %: % (grade: % points out of % total points)', 
            grade_item->>'question_id', earned_points, earned_points, question_points;
        END IF;
      END LOOP;
    END LOOP;
    
    -- Update the results array
    UPDATE standalone_quiz_attempts 
    SET results = updated_results
    WHERE id = input_attempt_id;
    
    RAISE NOTICE 'Updated results array with correct earned_points';
  END;

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
      RAISE EXCEPTION 'Error updating attempt %: Failed to update attempt % - no rows were updated. Attempt exists but UPDATE failed. Check constraints or triggers.', 
        input_attempt_id, input_attempt_id;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error updating attempt %: %', input_attempt_id, SQLERRM;
  END;

  -- Debug: Log successful completion
  RAISE NOTICE 'Manual grading completed successfully for attempt: %', input_attempt_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION complete_standalone_quiz_manual_grading(UUID, UUID, JSONB, TEXT) IS 
'Completes manual grading for standalone quiz attempts. Calculates correct points earned based on grade percentage and question points.';
