-- Migration: Move due_date from course_lessons to course_lesson_content
-- This allows individual content items (assignments/quizzes) to have their own due dates

-- Step 1: Add due_date column to course_lesson_content table
ALTER TABLE course_lesson_content 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Step 3: Remove due_date column from course_lessons table
ALTER TABLE course_lessons 
DROP COLUMN IF EXISTS due_date;

-- Step 4: Add index for better query performance on due_date
CREATE INDEX IF NOT EXISTS idx_course_lesson_content_due_date 
ON course_lesson_content(due_date);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN course_lesson_content.due_date IS 'Due date for assignments and quizzes. Only applicable for content_type = assignment or quiz.';
