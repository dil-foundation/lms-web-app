-- Fix manual grading logic for math expression questions
-- The current logic flags ALL math expression questions with math_allow_drawing = true for manual grading
-- But it should only flag them if the student actually provided drawing content
-- Since we can't check the actual submission content in this function, we need to modify the approach

-- Update the function to be more conservative about manual grading
-- Only flag text_answer questions for manual grading by default
-- Math expression questions will be handled by the frontend logic
CREATE OR REPLACE FUNCTION check_quiz_manual_grading_required(quiz_content_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only flag text_answer questions for manual grading
  -- Math expression questions will be handled by frontend logic based on actual drawing content
  RETURN EXISTS (
    SELECT 1 
    FROM quiz_questions 
    WHERE lesson_content_id = quiz_content_id 
    AND question_type = 'text_answer'
  );
END;
$$;

-- Update the trigger function to be more conservative
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
      -- For non-text questions, let the frontend determine if manual grading is needed
      -- Don't automatically set manual_grading_required = FALSE here
      -- The frontend will set the appropriate values based on actual content
      IF NEW.manual_grading_required IS NULL THEN
        NEW.manual_grading_required = FALSE;
        NEW.manual_grading_completed = TRUE;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION check_quiz_manual_grading_required(UUID) IS 'Updated to only flag text_answer questions for manual grading. Math expression questions are handled by frontend logic based on actual drawing content.';
COMMENT ON FUNCTION update_quiz_submission_grading_status() IS 'Updated to be more conservative about setting manual grading status, allowing frontend to determine math expression grading needs.';
