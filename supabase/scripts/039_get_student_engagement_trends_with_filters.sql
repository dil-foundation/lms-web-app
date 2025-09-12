DROP FUNCTION IF EXISTS get_student_engagement_trends_with_filters(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION get_student_engagement_trends_with_filters(
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
    CASE p_time_range
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
                WHEN p_time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start::DATE
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    teacher_courses AS (
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
    activity_data AS (
        SELECT
            date_trunc(v_period_type, ucip.updated_at)::DATE as period_start,
            COUNT(DISTINCT ucip.user_id) as active_students,
            COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_lessons,
            COUNT(ucip.id) as total_activities,
            COALESCE(SUM((ucip.progress_data->>'time_spent_seconds')::numeric), 0) as total_time_spent
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM filtered_students)
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
