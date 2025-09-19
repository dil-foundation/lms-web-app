-- Verify that manual grading triggers have been removed
-- Run this after applying the migration to confirm the triggers are gone

-- 1. Check if the trigger still exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_quiz_grading_status';

-- 2. Check if the functions still exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'check_quiz_manual_grading_required',
    'update_quiz_submission_grading_status'
);

-- 3. Check recent quiz submissions to see their manual grading status
SELECT 
    id,
    lesson_content_id,
    score,
    manual_grading_required,
    manual_grading_completed,
    submitted_at
FROM quiz_submissions 
ORDER BY submitted_at DESC 
LIMIT 5;

-- Expected results:
-- 1. No trigger should be returned (empty result)
-- 2. No functions should be returned (empty result)
-- 3. Quiz submissions should show the manual grading status as set by the frontend
