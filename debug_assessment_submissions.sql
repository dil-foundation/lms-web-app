-- Debug script to check why quiz submissions aren't showing in assessments

-- 1. Check if the function exists and what it looks like
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_assessment_submissions' 
AND routine_schema = 'public';

-- 2. Check if there are any quiz submissions for the specific quiz
-- Replace 'c8b435f8-2d49-4710-92b4-9e1c8' with the actual lesson_content_id from the image
SELECT 
    id,
    user_id,
    lesson_content_id,
    score,
    attempt_number,
    is_latest_attempt,
    submitted_at
FROM quiz_submissions 
WHERE lesson_content_id = 'c8b435f8-2d49-4710-92b4-9e1c8'
ORDER BY user_id, submitted_at;

-- 3. Check if the function is filtering correctly
-- This should return the same data as above but through the function
SELECT * FROM get_assessment_submissions('c8b435f8-2d49-4710-92b4-9e1c8');

-- 4. Check if there are any course members for this course
SELECT 
    cm.user_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.role
FROM course_members cm
JOIN profiles p ON cm.user_id = p.id
WHERE cm.course_id = '16bc48d2-cc47-4cfc-8bf4-a61a4c2382d4'  -- From the image
AND p.role = 'student';
