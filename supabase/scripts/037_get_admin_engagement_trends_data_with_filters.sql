-- Function to get engagement trends data with hierarchical filtering
-- This function provides engagement metrics filtered by location and educational hierarchy

-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS public.get_admin_engagement_trends_data_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_engagement_trends_data_with_filters(
  p_time_range TEXT DEFAULT '7days',
  filter_country_id UUID DEFAULT NULL,
  filter_region_id UUID DEFAULT NULL,
  filter_city_id UUID DEFAULT NULL,
  filter_project_id UUID DEFAULT NULL,
  filter_board_id UUID DEFAULT NULL,
  filter_school_id UUID DEFAULT NULL,
  filter_class_id UUID DEFAULT NULL,
  filter_grade TEXT DEFAULT NULL
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
    LEFT JOIN public.profiles p ON ucip.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include users who are not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
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
    LEFT JOIN public.profiles p ON ucip.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include users who are not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  ),
  discussions_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT d.id) as discussions
    FROM time_periods tp
    LEFT JOIN public.discussions d ON 1=1
    LEFT JOIN public.discussion_replies dr ON d.id = dr.discussion_id
      AND CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', dr.created_at)::DATE = tp.period_date
        ELSE
          DATE(dr.created_at) = tp.period_date
      END
    LEFT JOIN public.profiles p ON dr.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include discussions from users not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
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
GRANT EXECUTE ON FUNCTION public.get_admin_engagement_trends_data_with_filters(text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) TO authenticated;
