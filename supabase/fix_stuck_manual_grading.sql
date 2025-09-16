-- Fix any attempts that are stuck in manual grading pending state
-- This script will mark attempts as completed if they have all text answer grades

-- 1. Find attempts that have manual grading required but are not completed
-- and have all their text answer questions graded
WITH attempts_with_grades AS (
  SELECT 
    sqa.id as attempt_id,
    sqa.quiz_id,
    COUNT(sqq.id) as total_text_questions,
    COUNT(sqtag.id) as graded_text_questions
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.attempt_id = sqa.id AND sqtag.question_id = sqq.id
  WHERE sqa.manual_grading_required = TRUE 
    AND sqa.manual_grading_completed = FALSE
    AND sqq.question_type = 'text_answer'
  GROUP BY sqa.id, sqa.quiz_id
  HAVING COUNT(sqq.id) = COUNT(sqtag.id)  -- All text questions are graded
)
-- 2. Update these attempts to mark them as completed
UPDATE standalone_quiz_attempts 
SET 
  manual_grading_completed = TRUE,
  manual_grading_completed_at = NOW(),
  manual_grading_completed_by = (
    SELECT graded_by 
    FROM standalone_quiz_text_answer_grades 
    WHERE attempt_id = standalone_quiz_attempts.id 
    LIMIT 1
  )
WHERE id IN (
  SELECT attempt_id FROM attempts_with_grades
);

-- 3. Show the results
SELECT 
  'Fixed attempts:' as status,
  COUNT(*) as count
FROM standalone_quiz_attempts 
WHERE manual_grading_required = TRUE 
  AND manual_grading_completed = TRUE;

-- 4. Show remaining pending attempts
SELECT 
  'Remaining pending:' as status,
  COUNT(*) as count
FROM standalone_quiz_attempts 
WHERE manual_grading_required = TRUE 
  AND manual_grading_completed = FALSE;
