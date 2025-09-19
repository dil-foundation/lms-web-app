-- Script to find the actual lesson_content_id from quiz submissions
-- This will help us get the correct UUID to test with

-- 1. Find all quiz submissions with their lesson content details
SELECT 
    qs.lesson_content_id,
    clc.title as quiz_title,
    c.title as course_title,
    COUNT(*) as submission_count,
    COUNT(CASE WHEN qs.is_latest_attempt = true THEN 1 END) as latest_attempts,
    MAX(qs.submitted_at) as last_submission
FROM quiz_submissions qs
JOIN course_lesson_content clc ON qs.lesson_content_id = clc.id
JOIN course_lessons cl ON clc.lesson_id = cl.id
JOIN course_sections cs ON cl.section_id = cs.id
JOIN courses c ON cs.course_id = c.id
WHERE clc.content_type = 'quiz'
GROUP BY qs.lesson_content_id, clc.title, c.title
ORDER BY last_submission DESC
LIMIT 10;

-- 2. Test the functions with the first quiz found
-- (Replace the UUID below with one from the results above)
SELECT 
    'Testing with actual quiz data' as test_name,
    lesson_content_id,
    quiz_title,
    course_title
FROM (
    SELECT 
        qs.lesson_content_id,
        clc.title as quiz_title,
        c.title as course_title,
        COUNT(*) as submission_count
    FROM quiz_submissions qs
    JOIN course_lesson_content clc ON qs.lesson_content_id = clc.id
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN courses c ON cs.course_id = c.id
    WHERE clc.content_type = 'quiz'
    GROUP BY qs.lesson_content_id, clc.title, c.title
    ORDER BY submission_count DESC
    LIMIT 1
) latest_quiz;
