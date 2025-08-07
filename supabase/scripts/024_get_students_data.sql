DROP FUNCTION IF EXISTS public.get_students_data(uuid, text, text, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_students_data(
    teacher_id uuid,
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
    enrolled_date text,
    course_title text,
    progress_percentage integer,
    status text,
    last_active text,
    assignments_completed text,
    total_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
    offset_val INTEGER;
    search_pattern TEXT;
BEGIN
    offset_val := (page_number - 1) * page_size;
    search_pattern := '%' || LOWER(search_term) || '%';

    RETURN QUERY
    WITH teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
    ),
    students_in_courses AS (
        SELECT
            p.id as student_id,
            cm.course_id
        FROM public.profiles p
        JOIN public.course_members cm ON p.id = cm.user_id
        WHERE cm.role = 'student'
          AND cm.course_id IN (SELECT course_id FROM teacher_courses)
    ),
    progress_calculation AS (
        SELECT
            sic.student_id,
            sic.course_id,
            (
                COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ucip.lesson_content_id ELSE NULL END)::DECIMAL /
                NULLIF(COUNT(DISTINCT clc.id), 0) * 100
            )::INTEGER as progress,
            COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ucip.lesson_content_id ELSE NULL END) as completed_items,
            COUNT(DISTINCT clc.id) as total_items,
            MAX(ucip.updated_at) as last_active_date
        FROM students_in_courses sic
        JOIN public.course_sections cs ON sic.course_id = cs.course_id
        JOIN public.course_lessons cl ON cs.id = cl.section_id
        JOIN public.course_lesson_content clc ON cl.id = clc.lesson_id
        LEFT JOIN public.user_content_item_progress ucip ON clc.id = ucip.lesson_content_id AND sic.student_id = ucip.user_id
        GROUP BY sic.student_id, sic.course_id
    ),
    students_data AS (
        SELECT
            p.id as student_id,
            p.first_name || ' ' || p.last_name as student_name,
            p.email as student_email,
            '' as student_avatar,
            TO_CHAR(cm.created_at, 'YYYY-MM-DD') as enrolled_date,
            c.title as course_title,
            COALESCE(pc.progress, 0) as progress_percentage,
            COALESCE(pc.completed_items, 0) as completed_items,
            COALESCE(pc.total_items, 0) as total_items,
            TO_CHAR(GREATEST(p.updated_at, pc.last_active_date), 'YYYY-MM-DD') as last_active
        FROM public.profiles p
        JOIN public.course_members cm ON p.id = cm.user_id
        JOIN public.courses c ON cm.course_id = c.id
        LEFT JOIN progress_calculation pc ON p.id = pc.student_id AND c.id = pc.course_id
        WHERE cm.role = 'student'
          AND c.id IN (SELECT course_id FROM teacher_courses)
          AND (search_term = '' OR LOWER(p.first_name || ' ' || p.last_name) LIKE search_pattern OR LOWER(p.email) LIKE search_pattern)
          AND (course_filter = '' OR c.id::text = course_filter)
    ),
    students_with_status AS (
        SELECT
            sd.*,
            CASE
                WHEN sd.progress_percentage >= 100 THEN 'Completed'
                WHEN sd.progress_percentage > 0 THEN 'In Progress'
                ELSE 'Not Started'
            END AS status
        FROM students_data sd
    ),
    filtered_students AS (
        SELECT *
        FROM students_with_status ss
        WHERE (status_filter = '' OR ss.status = status_filter)
    )
    SELECT
        fs.student_id,
        fs.student_name,
        fs.student_email,
        fs.student_avatar,
        fs.enrolled_date,
        fs.course_title,
        fs.progress_percentage,
        fs.status,
        fs.last_active,
        fs.completed_items || '/' || fs.total_items AS assignments_completed,
        count(*) OVER() AS total_count
    FROM filtered_students fs
    ORDER BY
        CASE WHEN sort_by = 'student_name' AND sort_order = 'asc' THEN fs.student_name END ASC,
        CASE WHEN sort_by = 'student_name' AND sort_order = 'desc' THEN fs.student_name END DESC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'asc' THEN fs.enrolled_date END ASC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'desc' THEN fs.enrolled_date END DESC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'asc' THEN fs.progress_percentage END ASC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'desc' THEN fs.progress_percentage END DESC
    LIMIT page_size
    OFFSET offset_val;
END;
$$;