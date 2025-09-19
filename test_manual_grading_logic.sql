-- Test script to verify the manual grading logic
-- This will help us understand the current behavior and verify the fix

-- 1. Check the current function definition
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'check_quiz_manual_grading_required';

-- 2. Test the function with a specific quiz content ID
-- Replace 'your-quiz-content-id' with the actual ID from your quiz
-- SELECT check_quiz_manual_grading_required('your-quiz-content-id');

-- 3. Check the current trigger definition
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_quiz_grading_status';

-- 4. Check a specific quiz's questions and their math_allow_drawing settings
-- Replace 'your-quiz-content-id' with the actual ID
/*
SELECT 
    id,
    question_text,
    question_type,
    math_allow_drawing,
    math_expression
FROM quiz_questions 
WHERE lesson_content_id = 'your-quiz-content-id';
*/

-- 5. Check recent quiz submissions and their manual grading status
SELECT 
    id,
    lesson_content_id,
    score,
    manual_grading_required,
    manual_grading_completed,
    submitted_at
FROM quiz_submissions 
ORDER BY submitted_at DESC 
LIMIT 10;
