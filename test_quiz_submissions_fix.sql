-- Test script to verify quiz submissions are showing correctly in assessments

-- 1. Check if there are any quiz submissions with the new attempt tracking
SELECT 
    'Quiz Submissions Check' as test_name,
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN is_latest_attempt = true THEN 1 END) as latest_attempts,
    COUNT(CASE WHEN attempt_number > 1 THEN 1 END) as retry_attempts
FROM quiz_submissions;

-- 2. Test the get_latest_quiz_submissions_for_assessment function
-- Replace with actual lesson_content_id from your quiz
SELECT 
    'Latest Submissions Function Test' as test_name,
    COUNT(*) as submissions_found
FROM get_latest_quiz_submissions_for_assessment('c8b435f8-2d49-4710-92b4-9e1c8c');

-- 3. Test the get_assessment_submissions function
SELECT 
    'Assessment Submissions Function Test' as test_name,
    jsonb_array_length(submissions) as submissions_count
FROM get_assessment_submissions('c8b435f8-2d49-4710-92b4-9e1c8c');

-- 4. Check specific quiz submission data
SELECT 
    id,
    user_id,
    lesson_content_id,
    score,
    attempt_number,
    is_latest_attempt,
    submitted_at
FROM quiz_submissions 
WHERE lesson_content_id = 'c8b435f8-2d49-4710-92b4-9e1c8c'
ORDER BY user_id, submitted_at;
