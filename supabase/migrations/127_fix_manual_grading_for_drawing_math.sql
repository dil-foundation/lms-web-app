-- Fix manual grading detection to include drawing math expressions
-- This ensures that quizzes with drawing math expressions are properly flagged for manual grading

-- Update the function to check for both text_answer and drawing math expressions
CREATE OR REPLACE FUNCTION check_quiz_manual_grading_required(quiz_content_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM quiz_questions 
    WHERE lesson_content_id = quiz_content_id 
    AND (
      question_type = 'text_answer' 
      OR (question_type = 'math_expression' AND math_allow_drawing = true)
    )
  );
END;
$$;

-- Update the trigger function to handle drawing math expressions properly
CREATE OR REPLACE FUNCTION update_quiz_submission_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the quiz has questions that require manual grading
  IF check_quiz_manual_grading_required(NEW.lesson_content_id) THEN
    NEW.manual_grading_required = TRUE;
    NEW.manual_grading_completed = FALSE;
    -- For questions requiring manual grading, we can't auto-calculate score, so set it to NULL
    NEW.score = NULL;
  ELSE
    NEW.manual_grading_required = FALSE;
    NEW.manual_grading_completed = TRUE;
    -- For non-manual questions, score is calculated automatically
    -- If score is still null, set it to 0 as a fallback
    IF NEW.score IS NULL THEN
      NEW.score = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
