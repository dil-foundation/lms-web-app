-- Fix the trigger that's preventing manual_grading_completed from being set to true
-- The issue is that the trigger runs on UPDATE and resets manual_grading_completed to FALSE

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_update_quiz_grading_status ON quiz_submissions;

-- Update the trigger function to not override manual_grading_completed when it's already set
CREATE OR REPLACE FUNCTION update_quiz_submission_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set manual grading status if it hasn't been manually set yet
  -- This prevents the trigger from overriding manual grading completion
  IF NEW.manual_grading_completed IS NULL OR (NEW.manual_grading_completed = FALSE AND NEW.manual_grading_required IS NULL) THEN
    -- Check if the quiz has text answer questions
    IF check_quiz_manual_grading_required(NEW.lesson_content_id) THEN
      NEW.manual_grading_required = TRUE;
      NEW.manual_grading_completed = FALSE;
      -- For text answer questions, we can't auto-calculate score, so set it to NULL
      IF NEW.score IS NULL THEN
        NEW.score = NULL;
      END IF;
    ELSE
      NEW.manual_grading_required = FALSE;
      NEW.manual_grading_completed = TRUE;
      -- For non-text questions, score is calculated automatically
      -- If score is still null, set it to 0 as a fallback
      IF NEW.score IS NULL THEN
        NEW.score = 0;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_update_quiz_grading_status
  BEFORE INSERT OR UPDATE ON quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_submission_grading_status();

-- Also update the complete_manual_grading function to be more explicit
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
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz submission with id % not found', submission_id;
  END IF;
END;
$$;

-- Fix existing submissions that have manual grading data but incorrect manual_grading_completed status
UPDATE quiz_submissions 
SET manual_grading_completed = TRUE
WHERE manual_grading_score IS NOT NULL 
  AND manual_grading_completed_at IS NOT NULL 
  AND manual_grading_completed_by IS NOT NULL 
  AND manual_grading_completed = FALSE;
