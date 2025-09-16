-- Debug script to check manual grading status
-- Run this to see the current state of quiz attempts

-- 1. Check if the function exists and its signature
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'complete_standalone_quiz_manual_grading'
AND routine_schema = 'public';

-- 2. Check the current state of quiz attempts with manual grading
SELECT 
    sqa.id as attempt_id,
    sq.title as quiz_title,
    p.first_name || ' ' || p.last_name as student_name,
    sqa.manual_grading_required,
    sqa.manual_grading_completed,
    sqa.manual_grading_score,
    sqa.score,
    sqa.submitted_at,
    sqa.manual_grading_completed_at,
    sqa.manual_grading_completed_by
FROM standalone_quiz_attempts sqa
JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
JOIN profiles p ON p.id = sqa.user_id
WHERE sqa.manual_grading_required = TRUE
ORDER BY sqa.submitted_at DESC;

-- 3. Check individual text answer grades
SELECT 
    sqtag.attempt_id,
    sqq.question_text,
    sqtag.grade,
    sqtag.feedback,
    sqtag.graded_at,
    p.first_name || ' ' || p.last_name as graded_by
FROM standalone_quiz_text_answer_grades sqtag
JOIN standalone_quiz_questions sqq ON sqq.id = sqtag.question_id
LEFT JOIN profiles p ON p.id = sqtag.graded_by
ORDER BY sqtag.graded_at DESC;

-- 4. Test the function with a specific attempt (replace with actual attempt_id)
-- SELECT complete_standalone_quiz_manual_grading(
--     'your-attempt-id-here'::UUID,
--     'your-teacher-id-here'::UUID,
--     '[{"question_id": "question-id", "grade": 1, "feedback": "Test feedback"}]'::JSONB,
--     'Overall feedback'
-- );
