-- Ensure all manual grading triggers and functions are completely removed
-- This migration ensures no database-side logic interferes with frontend manual grading decisions

-- Remove any remaining triggers (comprehensive list)
DROP TRIGGER IF EXISTS trigger_update_quiz_grading_status ON quiz_submissions;
DROP TRIGGER IF EXISTS trigger_quiz_manual_grading ON quiz_submissions;
DROP TRIGGER IF EXISTS trigger_quiz_submission_grading ON quiz_submissions;
DROP TRIGGER IF EXISTS trigger_quiz_grading ON quiz_submissions;
DROP TRIGGER IF EXISTS trigger_manual_grading ON quiz_submissions;
DROP TRIGGER IF EXISTS trigger_quiz_submission_update ON quiz_submissions;

-- Remove any remaining functions (comprehensive list)
DROP FUNCTION IF EXISTS check_quiz_manual_grading_required(UUID);
DROP FUNCTION IF EXISTS update_quiz_submission_grading_status();
DROP FUNCTION IF EXISTS trigger_update_quiz_grading_status();
DROP FUNCTION IF EXISTS check_manual_grading_required(UUID);
DROP FUNCTION IF EXISTS update_quiz_grading_status();
DROP FUNCTION IF EXISTS trigger_quiz_grading_status();

-- Ensure quiz_submissions table has the correct structure
-- (This is just to make sure the table exists with the right columns)
DO $$
BEGIN
    -- Check if manual_grading_required column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_submissions' 
        AND column_name = 'manual_grading_required'
    ) THEN
        ALTER TABLE quiz_submissions ADD COLUMN manual_grading_required BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check if manual_grading_completed column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_submissions' 
        AND column_name = 'manual_grading_completed'
    ) THEN
        ALTER TABLE quiz_submissions ADD COLUMN manual_grading_completed BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
