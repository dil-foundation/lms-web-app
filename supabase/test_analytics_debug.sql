-- Test script to debug the analytics function
-- Run this in Supabase SQL editor to see what's happening

-- First, let's see what quiz attempts exist
SELECT 
  sqa.id as attempt_id,
  sqa.quiz_id,
  sqa.score,
  sqa.answers,
  jsonb_object_keys(sqa.answers) as answer_keys
FROM public.standalone_quiz_attempts sqa
WHERE sqa.answers IS NOT NULL
ORDER BY sqa.created_at DESC
LIMIT 3;

-- Get a quiz ID that has attempts
WITH quiz_with_attempts AS (
  SELECT DISTINCT sqa.quiz_id
  FROM public.standalone_quiz_attempts sqa
  WHERE sqa.answers IS NOT NULL
  LIMIT 1
)
SELECT quiz_id FROM quiz_with_attempts;

-- Test the debug function with a real quiz ID
-- Replace 'YOUR_QUIZ_ID_HERE' with an actual quiz ID from the above query
SELECT * FROM public.debug_question_performance_analytics(
  (SELECT DISTINCT sqa.quiz_id FROM public.standalone_quiz_attempts sqa WHERE sqa.answers IS NOT NULL LIMIT 1)
);

-- Test the original function to see what it returns
SELECT * FROM public.get_question_performance_analytics(
  (SELECT DISTINCT sqa.quiz_id FROM public.standalone_quiz_attempts sqa WHERE sqa.answers IS NOT NULL LIMIT 1)
);
