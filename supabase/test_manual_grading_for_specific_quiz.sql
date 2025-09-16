-- Test script to check manual grading detection for the specific quiz
-- Run this in the Supabase SQL editor to test

-- 1. Check what questions exist for this quiz
SELECT 
  id,
  quiz_id,
  question_text,
  question_type,
  position
FROM standalone_quiz_questions 
WHERE quiz_id = 'fcc211ab-6cae-46d5-9303-83aa7035692f'
ORDER BY position;

-- 2. Test the check function with the specific quiz ID
SELECT 
  'fcc211ab-6cae-46d5-9303-83aa7035692f' as quiz_id,
  check_standalone_quiz_manual_grading_required('fcc211ab-6cae-46d5-9303-83aa7035692f') as should_require_manual_grading;

-- 3. Check the current status of the attempt
SELECT 
  id,
  quiz_id,
  manual_grading_required,
  manual_grading_completed,
  score,
  submitted_at
FROM standalone_quiz_attempts 
WHERE id = '54f34cdc-6d50-4786-90b8-fb4a327705e1';

-- 4. Manually update the attempt to require manual grading (if needed)
UPDATE standalone_quiz_attempts 
SET 
  manual_grading_required = TRUE,
  manual_grading_completed = FALSE,
  score = NULL
WHERE id = '54f34cdc-6d50-4786-90b8-fb4a327705e1';

-- 5. Verify the update
SELECT 
  id,
  quiz_id,
  manual_grading_required,
  manual_grading_completed,
  score
FROM standalone_quiz_attempts 
WHERE id = '54f34cdc-6d50-4786-90b8-fb4a327705e1';
