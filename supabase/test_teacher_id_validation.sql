-- Test script to validate teacher ID and fix the specific attempt
-- This will help identify and fix the teacher ID issue

-- 1. Check the current user session and teacher ID
-- (This will show what user ID is currently logged in)
SELECT 
    'Current auth user:' as check_type,
    auth.uid() as current_user_id;

-- 2. Check if the current user exists in auth.users
SELECT 
    'Current user in auth.users:' as check_type,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
WHERE au.id = auth.uid();

-- 3. Check the specific attempt and its quiz author
SELECT 
    'Attempt with quiz author:' as check_type,
    sqa.id as attempt_id,
    sqa.quiz_id,
    sq.author_id as quiz_author_id,
    sq.title as quiz_title,
    au_author.id as author_auth_id,
    au_author.email as author_email
FROM standalone_quiz_attempts sqa
JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
LEFT JOIN auth.users au_author ON au_author.id = sq.author_id
WHERE sqa.id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 4. Test the update with the quiz author ID (who should have permission)
-- (Uncomment to test)
/*
UPDATE standalone_quiz_attempts 
SET 
    manual_grading_completed = TRUE,
    manual_grading_score = 100.0,
    manual_grading_feedback = 'Test feedback',
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = '466aea4e-5751-40f7-81e6-fffe2cd501b1'::UUID,
    score = 100.0
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- Check if the update worked
SELECT 
    id,
    manual_grading_completed,
    manual_grading_score,
    score,
    manual_grading_completed_by
FROM standalone_quiz_attempts 
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;
*/

-- 5. Check all users in the system to see what IDs are available
SELECT 
    'All auth.users:' as check_type,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC;
