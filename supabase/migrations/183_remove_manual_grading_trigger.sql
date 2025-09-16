-- Migration: Remove Manual Grading Trigger
-- Description: Remove the trigger and rely on explicit frontend logic for manual grading flags
-- Date: 2025-01-15

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_update_standalone_quiz_grading_status ON public.standalone_quiz_attempts;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS update_standalone_quiz_grading_status();

-- Keep the check function as it might be useful for other purposes
-- (We'll keep check_standalone_quiz_manual_grading_required function)

-- Create a simple function to manually set manual grading flags if needed
CREATE OR REPLACE FUNCTION set_manual_grading_flags(attempt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  quiz_has_text_questions BOOLEAN;
BEGIN
  -- Check if the quiz has text answer questions
  SELECT check_standalone_quiz_manual_grading_required(
    (SELECT quiz_id FROM standalone_quiz_attempts WHERE id = attempt_id)
  ) INTO quiz_has_text_questions;
  
  -- Update the attempt with correct manual grading flags
  UPDATE standalone_quiz_attempts 
  SET 
    manual_grading_required = quiz_has_text_questions,
    manual_grading_completed = NOT quiz_has_text_questions,
    score = CASE 
      WHEN quiz_has_text_questions THEN NULL 
      ELSE score 
    END
  WHERE id = attempt_id;
  
  -- Log the action
  RAISE NOTICE 'Updated manual grading flags for attempt %: required=%, completed=%', 
    attempt_id, quiz_has_text_questions, NOT quiz_has_text_questions;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_manual_grading_flags(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_manual_grading_flags(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION set_manual_grading_flags(UUID) IS 
  'Manually set manual grading flags for a quiz attempt based on quiz question types';
