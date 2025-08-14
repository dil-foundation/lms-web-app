-- Fix quiz_submissions table to allow null scores for text answer questions
-- This allows quizzes with text answer questions to be submitted without an immediate score

-- First, update existing submissions that might have null scores to have a default value
UPDATE quiz_submissions 
SET score = 0 
WHERE score IS NULL;

-- Now alter the table to allow null scores
ALTER TABLE quiz_submissions 
ALTER COLUMN score DROP NOT NULL;

-- Add a comment to explain why score can be null
COMMENT ON COLUMN quiz_submissions.score IS 'Score for the quiz. Can be null for text answer questions that require manual grading.';

-- Update the trigger function to handle null scores properly
CREATE OR REPLACE FUNCTION update_quiz_submission_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the quiz has text answer questions
  IF check_quiz_manual_grading_required(NEW.lesson_content_id) THEN
    NEW.manual_grading_required = TRUE;
    NEW.manual_grading_completed = FALSE;
    -- For text answer questions, we can't auto-calculate score, so set it to NULL
    NEW.score = NULL;
  ELSE
    NEW.manual_grading_required = FALSE;
    NEW.manual_grading_completed = TRUE;
    -- For non-text questions, score is calculated automatically
    -- If score is still null, set it to 0 as a fallback
    IF NEW.score IS NULL THEN
      NEW.score = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the complete_manual_grading function to handle null scores
CREATE OR REPLACE FUNCTION complete_manual_grading(
  submission_id UUID,
  teacher_id UUID,
  manual_score NUMERIC(5,2),
  manual_feedback TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_score = manual_score,
    manual_grading_feedback = manual_feedback,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id,
    score = manual_score  -- Update the main score field
  WHERE id = submission_id;
END;
$$;
