DROP FUNCTION IF EXISTS public.get_teacher_engagement_metrics(uuid, text);

CREATE OR REPLACE FUNCTION public.get_teacher_engagement_metrics(
    p_teacher_id UUID,
    p_time_range TEXT
)
RETURNS TABLE (
    total_students BIGINT,
    active_students BIGINT,
    engagement_rate INTEGER,
    avg_completion_rate INTEGER,
    total_assignments BIGINT,
    pending_assignments BIGINT,
    completion_rate INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    v_end_date := NOW();
    -- Set date range based on p_time_range parameter
    CASE p_time_range
        WHEN '7days' THEN v_start_date := v_end_date - INTERVAL '7 days';
        WHEN '30days' THEN v_start_date := v_end_date - INTERVAL '30 days';
        WHEN '3months' THEN v_start_date := v_end_date - INTERVAL '3 months';
        WHEN '6months' THEN v_start_date := v_end_date - INTERVAL '6 months';
        WHEN '1year' THEN v_start_date := v_end_date - INTERVAL '1 year';
        ELSE v_start_date := '2020-01-01'::TIMESTAMPTZ;
    END CASE;

    RETURN QUERY
    WITH teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
    ),
    students_in_courses AS (
        SELECT DISTINCT cm.user_id
        FROM public.course_members cm
        WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
        AND cm.role = 'student'
    ),
    active_students_list AS (
        -- Students who have any progress
        SELECT DISTINCT user_id FROM public.user_content_item_progress
        WHERE course_id IN (SELECT course_id FROM teacher_courses) AND updated_at BETWEEN v_start_date AND v_end_date
        UNION
        -- Students who have submitted assignments
        SELECT DISTINCT asub.user_id FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses) AND asub.submitted_at BETWEEN v_start_date AND v_end_date
        UNION
        -- Students who have submitted quizzes
        SELECT DISTINCT qsub.user_id FROM public.quiz_submissions qsub
        JOIN public.course_lessons cl ON qsub.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses) AND qsub.submitted_at BETWEEN v_start_date AND v_end_date
    ),
    all_progress AS (
        SELECT status, user_id FROM public.user_content_item_progress
        WHERE course_id IN (SELECT course_id FROM teacher_courses)
        AND user_id IN (SELECT user_id FROM students_in_courses)
        AND updated_at BETWEEN v_start_date AND v_end_date
    ),
    assignment_data AS (
        SELECT asub.status
        FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
        AND asub.user_id IN (SELECT user_id FROM students_in_courses)
        AND asub.submitted_at BETWEEN v_start_date AND v_end_date
    )
    SELECT
        (SELECT COUNT(*) FROM students_in_courses) AS total_students,
        (SELECT COUNT(DISTINCT user_id) FROM active_students_list) AS active_students,
        CASE
            WHEN (SELECT COUNT(*) FROM students_in_courses) > 0 THEN
                (((SELECT COUNT(DISTINCT user_id) FROM active_students_list)::DECIMAL / (SELECT COUNT(*) FROM students_in_courses)) * 100)::INTEGER
            ELSE 0
        END AS engagement_rate,
        CASE
            WHEN (SELECT COUNT(*) FROM all_progress) > 0 THEN
                (((SELECT COUNT(*) FROM all_progress WHERE status = 'completed')::DECIMAL / (SELECT COUNT(*) FROM all_progress)) * 100)::INTEGER
            ELSE 0
        END AS avg_completion_rate,
        (SELECT COUNT(*) FROM assignment_data) AS total_assignments,
        (SELECT COUNT(*) FROM assignment_data WHERE status = 'pending') AS pending_assignments,
        CASE
            WHEN (SELECT COUNT(*) FROM all_progress) > 0 THEN
                (((SELECT COUNT(*) FROM all_progress WHERE status = 'completed'))::decimal / (SELECT count(*) FROM all_progress) * 100)::integer
            ELSE 0
        END AS completion_rate;
END;
$$;