-- Check if there are multiple versions of this quiz or if questions were recreated
-- This will help us understand why the question IDs don't match

-- Check all questions for this quiz ID
SELECT 
  sqq.id as question_id,
  sqq.question_text,
  sqq.question_type,
  sqq.position,
  sqq.created_at,
  sqq.updated_at
FROM public.standalone_quiz_questions sqq
WHERE sqq.quiz_id = '1bd739b4-e8fa-4c31-9670-61cc8fa9e2be'::uuid
ORDER BY sqq.created_at, sqq.position;

-- Check what question IDs are actually in the answers
SELECT DISTINCT
  answer.key as question_id_in_answers,
  COUNT(*) as attempt_count
FROM public.standalone_quiz_attempts sqa,
     jsonb_each(sqa.answers) as answer
WHERE sqa.quiz_id = '1bd739b4-e8fa-4c31-9670-61cc8fa9e2be'::uuid
GROUP BY answer.key
ORDER BY attempt_count DESC;

-- Check if there are any questions with the IDs that appear in answers
SELECT 
  sqq.id as question_id,
  sqq.question_text,
  sqq.question_type,
  sqq.quiz_id,
  sqq.created_at
FROM public.standalone_quiz_questions sqq
WHERE sqq.id IN (
  '584f11a8-44da-4b89-ac40-d40c7799f1be',
  'd465761e-4a3e-48b5-8a93-f28633eb6db6',
  'e0f2e45d-c0d0-4da0-b0f2-65b9269a7a07'
);

-- Check if these question IDs belong to a different quiz
SELECT 
  sqq.id as question_id,
  sqq.question_text,
  sqq.question_type,
  sqq.quiz_id,
  sq.title as quiz_title,
  sqq.created_at
FROM public.standalone_quiz_questions sqq
LEFT JOIN public.standalone_quizzes sq ON sq.id = sqq.quiz_id
WHERE sqq.id IN (
  '584f11a8-44da-4b89-ac40-d40c7799f1be',
  'd465761e-4a3e-48b5-8a93-f28633eb6db6',
  'e0f2e45d-c0d0-4da0-b0f2-65b9269a7a07'
);
