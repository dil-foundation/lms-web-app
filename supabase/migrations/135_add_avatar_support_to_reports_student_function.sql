-- Migration: Add avatar support to get_students_data function
-- Description: Updates get_students_data function to include avatar_url instead of generating initials

-- Drop existing function first (required when changing return types)
DROP FUNCTION IF EXISTS get_students_data(uuid, text, text, text, text, text, integer, integer);

-- Create the updated function with avatar support
CREATE FUNCTION get_students_data(
    p_teacher_id uuid,
    search_term text,
    course_filter text,
    status_filter text,
    sort_by text,
    sort_order text,
    page_number integer,
    page_size integer
)
RETURNS TABLE (
    student_id uuid,
    student_name text,
    student_email text,
    student_avatar text,
    avatar_url text,
    enrolled_date timestamp with time zone,
    course_title text,
    progress_percentage integer,
    status text,
    last_active text,
    total_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH student_enrollments AS (
        SELECT
            cm.user_id,
            cm.course_id,
            p.first_name,
            p.last_name,
            p.email,
            p.avatar_url,
            cm.created_at AS enrolled_date,
            c.title AS course_title
        FROM public.course_members cm
        JOIN public.courses c ON cm.course_id = c.id
        JOIN public.profiles p ON cm.user_id = p.id
        WHERE cm.role = 'student'
          AND c.status = 'Published'
          AND cm.course_id IN (
            SELECT course_id FROM public.course_members WHERE user_id = p_teacher_id AND role = 'teacher'
          )
    ),
    student_progress AS (
        SELECT
            ucip.user_id,
            ucip.course_id,
            COUNT(DISTINCT CASE WHEN lower(ucip.status) = 'completed' THEN ucip.lesson_content_id END) AS completed_items,
            COUNT(DISTINCT ucip.lesson_content_id) AS progressed_items,
            MAX(ucip.updated_at) AS last_activity
        FROM public.user_content_item_progress ucip
        GROUP BY ucip.user_id, ucip.course_id
    ),
    course_totals AS (
        SELECT
            c.id AS course_id,
            COUNT(clc.id) AS total_items
        FROM public.courses c
        JOIN public.course_sections cs ON c.id = cs.course_id
        JOIN public.course_lessons cl ON cs.id = cl.section_id
        JOIN public.course_lesson_content clc ON cl.id = clc.lesson_id
        GROUP BY c.id
    ),
    final_data AS (
        SELECT
            se.user_id AS student_id,
            (se.first_name || ' ' || se.last_name) AS student_name,
            se.email AS student_email,
            (SUBSTRING(se.first_name, 1, 1) || SUBSTRING(se.last_name, 1, 1)) AS student_avatar,
            se.avatar_url,
            se.enrolled_date,
            se.course_title,
            CASE
                WHEN COALESCE(ct.total_items, 0) > 0 THEN
                    (COALESCE(sp.completed_items, 0) * 100.0 / ct.total_items)::integer
                ELSE 0
            END AS progress_percentage,
            CASE
                WHEN COALESCE(ct.total_items, 0) > 0 AND (COALESCE(sp.completed_items, 0) * 100.0 / ct.total_items)::integer >= 100 THEN 'Completed'
                WHEN COALESCE(sp.progressed_items, 0) > 0 THEN 'In Progress'
                ELSE 'Not Started'
            END AS status,
            to_char(sp.last_activity, 'YYYY-MM-DD') AS last_active
        FROM student_enrollments se
        LEFT JOIN student_progress sp ON se.user_id = sp.user_id AND se.course_id = sp.course_id
        LEFT JOIN course_totals ct ON se.course_id = ct.course_id
        WHERE (search_term = '' OR (se.first_name || ' ' || se.last_name) ILIKE '%' || search_term || '%' OR se.email ILIKE '%' || search_term || '%')
          AND (course_filter = '' OR se.course_id::text = course_filter)
    ),
    filtered_data AS (
        SELECT *
        FROM final_data
        WHERE (status_filter = '' OR final_data.status = status_filter)
    )
    SELECT
        fd.student_id,
        fd.student_name,
        fd.student_email,
        fd.student_avatar,
        fd.avatar_url,
        fd.enrolled_date,
        fd.course_title,
        fd.progress_percentage,
        fd.status,
        fd.last_active,
        (SELECT COUNT(*) FROM filtered_data) AS total_count
    FROM filtered_data fd
    ORDER BY
        CASE WHEN sort_by = 'name' AND sort_order = 'asc' THEN fd.student_name END ASC,
        CASE WHEN sort_by = 'name' AND sort_order = 'desc' THEN fd.student_name END DESC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'asc' THEN fd.progress_percentage END ASC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'desc' THEN fd.progress_percentage END DESC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'asc' THEN fd.enrolled_date END ASC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'desc' THEN fd.enrolled_date END DESC
    LIMIT page_size
    OFFSET (page_number - 1) * page_size;
END;
$$;
