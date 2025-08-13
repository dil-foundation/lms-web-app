-- Migration: Move due_date from course_lessons to course_lesson_content
-- This allows individual content items (assignments/quizzes) to have their own due dates

-- Step 1: Add due_date column to course_lesson_content table
ALTER TABLE course_lesson_content 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;


-- Step 3: Remove the due_date column from course_lessons table
ALTER TABLE course_lessons 
DROP COLUMN IF EXISTS due_date;

-- Step 4: Add comment to document the change
COMMENT ON COLUMN course_lesson_content.due_date IS 'Due date for assignments and quizzes. Moved from course_lessons table to allow individual content items to have their own due dates.';
