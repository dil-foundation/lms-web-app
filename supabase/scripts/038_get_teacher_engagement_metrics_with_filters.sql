DROP FUNCTION IF EXISTS get_teacher_engagement_metrics_with_filters(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION get_teacher_engagement_metrics_with_filters(
    p_teacher_id UUID,
    p_time_range TEXT,
    filter_country_id UUID DEFAULT NULL,
    filter_region_id UUID DEFAULT NULL,
    filter_city_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL,
    filter_board_id UUID DEFAULT NULL,
    filter_school_id UUID DEFAULT NULL,
    filter_class_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_students INTEGER,
    active_students INTEGER,
    engagement_rate INTEGER,
    avg_completion_rate INTEGER,
    total_assignments INTEGER,
    pending_assignments INTEGER,
    completion_rate INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    date_start TIMESTAMP;
BEGIN
    -- Set date range based on time_range parameter
    CASE p_time_range
        WHEN '7days' THEN date_start := NOW() - INTERVAL '7 days';
        WHEN '30days' THEN date_start := NOW() - INTERVAL '30 days';
        WHEN '3months' THEN date_start := NOW() - INTERVAL '3 months';
        WHEN '6months' THEN date_start := NOW() - INTERVAL '6 months';
        WHEN '1year' THEN date_start := NOW() - INTERVAL '1 year';
        ELSE date_start := '2020-01-01'::TIMESTAMP;
    END CASE;

    RETURN QUERY
    WITH teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
    ),
    filtered_students AS (
        SELECT DISTINCT p.id as user_id
        FROM public.profiles p
        LEFT JOIN public.class_students cs ON p.id = cs.student_id
        LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
        LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
        LEFT JOIN public.schools s ON cl.school_id = s.id
        LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
        LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
        LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
        LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
        LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
        WHERE p.role = 'student'
        AND (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
    ),
    students_in_courses AS (
        SELECT DISTINCT cm.user_id
        FROM public.course_members cm
        WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
        AND cm.role = 'student'
        AND cm.user_id IN (SELECT user_id FROM filtered_students)
    ),
    progress_data AS (
        SELECT
            ucip.user_id,
            ucip.course_id,
            ucip.status
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
        AND ucip.updated_at >= date_start
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
        AND asub.submitted_at >= date_start
    )
    SELECT
        (SELECT count(*) FROM students_in_courses)::INTEGER AS total_students,
        (SELECT count(DISTINCT user_id) FROM progress_data)::INTEGER AS active_students,
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
        (SELECT count(*) FROM assignment_data)::INTEGER AS total_assignments,
        (SELECT count(*) FROM assignment_data WHERE status = 'pending')::INTEGER AS pending_assignments,
        CASE
            WHEN (SELECT count(*) FROM assignment_data) > 0 THEN
                (((SELECT count(*) FROM assignment_data) - (SELECT count(*) FROM assignment_data WHERE status = 'pending'))::decimal / (SELECT count(*) FROM assignment_data) * 100)::integer
            ELSE 0
        END AS completion_rate;
END;
$$;
