-- Test the correctness logic manually
-- This will help us see if the issue is in the logic or the data

-- Test single choice question correctness
WITH test_data AS (
  SELECT 
    '584f11a8-44da-4b89-ac40-d40c7799f1be'::uuid as question_id,
    '3d806f2a-0fb9-4c7c-a866-772ebe2b716a'::text as selected_option,
    'single_choice'::text as question_type
)
SELECT 
  td.question_id,
  td.selected_option,
  td.question_type,
  sqo.id as correct_option_id,
  sqo.option_text as correct_option_text,
  sqo.is_correct,
  CASE 
    WHEN td.selected_option = sqo.id::text THEN 'CORRECT'
    ELSE 'INCORRECT'
  END as result
FROM test_data td
LEFT JOIN public.standalone_question_options sqo ON sqo.question_id = td.question_id AND sqo.is_correct = true;

-- Test multiple choice question correctness
WITH test_data AS (
  SELECT 
    'd465761e-4a3e-48b5-8a93-f28633eb6db6'::uuid as question_id,
    ARRAY['f5d33ef7-07c0-4082-87f6-cac9ac17cb49', 'bcce6995-51ab-49b9-95d6-1a8604d6aadd']::text[] as selected_options,
    'multiple_choice'::text as question_type
)
SELECT 
  td.question_id,
  td.selected_options,
  td.question_type,
  ARRAY_AGG(sqo.id::text ORDER BY sqo.position) as correct_options,
  ARRAY_AGG(sqo.option_text ORDER BY sqo.position) as correct_option_texts,
  CASE 
    WHEN td.selected_options = ARRAY_AGG(sqo.id::text ORDER BY sqo.position) THEN 'CORRECT'
    ELSE 'INCORRECT'
  END as result
FROM test_data td
LEFT JOIN public.standalone_question_options sqo ON sqo.question_id = td.question_id AND sqo.is_correct = true
GROUP BY td.question_id, td.selected_options, td.question_type;
