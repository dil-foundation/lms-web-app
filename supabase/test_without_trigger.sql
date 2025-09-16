-- Test script to verify manual grading works without trigger
-- Run this in the Supabase SQL editor to test

-- 1. Check if trigger still exists (should be gone)
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_standalone_quiz_grading_status';

-- 2. Test the manual grading detection function
SELECT 
  'fcc211ab-6cae-46d5-9303-83aa7035692f' as quiz_id,
  check_standalone_quiz_manual_grading_required('fcc211ab-6cae-46d5-9303-83aa7035692f') as should_require_manual_grading;

-- 3. Test the manual flag setting function
SELECT set_manual_grading_flags('54f34cdc-6d50-4786-90b8-fb4a327705e1');

-- 4. Check the result
SELECT 
  id,
  quiz_id,
  manual_grading_required,
  manual_grading_completed,
  score
FROM standalone_quiz_attempts 
WHERE id = '54f34cdc-6d50-4786-90b8-fb4a327705e1';

-- 5. Test fixing all incorrect flags
SELECT * FROM fix_all_manual_grading_flags();

-- 6. Check recent attempts and their manual grading status
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
WHERE sqa.submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY sqa.id, sqa.quiz_id, sq.title, sqa.manual_grading_required, sqa.manual_grading_completed, sqa.score, sqa.submitted_at
ORDER BY sqa.submitted_at DESC;
