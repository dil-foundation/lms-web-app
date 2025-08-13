-- Migration: Improve course deletion handling
-- This provides additional safety measures for course deletion operations
-- and better error handling to prevent trigger conflicts

-- Create a function to safely delete a course with proper cleanup
CREATE OR REPLACE FUNCTION safe_delete_course(course_id_to_delete uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    course_exists boolean;
    has_progress boolean;
    has_submissions boolean;
BEGIN
    -- Check if course exists
    SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = course_id_to_delete) INTO course_exists;
    
    IF NOT course_exists THEN
        RAISE EXCEPTION 'Course with ID % does not exist', course_id_to_delete;
    END IF;
    
    -- Check if course has any student progress (optional safety check)
    SELECT EXISTS(
        SELECT 1 FROM public.user_content_item_progress 
        WHERE course_id = course_id_to_delete
    ) INTO has_progress;
    
    -- Check if course has any submissions (optional safety check)
    SELECT EXISTS(
        SELECT 1 FROM public.assignment_submissions as2
        JOIN public.course_lesson_content clc ON as2.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id = course_id_to_delete
    ) INTO has_submissions;
    
    -- If course has progress or submissions, we might want to warn or prevent deletion
    -- For now, we'll allow deletion but log it
    IF has_progress OR has_submissions THEN
        RAISE NOTICE 'Course % has student progress or submissions. Proceeding with deletion.', course_id_to_delete;
    END IF;
    
    -- Delete the course (this will cascade to related tables due to foreign key constraints)
    DELETE FROM public.courses WHERE id = course_id_to_delete;
    
    -- Check if deletion was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to delete course with ID %', course_id_to_delete;
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE NOTICE 'Error deleting course %: %', course_id_to_delete, SQLERRM;
        RAISE;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION safe_delete_course(uuid) IS 'Safely deletes a course with proper error handling and progress checking';

-- Create a function to check if a course can be safely deleted
CREATE OR REPLACE FUNCTION can_delete_course(course_id_to_check uuid)
RETURNS TABLE(
    can_delete boolean,
    reason text,
    student_count integer,
    progress_count integer,
    submission_count integer
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
GRANT EXECUTE ON FUNCTION safe_delete_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_course(uuid) TO authenticated;
