CREATE OR REPLACE FUNCTION public.get_engagement_metrics_data(time_range TEXT)
RETURNS TABLE(
    period_label TEXT,
    active_users INTEGER,
    assignments_submitted INTEGER,
    quiz_submissions INTEGER,
    lessons_completed INTEGER,
    discussions_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  interval_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      interval_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      interval_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      interval_type := 'month';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      interval_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      interval_type := 'month';
    ELSE -- alltime
      start_date := NOW() - INTERVAL '2 years';
      interval_type := 'quarter';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT generate_series(
      date_trunc(interval_type, start_date),
      date_trunc(interval_type, end_date),
      (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval
    ) as period
  ),
  active_users_by_period AS (
    SELECT
      date_trunc(interval_type, ucp.updated_at) as period,
      COUNT(DISTINCT ucp.user_id) as value
    FROM public.user_content_item_progress ucp
    WHERE ucp.updated_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  assignments_by_period AS (
    SELECT
      date_trunc(interval_type, asub.submitted_at) as period,
      COUNT(asub.id) as value
    FROM public.assignment_submissions asub
    WHERE asub.submitted_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  quizzes_by_period AS (
    SELECT
      date_trunc(interval_type, qsub.submitted_at) as period,
      COUNT(qsub.id) as value
    FROM public.quiz_submissions qsub
    WHERE qsub.submitted_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  lessons_by_period AS (
    SELECT
      date_trunc(interval_type, ucp.completed_at) as period,
      COUNT(ucp.id) as value
    FROM public.user_content_item_progress ucp
    WHERE ucp.completed_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  discussions_by_period AS (
    SELECT
      date_trunc(interval_type, d.created_at) as period,
      COUNT(d.id) as value
    FROM public.discussions d
    WHERE d.created_at BETWEEN start_date AND end_date
    GROUP BY 1
  )
  SELECT
    TO_CHAR(p.period, 
      CASE 
        WHEN interval_type = 'day' THEN 'YYYY-MM-DD'
        WHEN interval_type = 'month' THEN 'YYYY-Mon'
        WHEN interval_type = 'quarter' THEN 'YYYY "Q"Q'
      END
    ) AS period_label,
    COALESCE(au.value, 0)::INTEGER AS active_users,
    COALESCE(ap.value, 0)::INTEGER AS assignments_submitted,
    COALESCE(qp.value, 0)::INTEGER AS quiz_submissions,
    COALESCE(lp.value, 0)::INTEGER AS lessons_completed,
    COALESCE(dp.value, 0)::INTEGER AS discussions_created
  FROM periods p
  LEFT JOIN active_users_by_period au ON p.period = au.period
  LEFT JOIN assignments_by_period ap ON p.period = ap.period
  LEFT JOIN quizzes_by_period qp ON p.period = qp.period
  LEFT JOIN lessons_by_period lp ON p.period = lp.period
  LEFT JOIN discussions_by_period dp ON p.period = dp.period
  ORDER BY p.period;
END;
$$;