-- Check the specific teacher ID issue
-- This script will help identify if the teacher_id exists in auth.users

-- 1. Check if the teacher_id from the quiz author exists in auth.users
SELECT 
    'Quiz author in auth.users:' as check_type,
    sq.author_id,
    au.id as auth_user_id,
    au.email,
    au.created_at
FROM standalone_quizzes sq
LEFT JOIN auth.users au ON au.id = sq.author_id
WHERE sq.id = 'f800077a-d7a8-4680-9e19-54902e1a8d38'::UUID;

-- 2. Check all users in auth.users to see what IDs exist
SELECT 
    'All auth.users:' as check_type,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any profiles for these users
SELECT 
    'Profiles for auth.users:' as check_type,
    p.id as profile_id,
    p.first_name,
    p.last_name,
    p.email,
    au.id as auth_user_id,
    au.email as auth_email
FROM profiles p
JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Check the specific attempt and see what teacher_id should be used
SELECT 
    'Attempt details with quiz author:' as check_type,
    sqa.id as attempt_id,
    sqa.quiz_id,
    sqa.user_id as student_id,
    sq.author_id as quiz_author_id,
    sq.title as quiz_title,
    p_student.first_name || ' ' || p_student.last_name as student_name,
    p_author.first_name || ' ' || p_author.last_name as author_name
FROM standalone_quiz_attempts sqa
JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
LEFT JOIN profiles p_student ON p_student.id = sqa.user_id
LEFT JOIN profiles p_author ON p_author.id = sq.author_id
WHERE sqa.id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 5. Test if we can update with the quiz author_id
-- (This will be commented out to avoid accidental changes)
/*
UPDATE standalone_quiz_attempts 
SET 
    manual_grading_completed = TRUE,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = '466aea4e-5751-40f7-81e6-fffe2cd501b1'::UUID
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;
*/
