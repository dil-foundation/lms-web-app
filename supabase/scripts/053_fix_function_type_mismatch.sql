-- Migration: Fix function type mismatch in can_delete_course
-- This fixes the error "Returned type bigint does not match expected type integer in column 3"
-- The issue is that COUNT() returns bigint but we declared the function to return integer

-- Drop the existing function first
DROP FUNCTION IF EXISTS can_delete_course(uuid);

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION can_delete_course(course_id_to_check uuid)
RETURNS TABLE(
    can_delete boolean,
    reason text,
    student_count bigint,
    progress_count bigint,
    submission_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH course_stats AS (
        SELECT 
            c.id,
            c.title,
            COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role = 'student') as student_count,
            COUNT(DISTINCT ucip.id) as progress_count,
            COUNT(DISTINCT as2.id) as submission_count
        FROM public.courses c
        LEFT JOIN public.course_members cm ON c.id = cm.course_id
        LEFT JOIN public.user_content_item_progress ucip ON c.id = ucip.course_id
        LEFT JOIN public.assignment_submissions as2 ON as2.assignment_id IN (
            SELECT clc.id 
            FROM public.course_lesson_content clc
            JOIN public.course_lessons cl ON clc.lesson_id = cl.id
            JOIN public.course_sections cs ON cl.section_id = cs.id
            WHERE cs.course_id = c.id
        )
        WHERE c.id = course_id_to_check
        GROUP BY c.id, c.title
    )
    SELECT 
        CASE 
            WHEN cs.student_count = 0 AND cs.progress_count = 0 AND cs.submission_count = 0 THEN true
            ELSE false
        END as can_delete,
        CASE 
            WHEN cs.student_count > 0 THEN 'Course has enrolled students'
            WHEN cs.progress_count > 0 THEN 'Course has student progress data'
            WHEN cs.submission_count > 0 THEN 'Course has student submissions'
            ELSE 'Course can be safely deleted'
        END as reason,
        COALESCE(cs.student_count, 0) as student_count,
        COALESCE(cs.progress_count, 0) as progress_count,
        COALESCE(cs.submission_count, 0) as submission_count
    FROM course_stats cs;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION can_delete_course(uuid) IS 'Checks if a course can be safely deleted by examining student data and progress';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION can_delete_course(uuid) TO authenticated;
