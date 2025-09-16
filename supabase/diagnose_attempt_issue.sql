-- Diagnose the specific attempt that's failing to update
-- Replace the attempt_id with the actual failing attempt ID

-- 1. Check if the attempt exists
SELECT 
    'Attempt exists check:' as check_type,
    sqa.id,
    sqa.quiz_id,
    sqa.user_id,
    sqa.manual_grading_required,
    sqa.manual_grading_completed,
    sqa.submitted_at,
    sqa.created_at
FROM standalone_quiz_attempts sqa
WHERE sqa.id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 2. Check the quiz associated with this attempt
SELECT 
    'Quiz details:' as check_type,
    sq.id as quiz_id,
    sq.title,
    sq.author_id,
    sq.created_at
FROM standalone_quiz_attempts sqa
JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
WHERE sqa.id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 3. Check questions for this quiz
SELECT 
    'Quiz questions:' as check_type,
    sqq.id as question_id,
    sqq.question_type,
    sqq.points,
    sqq.question_text
FROM standalone_quiz_attempts sqa
JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
WHERE sqa.id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 4. Check existing text answer grades for this attempt
SELECT 
    'Existing grades:' as check_type,
    sqtag.id,
    sqtag.question_id,
    sqtag.grade,
    sqtag.feedback,
    sqtag.graded_by,
    sqtag.graded_at
FROM standalone_quiz_text_answer_grades sqtag
WHERE sqtag.attempt_id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;

-- 5. Check if there are any constraints or triggers that might prevent the update
SELECT 
    'Table constraints:' as check_type,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'standalone_quiz_attempts'
    AND tc.table_schema = 'public';

-- 6. Test a simple update to see if it works
-- (This will be commented out to avoid accidental changes)
/*
UPDATE standalone_quiz_attempts 
SET manual_grading_completed = TRUE
WHERE id = '1ae53bd7-9d7b-425b-b343-c2d51ab15c3e'::UUID;
*/

-- 7. Check the exact data types and values
SELECT 
    'Data type check:' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'standalone_quiz_attempts'
    AND table_schema = 'public'
    AND column_name IN ('id', 'manual_grading_completed', 'manual_grading_score', 'score');
