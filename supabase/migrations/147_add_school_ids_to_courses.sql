-- Add school_ids field to the courses table
-- This migration adds support for the CourseBuilder's school enrollment features

ALTER TABLE public.courses 
ADD COLUMN school_ids uuid[] DEFAULT '{}';

-- Add index for better query performance on school_ids array field
CREATE INDEX IF NOT EXISTS idx_courses_school_ids ON public.courses USING GIN (school_ids);

-- Add comment to document the new field
COMMENT ON COLUMN public.courses.school_ids IS 'Array of school UUIDs enrolled for this course';

-- Optional: Add constraint to ensure school_ids array contains valid UUIDs
-- (This assumes you have a schools table)
-- Uncomment this if you want to enforce referential integrity:

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_school_ids_check 
-- CHECK (array_length(school_ids, 1) IS NULL OR school_ids <@ (SELECT array_agg(id) FROM schools));
