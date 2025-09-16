-- Debug script for manual grading detection issues
-- Run this in the Supabase SQL editor to debug

-- 1. Test the manual grading detection function with a specific quiz
-- Replace 'YOUR_QUIZ_ID' with the actual quiz ID that has text answer questions
SELECT * FROM test_manual_grading_detection('fcc211ab-6cae-46d5-9303-83aa7035692f');

-- 2. Check all quizzes that have text answer questions
SELECT 
  sq.id as quiz_id,
  sq.title as quiz_title,
  sq.status,
  COUNT(sqq.id) as total_questions,
  COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_questions
FROM standalone_quizzes sq
LEFT JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sq.id
WHERE sq.status = 'published'
GROUP BY sq.id, sq.title, sq.status
HAVING COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) > 0
ORDER BY sq.created_at DESC;

-- 3. Check recent quiz attempts and their manual grading status
SELECT 
  sqa.id as attempt_id,
  sqa.quiz_id,
  sq.title as quiz_title,
  sqa.manual_grading_required,
  sqa.manual_grading_completed,
  sqa.score,
  sqa.submitted_at,
  COUNT(sqq.id) as total_questions,
  COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_questions
FROM standalone_quiz_attempts sqa
JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
LEFT JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
WHERE sqa.submitted_at >= NOW() - INTERVAL '1 day'
GROUP BY sqa.id, sqa.quiz_id, sq.title, sqa.manual_grading_required, sqa.manual_grading_completed, sqa.score, sqa.submitted_at
ORDER BY sqa.submitted_at DESC;

-- 4. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_standalone_quiz_grading_status';

-- 5. Test the check function directly
SELECT 
  'fcc211ab-6cae-46d5-9303-83aa7035692f' as quiz_id,
  check_standalone_quiz_manual_grading_required('fcc211ab-6cae-46d5-9303-83aa7035692f') as result;

-- 6. Check what questions exist for the test quiz
SELECT 
  id,
  quiz_id,
  question_text,
  question_type,
  position
FROM standalone_quiz_questions 
WHERE quiz_id = 'fcc211ab-6cae-46d5-9303-83aa7035692f'
ORDER BY position;
