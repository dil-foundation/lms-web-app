DROP FUNCTION IF EXISTS public.get_engagement_data(TEXT);

CREATE OR REPLACE FUNCTION public.get_engagement_data(time_range TEXT)
RETURNS TABLE(
    period_label TEXT,
    active_users INTEGER,
    time_spent INTEGER,
    courses INTEGER,
    discussions INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      period_type := 'week';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      period_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      period_type := 'month';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
      period_type := 'month';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT 
      generate_series(
        date_trunc(period_type, start_date),
        date_trunc(period_type, end_date),
        ('1 ' || period_type)::interval
      ) as period
  )
  SELECT
    TO_CHAR(p.period, 
      CASE 
        WHEN period_type = 'day' THEN 'Mon DD'
        ELSE 'Mon'
      END
    ) AS period_label,
    (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.updated_at >= p.period AND ucp.updated_at < p.period + ('1 ' || period_type)::interval)::INTEGER AS active_users,
    0 AS time_spent, -- Time spent is not tracked, returning 0
    (SELECT COUNT(DISTINCT ucp.course_id) FROM public.user_content_item_progress ucp WHERE ucp.updated_at >= p.period AND ucp.updated_at < p.period + ('1 ' || period_type)::interval)::INTEGER AS courses,
    (SELECT COUNT(DISTINCT d.id) FROM public.discussions d WHERE d.created_at >= p.period AND d.created_at < p.period + ('1 ' || period_type)::interval)::INTEGER AS discussions
  FROM periods p
  ORDER BY p.period;
END;
$$;