DROP FUNCTION IF EXISTS get_student_engagement_trends(uuid, text);

CREATE OR REPLACE FUNCTION get_student_engagement_trends(
    teacher_id uuid,
    time_range text
)
RETURNS TABLE (
    period_label text,
    active_students integer,
    completion_rate integer,
    time_spent integer,
    period_number integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
  period_count INTEGER;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
      period_count := 7;
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      period_type := 'week';
      period_count := 4;
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      period_type := 'month';
      period_count := 3;
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      period_type := 'month';
      period_count := 6;
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      period_type := 'month';
      period_count := 12;
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
      period_type := 'month';
      period_count := 12;
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  periods AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY date_series) as period_number,
      CASE period_type
        WHEN 'day' THEN 
          date_series::DATE::TEXT
        WHEN 'week' THEN 
          'Week ' || ROW_NUMBER() OVER (ORDER BY date_series)::TEXT
        WHEN 'month' THEN 
          TO_CHAR(date_series, 'Mon')
      END as period_label,
      date_series as period_start,
      CASE period_type
        WHEN 'day' THEN date_series + INTERVAL '1 day'
        WHEN 'week' THEN date_series + INTERVAL '1 week'
        WHEN 'month' THEN date_series + INTERVAL '1 month'
      END as period_end
    FROM generate_series(
      start_date::DATE,
      end_date::DATE,
      CASE period_type
        WHEN 'day' THEN '1 day'::INTERVAL
        WHEN 'week' THEN '1 week'::INTERVAL
        WHEN 'month' THEN '1 month'::INTERVAL
      END
    ) as date_series
  ),
  activity_data AS (
    SELECT 
      p.period_number,
      p.period_label,
      COUNT(DISTINCT ucip.user_id)::INTEGER as active_students,
      COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_lessons,
      COUNT(ucip.id) as total_activities,
      COALESCE(SUM((ucip.progress_data->>'time_spent_seconds')::numeric), 0) as total_time_spent
    FROM periods p
    LEFT JOIN user_content_item_progress ucip ON ucip.updated_at >= p.period_start AND ucip.updated_at < p.period_end
      AND ucip.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY p.period_number, p.period_label, p.period_start
  )
  SELECT 
    ad.period_label,
    ad.active_students,
    CASE 
      WHEN ad.total_activities > 0 THEN 
        ROUND((ad.completed_lessons::DECIMAL / ad.total_activities) * 100)::INTEGER
      ELSE 0
    END as completion_rate,
    ROUND(ad.total_time_spent / 60)::INTEGER as time_spent,
    ad.period_number::INTEGER as period_number
  FROM activity_data ad
  WHERE ad.total_activities > 0
  ORDER BY ad.period_number;
END;
$$;
