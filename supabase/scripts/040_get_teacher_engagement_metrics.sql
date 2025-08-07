
DECLARE
    start_date TIMESTAMP;
BEGIN
    -- Set date range based on time_range parameter
    CASE time_range
        WHEN '7days' THEN start_date := NOW() - INTERVAL '7 days';
        WHEN '30days' THEN start_date := NOW() - INTERVAL '30 days';
        WHEN '3months' THEN start_date := NOW() - INTERVAL '3 months';
        WHEN '6months' THEN start_date := NOW() - INTERVAL '6 months';
        WHEN '1year' THEN start_date := NOW() - INTERVAL '1 year';
        ELSE start_date := '2020-01-01'::TIMESTAMP;
    END CASE;

    RETURN QUERY
    WITH teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
    ),
    students_in_courses AS (
        SELECT DISTINCT cm.user_id
        FROM public.course_members cm
        WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
        AND cm.role = 'student'
    ),
    progress_data AS (
        SELECT
            ucip.user_id,
            ucip.course_id,
            ucip.status
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
        AND ucip.updated_at >= start_date
    ),
    assignment_data AS (
        SELECT
            asub.status
        FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
        AND asub.user_id IN (SELECT user_id FROM students_in_courses)
        AND asub.submitted_at >= start_date
    )
    SELECT
        (SELECT count(*) FROM students_in_courses) AS total_students,
        (SELECT count(DISTINCT user_id) FROM progress_data) AS active_students,
        CASE
            WHEN (SELECT count(*) FROM students_in_courses) > 0 THEN
                ((SELECT count(DISTINCT user_id) FROM progress_data)::decimal / (SELECT count(*) FROM students_in_courses) * 100)::integer
            ELSE 0
        END AS engagement_rate,
        CASE
            WHEN (SELECT count(*) FROM progress_data) > 0 THEN
                ((SELECT count(*) FROM progress_data WHERE status = 'completed')::decimal / (SELECT count(*) FROM progress_data) * 100)::integer
            ELSE 0
        END AS avg_completion_rate,
        (SELECT count(*) FROM assignment_data) AS total_assignments,
        (SELECT count(*) FROM assignment_data WHERE status = 'pending') AS pending_assignments,
        CASE
            WHEN (SELECT count(*) FROM assignment_data) > 0 THEN
                (((SELECT count(*) FROM assignment_data) - (SELECT count(*) FROM assignment_data WHERE status = 'pending'))::decimal / (SELECT count(*) FROM assignment_data) * 100)::integer
            ELSE 0
        END AS completion_rate;
END;
