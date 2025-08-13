-- FORCE REFRESH: Drop and recreate function to clear all caches
-- Version: 2025-08-13-03:20 - Complete version with SECURITY DEFINER
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
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_result_total_students BIGINT;
    v_result_active_students BIGINT;
    v_result_engagement_rate INTEGER;
    v_result_avg_completion_rate INTEGER;
    v_result_total_assignments BIGINT;
    v_result_pending_assignments BIGINT;
    v_result_completion_rate INTEGER;
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

    -- Get the complete result with all metrics
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
        -- Students who have any progress (no time filter for engagement calculation)
        SELECT DISTINCT user_id FROM public.user_content_item_progress
        WHERE course_id IN (SELECT course_id FROM teacher_courses)
        UNION
        -- Students who have submitted assignments
        SELECT DISTINCT asub.user_id FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
        UNION
        -- Students who have submitted quizzes
        SELECT DISTINCT qsub.user_id FROM public.quiz_submissions qsub
        JOIN public.course_lessons cl ON qsub.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    ),
    student_completion_percentages AS (
        SELECT 
            ucip.user_id,
            ucip.course_id,
            COUNT(*) as total_content_items,
            COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_items,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND((COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100)
                ELSE 0 
            END as completion_percentage
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
        GROUP BY ucip.user_id, ucip.course_id
    ),
    student_avg_completion AS (
        SELECT 
            user_id,
            AVG(completion_percentage) as avg_completion_percentage
        FROM student_completion_percentages
        GROUP BY user_id
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
        (SELECT COUNT(*) FROM students_in_courses),
        (SELECT COUNT(DISTINCT user_id) FROM active_students_list),
        CASE
            WHEN (SELECT COUNT(*) FROM students_in_courses) > 0 THEN
                COALESCE(
                    (SELECT AVG(avg_completion_percentage)::INTEGER 
                     FROM student_avg_completion), 
                    0
                )
            ELSE 0
        END,
        CASE
            WHEN (SELECT COUNT(*) FROM all_progress) > 0 THEN
                (((SELECT COUNT(*) FROM all_progress WHERE status = 'completed')::DECIMAL / (SELECT COUNT(*) FROM all_progress)) * 100)::INTEGER
            ELSE 0
        END,
        (SELECT COUNT(*) FROM assignment_data),
        (SELECT COUNT(*) FROM assignment_data WHERE status = 'pending'),
        CASE
            WHEN (SELECT COUNT(*) FROM all_progress) > 0 THEN
                (((SELECT COUNT(*) FROM all_progress WHERE status = 'completed'))::decimal / (SELECT count(*) FROM all_progress) * 100)::integer
            ELSE 0
        END
    INTO 
        v_result_total_students,
        v_result_active_students,
        v_result_engagement_rate,
        v_result_avg_completion_rate,
        v_result_total_assignments,
        v_result_pending_assignments,
        v_result_completion_rate;

    -- Return the complete result
    RETURN QUERY SELECT 
        v_result_total_students::BIGINT,
        v_result_active_students::BIGINT,
        v_result_engagement_rate::INTEGER,
        v_result_avg_completion_rate::INTEGER,
        v_result_total_assignments::BIGINT,
        v_result_pending_assignments::BIGINT,
        v_result_completion_rate::INTEGER;
END;
$$;