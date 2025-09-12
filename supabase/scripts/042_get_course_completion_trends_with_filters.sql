DROP FUNCTION IF EXISTS get_course_completion_trends_with_filters(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION get_course_completion_trends_with_filters(
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
    month_label TEXT,
    course_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE p_time_range
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
  students_in_courses AS (
    SELECT DISTINCT cm.user_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
      AND cm.user_id IN (SELECT user_id FROM filtered_students)
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
