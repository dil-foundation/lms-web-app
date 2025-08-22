-- Fix quiz submissions unique constraint to allow multiple quizzes per lesson
-- The current constraint (user_id, lesson_id) prevents multiple quiz submissions within the same lesson
-- We need to change it to (user_id, lesson_content_id) to allow one submission per specific quiz

-- Drop the existing constraint
ALTER TABLE public.quiz_submissions 
DROP CONSTRAINT quiz_submissions_user_lesson_unique;

-- Add the correct constraint
ALTER TABLE public.quiz_submissions 
ADD CONSTRAINT quiz_submissions_user_lesson_content_unique 
UNIQUE (user_id, lesson_content_id);

-- Add a comment to explain the change
COMMENT ON CONSTRAINT quiz_submissions_user_lesson_content_unique ON public.quiz_submissions IS 
'Ensures a user can only submit one attempt per specific quiz content item, allowing multiple quizzes within the same lesson';
