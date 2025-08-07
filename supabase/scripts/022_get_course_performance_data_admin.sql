DROP FUNCTION IF EXISTS public.get_course_performance_data(uuid);

CREATE OR REPLACE FUNCTION public.get_course_performance_data(p_teacher_id UUID)
RETURNS TABLE (
    course_id UUID,
    course_title TEXT,
    enrolled_students BIGINT,
    active_students BIGINT,
    completed_students BIGINT,
    in_progress_students BIGINT,
    avg_rating NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH teacher_published_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        JOIN public.courses c ON cm.course_id = c.id
        WHERE cm.user_id = p_teacher_id
          AND cm.role = 'teacher'
          AND c.status = 'Published'
    ),
    course_stats AS (
        SELECT
            c.id AS course_id,
            c.title AS course_title,
            COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role = 'student') AS enrolled_students,
            COUNT(DISTINCT ucip.user_id) AS active_students
        FROM public.courses c
        LEFT JOIN public.course_members cm ON c.id = cm.course_id
        LEFT JOIN public.user_content_item_progress ucip ON c.id = ucip.course_id
        WHERE c.id IN (SELECT course_id FROM teacher_published_courses)
        GROUP BY c.id
    ),
    progress_stats AS (
        SELECT
            course_id,
            COUNT(DISTINCT user_id) FILTER (WHERE progress = 100) AS completed_students,
            COUNT(DISTINCT user_id) FILTER (WHERE progress > 0 AND progress < 100) AS in_progress_students
        FROM (
            SELECT
                course_id,
                user_id,
                (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(id))::integer AS progress
            FROM public.user_content_item_progress
            WHERE course_id IN (SELECT course_id FROM teacher_published_courses)
            GROUP BY course_id, user_id
        ) AS student_progress
        GROUP BY course_id
    )
    SELECT
        cs.course_id,
        cs.course_title,
        cs.enrolled_students,
        cs.active_students,
        COALESCE(ps.completed_students, 0) AS completed_students,
        COALESCE(ps.in_progress_students, 0) AS in_progress_students,
        0::NUMERIC AS avg_rating -- Placeholder for now
    FROM course_stats cs
    LEFT JOIN progress_stats ps ON cs.course_id = ps.course_id;
END;
$$;