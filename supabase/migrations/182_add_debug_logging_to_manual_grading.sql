-- Migration: Add Debug Logging to Manual Grading
-- Description: Add debug logging to understand why new quiz attempts aren't being marked for manual grading
-- Date: 2025-01-15

-- Create a debug logging function
CREATE OR REPLACE FUNCTION log_debug_message(message TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log to PostgreSQL logs (visible in Supabase logs)
  RAISE NOTICE 'DEBUG: %', message;
END;
$$;

-- Update the check function with debug logging
CREATE OR REPLACE FUNCTION check_standalone_quiz_manual_grading_required(input_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  has_text_questions BOOLEAN;
  question_count INTEGER;
BEGIN
  -- Count total questions
  SELECT COUNT(*) INTO question_count
  FROM standalone_quiz_questions 
  WHERE standalone_quiz_questions.quiz_id = input_quiz_id;
  
  -- Check if has text answer questions
  SELECT EXISTS (
    SELECT 1 
    FROM standalone_quiz_questions 
    WHERE standalone_quiz_questions.quiz_id = input_quiz_id 
    AND question_type = 'text_answer'
  ) INTO has_text_questions;
  
  -- Log debug information
  PERFORM log_debug_message('Quiz ID: ' || input_quiz_id || 
    ', Total Questions: ' || question_count || 
    ', Has Text Questions: ' || has_text_questions);
  
  RETURN has_text_questions;
END;
$$;

-- Update the trigger function with debug logging
CREATE OR REPLACE FUNCTION update_standalone_quiz_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_text_questions BOOLEAN;
BEGIN
  -- Log trigger execution
  PERFORM log_debug_message('Trigger fired for attempt: ' || NEW.id || ', quiz: ' || NEW.quiz_id);
  
  -- Check if the quiz has text answer questions
  has_text_questions := check_standalone_quiz_manual_grading_required(NEW.quiz_id);
  
  IF has_text_questions THEN
    NEW.manual_grading_required = TRUE;
    NEW.manual_grading_completed = FALSE;
    PERFORM log_debug_message('Set manual_grading_required = TRUE for attempt: ' || NEW.id);
  ELSE
    NEW.manual_grading_required = FALSE;
    NEW.manual_grading_completed = TRUE;
    PERFORM log_debug_message('Set manual_grading_required = FALSE for attempt: ' || NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a function to test manual grading detection for a specific quiz
CREATE OR REPLACE FUNCTION test_manual_grading_detection(test_quiz_id UUID)
RETURNS TABLE (
  quiz_id UUID,
  total_questions BIGINT,
  text_answer_questions BIGINT,
  should_require_manual_grading BOOLEAN,
  function_result BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    test_quiz_id as quiz_id,
    COUNT(*) as total_questions,
    COUNT(CASE WHEN question_type = 'text_answer' THEN 1 END) as text_answer_questions,
    (COUNT(CASE WHEN question_type = 'text_answer' THEN 1 END) > 0) as should_require_manual_grading,
    check_standalone_quiz_manual_grading_required(test_quiz_id) as function_result
  FROM standalone_quiz_questions 
  WHERE standalone_quiz_questions.quiz_id = test_quiz_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_debug_message(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION test_manual_grading_detection(UUID) TO authenticated;
