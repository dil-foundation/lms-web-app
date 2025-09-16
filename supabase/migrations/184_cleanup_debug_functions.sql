-- Migration: Cleanup Debug Functions
-- Description: Remove trigger-related debug functions since we removed the trigger
-- Date: 2025-01-15

-- Keep the useful debug functions, remove the trigger-specific ones

-- Drop the trigger-specific debug function (no longer needed)
DROP FUNCTION IF EXISTS update_standalone_quiz_grading_status();

-- Keep the useful functions:
-- - log_debug_message() - useful for general debugging
-- - check_standalone_quiz_manual_grading_required() - useful for checking quiz types
-- - test_manual_grading_detection() - useful for testing
-- - set_manual_grading_flags() - useful for manual corrections

-- Add a simple function to check and fix all attempts that need manual grading
CREATE OR REPLACE FUNCTION fix_all_manual_grading_flags()
RETURNS TABLE (
  attempt_id UUID,
  quiz_id UUID,
  quiz_title TEXT,
  was_incorrect BOOLEAN,
  now_correct BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH attempts_to_fix AS (
    SELECT 
      sqa.id as attempt_id,
      sqa.quiz_id,
      sq.title as quiz_title,
      sqa.manual_grading_required as current_required,
      check_standalone_quiz_manual_grading_required(sqa.quiz_id) as should_require
    FROM standalone_quiz_attempts sqa
    JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
    WHERE sqa.manual_grading_required != check_standalone_quiz_manual_grading_required(sqa.quiz_id)
  )
  UPDATE standalone_quiz_attempts 
  SET 
    manual_grading_required = atf.should_require,
    manual_grading_completed = NOT atf.should_require,
    score = CASE 
      WHEN atf.should_require THEN NULL 
      ELSE standalone_quiz_attempts.score 
    END
  FROM attempts_to_fix atf
  WHERE standalone_quiz_attempts.id = atf.attempt_id
  RETURNING 
    standalone_quiz_attempts.id as attempt_id,
    standalone_quiz_attempts.quiz_id,
    (SELECT title FROM standalone_quizzes WHERE id = standalone_quiz_attempts.quiz_id) as quiz_title,
    atf.current_required as was_incorrect,
    atf.should_require as now_correct;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_all_manual_grading_flags() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_all_manual_grading_flags() TO service_role;

-- Add comment
COMMENT ON FUNCTION fix_all_manual_grading_flags() IS 
  'Fix all quiz attempts that have incorrect manual grading flags';
