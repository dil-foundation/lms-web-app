-- Function to get engagement trends data with hierarchical filtering
-- This function provides engagement metrics filtered by location and educational hierarchy

CREATE OR REPLACE FUNCTION public.get_admin_engagement_trends_data_with_filters(
  p_time_range TEXT DEFAULT '7days',
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
  active_users BIGINT,
  courses_accessed BIGINT,
  discussions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_start DATE;
  date_end DATE;
BEGIN
  -- Calculate date range based on time_range parameter
  date_end := CURRENT_DATE;
  
  CASE p_time_range
    WHEN '7days' THEN
      date_start := date_end - INTERVAL '7 days';
    WHEN '30days' THEN
      date_start := date_end - INTERVAL '30 days';
    WHEN '3months' THEN
      date_start := date_end - INTERVAL '3 months';
    WHEN '6months' THEN
      date_start := date_end - INTERVAL '6 months';
    WHEN '1year' THEN
      date_start := date_end - INTERVAL '1 year';
    ELSE
      date_start := date_end - INTERVAL '7 days';
  END CASE;

  RETURN QUERY
  WITH time_periods AS (
    SELECT period_date FROM (
      SELECT generate_series(date_start, date_end, '1 day'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '7days'
      UNION ALL
      SELECT generate_series(date_start, date_end, '7 days'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '30days'
      UNION ALL
      SELECT DATE_TRUNC('month', generate_series(date_start, date_end, '1 month'::INTERVAL))::DATE as period_date
      WHERE p_time_range IN ('3months', '6months', '1year')
      UNION ALL
      SELECT generate_series(date_start, date_end, '1 day'::INTERVAL)::DATE as period_date
      WHERE p_time_range NOT IN ('7days', '30days', '3months', '6months', '1year')
    ) t
  ),
  active_users_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT ucip.user_id) as active_users
    FROM time_periods tp
    LEFT JOIN public.user_content_item_progress ucip ON 
      CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', ucip.updated_at)::DATE = tp.period_date
        ELSE
          DATE(ucip.updated_at) = tp.period_date
      END
    GROUP BY tp.period_date
  ),
  courses_accessed_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT ucip.course_id) as courses_accessed
    FROM time_periods tp
    LEFT JOIN public.user_content_item_progress ucip ON 
      CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', ucip.updated_at)::DATE = tp.period_date
        ELSE
          DATE(ucip.updated_at) = tp.period_date
      END
    GROUP BY tp.period_date
  ),
  discussions_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT d.id) as discussions
    FROM time_periods tp
    LEFT JOIN public.discussions d ON 
      CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', d.created_at)::DATE = tp.period_date
        ELSE
          DATE(d.created_at) = tp.period_date
      END
    GROUP BY tp.period_date
  )
  SELECT 
    CASE p_time_range
      WHEN '7days' THEN
        TO_CHAR(au.period_date, 'Dy')
      WHEN '30days' THEN
        'Week ' || EXTRACT(WEEK FROM au.period_date)::TEXT
      WHEN '3months' THEN
        TO_CHAR(au.period_date, 'Mon')
      WHEN '6months' THEN
        TO_CHAR(au.period_date, 'Mon')
      WHEN '1year' THEN
        TO_CHAR(au.period_date, 'Mon')
      ELSE
        TO_CHAR(au.period_date, 'Dy')
    END as period_label,
    COALESCE(au.active_users, 0) as active_users,
    COALESCE(ca.courses_accessed, 0) as courses_accessed,
    COALESCE(dd.discussions, 0) as discussions
  FROM active_users_data au
  LEFT JOIN courses_accessed_data ca ON au.period_date = ca.period_date
  LEFT JOIN discussions_data dd ON au.period_date = dd.period_date
  ORDER BY au.period_date;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_engagement_trends_data_with_filters TO authenticated;
