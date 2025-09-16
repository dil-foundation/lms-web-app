-- Migration: Fix Manual Grading Trigger
-- Description: Ensure the trigger uses the correct check function and fix existing attempts
-- Date: 2025-01-15

-- First, ensure we have the correct check function (in case migration 177 wasn't applied)
DROP FUNCTION IF EXISTS check_standalone_quiz_manual_grading_required(UUID);

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

-- Ensure the trigger function is correct
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

-- Drop and recreate the trigger to ensure it uses the correct function
DROP TRIGGER IF EXISTS trigger_update_standalone_quiz_grading_status ON public.standalone_quiz_attempts;
CREATE TRIGGER trigger_update_standalone_quiz_grading_status
  BEFORE INSERT OR UPDATE ON public.standalone_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_quiz_grading_status();

-- Fix all existing attempts that should have manual grading required
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

-- Specifically fix the attempt mentioned in the user's query
UPDATE standalone_quiz_attempts 
SET 
  manual_grading_required = TRUE,
  manual_grading_completed = FALSE,
  score = NULL
WHERE id = '54f34cdc-6d50-4786-90b8-fb4a327705e1';
