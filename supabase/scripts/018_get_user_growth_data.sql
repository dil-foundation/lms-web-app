DROP FUNCTION IF EXISTS public.get_user_growth_data(TEXT);

CREATE OR REPLACE FUNCTION public.get_user_growth_data(time_range TEXT)
RETURNS TABLE(
    period_label TEXT,
    total_users BIGINT,
    total_teachers BIGINT,
    total_students BIGINT,
    total_admins BIGINT,
    active_users BIGINT
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
      start_date := NOW() - INTERVAL '6 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '29 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := date_trunc('month', NOW() - INTERVAL '2 months');
      period_type := 'month';
    WHEN '6months' THEN
      start_date := date_trunc('month', NOW() - INTERVAL '5 months');
      period_type := 'month';
    WHEN '1year' THEN
      start_date := date_trunc('month', NOW() - INTERVAL '11 months');
      period_type := 'month';
    ELSE -- alltime
      start_date := date_trunc('month', NOW() - INTERVAL '11 months');
      period_type := 'month';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT generate_series(
      date_trunc(period_type, start_date),
      date_trunc(period_type, end_date),
      ('1 ' || period_type)::interval
    ) as period
  ),
  user_creations_by_period AS (
      SELECT
          date_trunc(period_type, created_at) AS period,
          COUNT(*) FILTER (WHERE role = 'teacher') as new_teachers,
          COUNT(*) FILTER (WHERE role = 'student') as new_students,
          COUNT(*) FILTER (WHERE role = 'admin') as new_admins
      FROM public.profiles
      GROUP BY period
  ),
  user_activity_by_period AS (
      SELECT
          date_trunc(period_type, updated_at) AS period,
          COUNT(DISTINCT user_id) as active_users_in_period
      FROM public.user_content_item_progress
      GROUP BY period
  )
  SELECT
      TO_CHAR(p.period, 
        CASE 
          WHEN period_type = 'day' THEN 'Mon DD'
          ELSE 'Mon'
        END
      ) as period_label,
      (SUM(COALESCE(uc.new_teachers, 0) + COALESCE(uc.new_students, 0) + COALESCE(uc.new_admins, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_users,
      (SUM(COALESCE(uc.new_teachers, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_teachers,
      (SUM(COALESCE(uc.new_students, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_students,
      (SUM(COALESCE(uc.new_admins, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_admins,
      (SUM(COALESCE(ua.active_users_in_period, 0)) OVER (ORDER BY p.period ASC))::BIGINT as active_users
  FROM periods p
  LEFT JOIN user_creations_by_period uc ON uc.period = p.period
  LEFT JOIN user_activity_by_period ua ON ua.period = p.period
  ORDER BY p.period;

END;
$$;