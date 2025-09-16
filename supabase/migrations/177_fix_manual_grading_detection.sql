-- Migration: Fix Manual Grading Detection
-- Description: Fix the broken check_standalone_quiz_manual_grading_required function and update existing attempts
-- Date: 2025-01-15

-- First, drop the existing function to allow parameter name change
DROP FUNCTION IF EXISTS check_standalone_quiz_manual_grading_required(UUID);

-- Fix the check function with proper parameter qualification
CREATE OR REPLACE FUNCTION check_standalone_quiz_manual_grading_required(input_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM standalone_quiz_questions 
    WHERE standalone_quiz_questions.quiz_id = input_quiz_id 
    AND question_type = 'text_answer'
  );
END;
$$;

-- Update the trigger function to use the corrected check function
CREATE OR REPLACE FUNCTION update_standalone_quiz_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the quiz has text answer questions
  IF check_standalone_quiz_manual_grading_required(NEW.quiz_id) THEN
    NEW.manual_grading_required = TRUE;
    NEW.manual_grading_completed = FALSE;
    -- For text answer questions, we can't auto-calculate score, so set it to NULL initially
    -- The score will be calculated after manual grading is completed
  ELSE
    NEW.manual_grading_required = FALSE;
    NEW.manual_grading_completed = TRUE;
    -- For non-text questions, score is calculated automatically
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now let's fix all existing attempts that should have manual grading required
-- First, let's identify which attempts need to be updated
UPDATE standalone_quiz_attempts 
SET 
  manual_grading_required = TRUE,
  manual_grading_completed = FALSE,
  score = NULL  -- Reset score since it needs manual grading
WHERE quiz_id IN (
  SELECT DISTINCT quiz_id 
  FROM standalone_quiz_questions 
  WHERE question_type = 'text_answer'
)
AND manual_grading_required = FALSE;

-- Let's also create a function to manually trigger the grading status update for existing attempts
CREATE OR REPLACE FUNCTION fix_existing_manual_grading_status()
RETURNS TABLE (
  attempt_id UUID,
  quiz_id UUID,
  updated_manual_grading_required BOOLEAN,
  updated_manual_grading_completed BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_record RECORD;
BEGIN
  -- Loop through all attempts and update their manual grading status
  FOR attempt_record IN 
    SELECT sqa.id, sqa.quiz_id
    FROM standalone_quiz_attempts sqa
  LOOP
    -- Check if this quiz has text answer questions
    IF check_standalone_quiz_manual_grading_required(attempt_record.quiz_id) THEN
      -- Update the attempt to require manual grading
      UPDATE standalone_quiz_attempts 
      SET 
        manual_grading_required = TRUE,
        manual_grading_completed = FALSE,
        score = NULL
      WHERE id = attempt_record.id;
      
      -- Return the updated record
      RETURN QUERY SELECT 
        attempt_record.id,
        attempt_record.quiz_id,
        TRUE as updated_manual_grading_required,
        FALSE as updated_manual_grading_completed;
    ELSE
      -- Update the attempt to not require manual grading
      UPDATE standalone_quiz_attempts 
      SET 
        manual_grading_required = FALSE,
        manual_grading_completed = TRUE
      WHERE id = attempt_record.id;
      
      -- Return the updated record
      RETURN QUERY SELECT 
        attempt_record.id,
        attempt_record.quiz_id,
        FALSE as updated_manual_grading_required,
        TRUE as updated_manual_grading_completed;
    END IF;
  END LOOP;
END;
$$;

-- Execute the fix function to update all existing attempts
SELECT * FROM fix_existing_manual_grading_status();

-- Drop the temporary fix function
DROP FUNCTION fix_existing_manual_grading_status();
