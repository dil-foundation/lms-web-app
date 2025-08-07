DROP FUNCTION IF EXISTS public.get_course_completion_trends(uuid, text);

CREATE OR REPLACE FUNCTION public.get_course_completion_trends(
    teacher_id uuid,
    time_range text
)
RETURNS TABLE (
    month_label text,
    course_data jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN v_start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN v_start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN v_start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN v_start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN v_start_date := NOW() - INTERVAL '1 year';
    ELSE v_start_date := '2020-01-01'::TIMESTAMP;
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
  ),
  months AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY date_series) as month_number,
      TO_CHAR(date_series, 'Mon') as month_label,
      date_series as month_start,
      (date_series + INTERVAL '1 month') as month_end
    FROM generate_series(
      v_start_date::DATE,
      NOW()::DATE,
      '1 month'::INTERVAL
    ) as date_series
  ),
  course_completion AS (
    SELECT 
      m.month_number,
      m.month_label,
      c.title as course_title,
      COUNT(DISTINCT ucip.user_id)::INTEGER as completed_students
    FROM months m
    CROSS JOIN teacher_courses tc
    JOIN public.courses c ON tc.course_id = c.id
    LEFT JOIN public.user_content_item_progress ucip ON c.id = ucip.course_id
      AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
      AND ucip.status = 'completed'
      AND ucip.completed_at >= m.month_start AND ucip.completed_at < m.month_end
    GROUP BY m.month_number, m.month_label, c.title
  )
  SELECT 
    cc.month_label,
    jsonb_object_agg(cc.course_title, cc.completed_students) as course_data
  FROM course_completion cc
  GROUP BY cc.month_number, cc.month_label
  ORDER BY cc.month_number;
END;
$$;