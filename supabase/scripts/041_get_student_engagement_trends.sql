DROP FUNCTION IF EXISTS get_student_engagement_trends(uuid, text);

CREATE OR REPLACE FUNCTION get_student_engagement_trends(teacher_id UUID, time_range TEXT)
RETURNS TABLE (
    period_label TEXT,
    active_students INTEGER,
    completion_rate INTEGER,
    time_spent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_interval INTERVAL;
    v_format TEXT;
    v_period_type TEXT;
BEGIN
    -- Determine date range and interval
    CASE time_range
        WHEN '7days' THEN
            v_start_date := NOW()::DATE - INTERVAL '6 days';
            v_end_date := NOW()::DATE;
            v_interval := '1 day';
            v_format := 'Dy';
            v_period_type := 'day';
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', NOW() - INTERVAL '3 weeks');
            v_end_date := NOW()::DATE;
            v_interval := '1 week';
            v_format := 'WW';
            v_period_type := 'week';
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '2 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '5 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        ELSE -- alltime
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
    END CASE;

    RETURN QUERY
    WITH time_periods AS (
        SELECT 
            CASE 
                WHEN time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start::DATE
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
    ),
    activity_data AS (
        SELECT
            date_trunc(v_period_type, ucip.updated_at)::DATE as period_start,
            COUNT(DISTINCT ucip.user_id) as active_students,
            COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_lessons,
            COUNT(ucip.id) as total_activities,
            COALESCE(SUM((ucip.progress_data->>'time_spent_seconds')::numeric), 0) as total_time_spent
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.updated_at >= v_start_date
        GROUP BY 1
    )
    SELECT
        tp.label AS period_label,
        COALESCE(ad.active_students, 0)::INTEGER,
        CASE 
            WHEN ad.total_activities > 0 THEN 
            ROUND((ad.completed_lessons::DECIMAL / ad.total_activities) * 100)::INTEGER
            ELSE 0
        END as completion_rate,
        ROUND(COALESCE(ad.total_time_spent, 0) / 60)::INTEGER as time_spent
    FROM time_periods tp
    LEFT JOIN activity_data ad ON tp.period_start = ad.period_start
    ORDER BY tp.period_start;
END;
$$;