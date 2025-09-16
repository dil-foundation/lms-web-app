-- Test script to manually test the update for the specific failing attempt
-- This will help identify if the issue is with the function or the data

-- 1. First, let's see the current state of the attempt
SELECT 
    id,
    quiz_id,
    user_id,
    manual_grading_required,
    manual_grading_completed,
    manual_grading_score,
    score,
    submitted_at,
    manual_grading_completed_at,
    manual_grading_completed_by
FROM standalone_quiz_attempts 
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 2. Test a simple update to see if it works
-- (Uncomment the lines below to test)
/*
UPDATE standalone_quiz_attempts 
SET 
    manual_grading_completed = TRUE,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = 'your-teacher-id-here'::UUID
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- Check if the update worked
SELECT 
    id,
    manual_grading_completed,
    manual_grading_completed_at,
    manual_grading_completed_by
FROM standalone_quiz_attempts 
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;
*/

-- 3. Check if there are any RLS policies that might be blocking the update
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'standalone_quiz_attempts';

-- 4. Check if the user has the right permissions
SELECT 
    has_table_privilege('your-user-id-here'::UUID, 'standalone_quiz_attempts', 'UPDATE') as can_update,
    has_table_privilege('your-user-id-here'::UUID, 'standalone_quiz_attempts', 'SELECT') as can_select;
