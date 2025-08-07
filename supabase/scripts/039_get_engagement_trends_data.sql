DROP FUNCTION IF EXISTS public.get_engagement_trends_data(UUID, TEXT);
CREATE OR REPLACE FUNCTION get_engagement_trends_data(p_teacher_id UUID, p_time_range TEXT)
RETURNS TABLE (
    week_label TEXT,
    assignments_count BIGINT,
    quizzes_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_interval INTERVAL;
    v_format TEXT;
    v_period_type TEXT;
BEGIN
    v_end_date := NOW();

    CASE p_time_range
        WHEN '7days' THEN
            v_start_date := v_end_date - INTERVAL '6 days';
            v_interval := '1 day';
            v_format := 'Dy';
            v_period_type := 'day';
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', v_end_date - INTERVAL '3 weeks');
            v_interval := '1 week';
            v_format := 'WW';
            v_period_type := 'week';
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', v_end_date - INTERVAL '2 months');
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', v_end_date - INTERVAL '5 months');
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', v_end_date - INTERVAL '11 months');
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        ELSE -- alltime
            v_start_date := '2020-01-01'::TIMESTAMPTZ;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
    END CASE;

    v_start_date := DATE_TRUNC(v_period_type, v_start_date);

    RETURN QUERY
    WITH time_periods AS (
        SELECT 
            CASE 
                WHEN p_time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start::date
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    assignments_by_period AS (
        SELECT
            DATE_TRUNC(v_period_type, asub.submitted_at)::date as period_start,
            COUNT(asub.id) as count
        FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
          AND asub.submitted_at BETWEEN v_start_date AND v_end_date
        GROUP BY 1
    ),
    quizzes_by_period AS (
        SELECT
            DATE_TRUNC(v_period_type, qs.submitted_at)::date as period_start,
            COUNT(qs.id) as count
        FROM public.quiz_submissions qs
        JOIN public.course_lessons cl ON qs.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
          AND qs.submitted_at BETWEEN v_start_date AND v_end_date
        GROUP BY 1
    )
    SELECT
        tp.label AS week_label,
        COALESCE(a.count, 0) AS assignments_count,
        COALESCE(q.count, 0) AS quizzes_count
    FROM time_periods tp
    LEFT JOIN assignments_by_period a ON tp.period_start = a.period_start
    LEFT JOIN quizzes_by_period q ON tp.period_start = q.period_start
    ORDER BY tp.period_start;
END;
$$;