-- Remove academic_year and semester columns from classes table
-- These columns are no longer needed in the current UI implementation

-- First, drop the view that depends on academic_year column
DROP VIEW IF EXISTS public.class_overview CASCADE;

-- Drop the unique constraint that includes academic_year
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS unique_class_code_per_year;

-- Drop the indexes for academic_year and semester
DROP INDEX IF EXISTS idx_classes_academic_year;
DROP INDEX IF EXISTS idx_classes_semester;

-- Drop the check constraints for semester
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_semester_check;

-- Now drop the columns
ALTER TABLE public.classes DROP COLUMN IF EXISTS academic_year;
ALTER TABLE public.classes DROP COLUMN IF EXISTS semester;

-- Recreate the class_overview view without academic_year and semester columns
CREATE VIEW public.class_overview AS
SELECT 
    c.id,
    c.name,
    c.code,
    c.grade,
    c.description,
    c.status,
    c.max_students,
    c.current_students,
    c.created_at,
    c.updated_at,
    s.name AS school_name,
    s.code AS school_code,
    b.name AS board_name,
    b.code AS board_code,
    COUNT(DISTINCT ct.teacher_id) AS teacher_count,
    COUNT(DISTINCT cs.student_id) AS student_count
FROM public.classes c
LEFT JOIN public.schools s ON c.school_id = s.id
LEFT JOIN public.boards b ON c.board_id = b.id
LEFT JOIN public.class_teachers ct ON c.id = ct.class_id
LEFT JOIN public.class_students cs ON c.id = cs.class_id
GROUP BY c.id, c.name, c.code, c.grade, c.description, c.status, 
         c.max_students, c.current_students, c.created_at, c.updated_at,
         s.name, s.code, b.name, b.code;

-- Add a comment to clarify the uniqueness
COMMENT ON CONSTRAINT classes_code_key ON public.classes IS 'Ensures class codes are unique across the entire system';
