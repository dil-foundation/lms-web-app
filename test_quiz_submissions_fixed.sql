-- Fixed test script for quiz submissions
-- This script will work with any valid lesson_content_id

-- 1. Check if there are any quiz submissions with the new attempt tracking
SELECT 
    'Quiz Submissions Check' as test_name,
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN is_latest_attempt = true THEN 1 END) as latest_attempts,
    COUNT(CASE WHEN attempt_number > 1 THEN 1 END) as retry_attempts
FROM quiz_submissions;

-- 2. Find a quiz with submissions to test with
WITH quiz_with_submissions AS (
    SELECT 
        qs.lesson_content_id,
        clc.title as quiz_title,
        COUNT(*) as submission_count
    FROM quiz_submissions qs
    JOIN course_lesson_content clc ON qs.lesson_content_id = clc.id
    WHERE clc.content_type = 'quiz'
    GROUP BY qs.lesson_content_id, clc.title
    ORDER BY submission_count DESC
    LIMIT 1
)
-- 3. Test the get_latest_quiz_submissions_for_assessment function
SELECT 
    'Latest Submissions Function Test' as test_name,
    COUNT(*) as submissions_found,
    qws.quiz_title
FROM get_latest_quiz_submissions_for_assessment(
    (SELECT lesson_content_id FROM quiz_with_submissions)
),
quiz_with_submissions qws;

-- 4. Test the get_assessment_submissions function
WITH quiz_with_submissions AS (
    SELECT 
        qs.lesson_content_id,
        clc.title as quiz_title,
        COUNT(*) as submission_count
    FROM quiz_submissions qs
    JOIN course_lesson_content clc ON qs.lesson_content_id = clc.id
    WHERE clc.content_type = 'quiz'
    GROUP BY qs.lesson_content_id, clc.title
    ORDER BY submission_count DESC
    LIMIT 1
)
SELECT 
    'Assessment Submissions Function Test' as test_name,
    jsonb_array_length(submissions) as submissions_count,
    qws.quiz_title
FROM get_assessment_submissions(
    (SELECT lesson_content_id FROM quiz_with_submissions)
),
quiz_with_submissions qws;

-- 5. Show recent quiz submissions with attempt tracking
SELECT 
    'Recent Quiz Submissions' as test_name,
    qs.id,
    qs.user_id,
    qs.lesson_content_id,
    clc.title as quiz_title,
    qs.score,
    qs.attempt_number,
    qs.is_latest_attempt,
    qs.submitted_at
FROM quiz_submissions qs
JOIN course_lesson_content clc ON qs.lesson_content_id = clc.id
WHERE clc.content_type = 'quiz'
ORDER BY qs.submitted_at DESC
LIMIT 5;
