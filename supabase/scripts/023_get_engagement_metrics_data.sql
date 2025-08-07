DROP FUNCTION IF EXISTS public.get_engagement_metrics_data(TEXT);

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
    SELECT 
      generate_series(
        date_trunc(
          CASE WHEN interval_type = 'quarter' THEN 'month' ELSE interval_type END,
          start_date
        ),
        date_trunc(
          CASE WHEN interval_type = 'quarter' THEN 'month' ELSE interval_type END,
          end_date
        ),
        (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval
      ) as period
  )
  SELECT
    TO_CHAR(p.period, 
      CASE 
        WHEN interval_type = 'day' THEN 'YYYY-MM-DD'
        WHEN interval_type = 'month' THEN 'YYYY-Mon'
        WHEN interval_type = 'quarter' THEN 'YYYY "Q"Q'
      END
    ) AS period_label,
    (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.updated_at >= p.period AND ucp.updated_at < p.period + (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval)::INTEGER AS active_users,
    (SELECT COUNT(asub.id) FROM public.assignment_submissions asub WHERE asub.submitted_at >= p.period AND asub.submitted_at < p.period + (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval)::INTEGER AS assignments_submitted,
    (SELECT COUNT(qsub.id) FROM public.quiz_submissions qsub WHERE qsub.submitted_at >= p.period AND qsub.submitted_at < p.period + (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval)::INTEGER AS quiz_submissions,
    (SELECT COUNT(ucp.id) FROM public.user_content_item_progress ucp WHERE ucp.completed_at >= p.period AND ucp.completed_at < p.period + (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval)::INTEGER AS lessons_completed,
    (SELECT COUNT(d.id) FROM public.discussions d WHERE d.created_at >= p.period AND d.created_at < p.period + (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval)::INTEGER AS discussions_created
  FROM periods p
  ORDER BY p.period;
END;
$$;