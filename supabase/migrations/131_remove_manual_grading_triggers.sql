-- Remove all manual grading triggers and functions
-- We'll handle manual grading logic entirely in the frontend for better control

-- Drop the trigger that automatically sets manual grading status
DROP TRIGGER IF EXISTS trigger_update_quiz_grading_status ON quiz_submissions;

-- Drop the function that checks if manual grading is required
DROP FUNCTION IF EXISTS check_quiz_manual_grading_required(UUID);

-- Drop the trigger function that updates grading status
DROP FUNCTION IF EXISTS update_quiz_submission_grading_status();

-- Add comment explaining the change
COMMENT ON TABLE quiz_submissions IS 'Manual grading logic is now handled entirely in the frontend. The manual_grading_required and manual_grading_completed fields are set by the application logic.';
