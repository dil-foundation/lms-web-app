CREATE OR REPLACE FUNCTION get_admin_engagement_trends_data(p_time_range TEXT)
RETURNS TABLE (
    period_label TEXT,
    active_users BIGINT,
    courses_accessed BIGINT,
    discussions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_interval INTERVAL;
    v_format TEXT;
BEGIN
    -- Determine date range and interval
    CASE p_time_range
        WHEN '7days' THEN
            v_start_date := NOW()::DATE - INTERVAL '6 days';
            v_end_date := NOW()::DATE;
            v_interval := '1 day';
            v_format := 'Dy'; -- Short day name (e.g., 'Mon')
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', NOW() - INTERVAL '3 weeks');
            v_end_date := NOW()::DATE;
            v_interval := '1 week';
            v_format := 'WW'; -- Week number
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '2 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon'; -- Short month name (e.g., 'Jan')
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '5 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
        ELSE -- alltime
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
    END CASE;

    RETURN QUERY
    -- Generate a series of periods for the chart
    WITH time_periods AS (
        SELECT 
            -- For weeks, we need a custom label
            CASE 
                WHEN p_time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start,
            period_start + v_interval AS period_end
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    -- Get aggregated data from user progress
    progress_data AS (
        SELECT
            DATE_TRUNC(
                CASE WHEN v_interval = '1 day' THEN 'day' WHEN v_interval = '1 week' THEN 'week' ELSE 'month' END, 
                ucp.updated_at
            )::DATE AS period_start,
            COUNT(DISTINCT ucp.user_id) AS active_users,
            COUNT(DISTINCT ucp.course_id) AS courses_accessed
        FROM public.user_content_item_progress ucp
        WHERE ucp.updated_at >= v_start_date
        GROUP BY 1
    ),
    -- Get aggregated data from discussions
    discussion_data AS (
        SELECT
            DATE_TRUNC(
                CASE WHEN v_interval = '1 day' THEN 'day' WHEN v_interval = '1 week' THEN 'week' ELSE 'month' END, 
                d.created_at
            )::DATE AS period_start,
            COUNT(DISTINCT d.id) AS discussions
        FROM public.discussions d
        WHERE d.created_at >= v_start_date
        GROUP BY 1
    )
    -- Join all data together
    SELECT
        tp.label,
        COALESCE(pd.active_users, 0) as active_users,
        COALESCE(pd.courses_accessed, 0) as courses_accessed,
        COALESCE(dd.discussions, 0) as discussions
    FROM time_periods tp
    LEFT JOIN progress_data pd ON tp.period_start = pd.period_start
    LEFT JOIN discussion_data dd ON tp.period_start = dd.period_start
    ORDER BY tp.period_start;

END;
$$;