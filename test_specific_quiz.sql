-- Test script using the exact lesson_content_id from the network request
-- c8b435f8-2d49-4710-92b4-9e1c83bf49ff

-- 1. Check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_latest_quiz_submissions_for_assessment' 
AND routine_schema = 'public';

-- 2. Check if there are quiz submissions for this specific quiz
SELECT 
    id,
    user_id,
    lesson_content_id,
    score,
    attempt_number,
    is_latest_attempt,
    submitted_at
FROM quiz_submissions 
WHERE lesson_content_id = 'c8b435f8-2d49-4710-92b4-9e1c83bf49ff'
ORDER BY user_id, submitted_at;

-- 3. Test the function directly
SELECT * FROM get_latest_quiz_submissions_for_assessment('c8b435f8-2d49-4710-92b4-9e1c83bf49ff');

-- 4. Check the quiz details
SELECT 
    clc.id,
    clc.title,
    clc.content_type,
    c.title as course_title
FROM course_lesson_content clc
JOIN course_lessons cl ON clc.lesson_id = cl.id
JOIN course_sections cs ON cl.section_id = cs.id
JOIN courses c ON cs.course_id = c.id
WHERE clc.id = 'c8b435f8-2d49-4710-92b4-9e1c83bf49ff';
