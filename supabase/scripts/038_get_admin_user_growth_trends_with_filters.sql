-- Function to get user growth trends with hierarchical filtering
-- This function provides user growth data filtered by location and educational hierarchy

-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS public.get_admin_user_growth_trends_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_user_growth_trends_with_filters(
  p_time_range TEXT DEFAULT '30days',
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
  total_users BIGINT,
  teachers BIGINT,
  students BIGINT,
  admins BIGINT,
  active_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_start DATE;
  date_end DATE;
BEGIN
  -- Set date range based on time_range parameter
  CASE p_time_range
    WHEN '7days' THEN
      date_start := CURRENT_DATE - INTERVAL '7 days';
      date_end := CURRENT_DATE;
    WHEN '30days' THEN
      date_start := CURRENT_DATE - INTERVAL '30 days';
      date_end := CURRENT_DATE;
    WHEN '3months' THEN
      date_start := CURRENT_DATE - INTERVAL '3 months';
      date_end := CURRENT_DATE;
    WHEN '6months' THEN
      date_start := CURRENT_DATE - INTERVAL '6 months';
      date_end := CURRENT_DATE;
    WHEN '1year' THEN
      date_start := CURRENT_DATE - INTERVAL '1 year';
      date_end := CURRENT_DATE;
    ELSE
      date_start := CURRENT_DATE - INTERVAL '30 days';
      date_end := CURRENT_DATE;
  END CASE;

  RETURN QUERY
  WITH time_periods AS (
    -- Generate time periods based on the range using separate CTEs
    SELECT period_date FROM (
      SELECT generate_series(date_start::DATE, date_end::DATE, '1 day'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '7days'
      UNION ALL
      SELECT generate_series(date_start::DATE, date_end::DATE, '7 days'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '30days'
      UNION ALL
      SELECT generate_series(date_start::DATE, date_end::DATE, '1 month'::INTERVAL)::DATE as period_date
      WHERE p_time_range IN ('3months', '6months', '1year')
      UNION ALL
      SELECT generate_series(date_start::DATE, date_end::DATE, '7 days'::INTERVAL)::DATE as period_date
      WHERE p_time_range NOT IN ('7days', '30days', '3months', '6months', '1year')
    ) periods
  ),
  user_counts AS (
    SELECT 
      tp.period_date,
      COUNT(*) FILTER (WHERE p.created_at <= tp.period_date) as total_users,
      COUNT(*) FILTER (WHERE p.role = 'teacher' AND p.created_at <= tp.period_date) as teachers,
      COUNT(*) FILTER (WHERE p.role = 'student' AND p.created_at <= tp.period_date) as students,
      COUNT(*) FILTER (WHERE p.role = 'admin' AND p.created_at <= tp.period_date) as admins
    FROM time_periods tp
    CROSS JOIN public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON s.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      -- Apply location and hierarchy filters
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include admin users when no class-based filters are applied
      OR (p.role = 'admin' AND filter_class_id IS NULL AND filter_school_id IS NULL 
          AND filter_board_id IS NULL AND filter_project_id IS NULL 
          AND filter_city_id IS NULL AND filter_region_id IS NULL 
          AND filter_country_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  ),
  active_users_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT ucip.user_id) as active_users
    FROM time_periods tp
    LEFT JOIN public.user_content_item_progress ucip ON (
      (p_time_range = '7days' AND DATE(ucip.updated_at) = tp.period_date) OR
      (p_time_range = '30days' AND DATE_TRUNC('week', ucip.updated_at)::DATE = tp.period_date) OR
      (p_time_range IN ('3months', '6months', '1year') AND DATE_TRUNC('month', ucip.updated_at)::DATE = tp.period_date) OR
      (p_time_range NOT IN ('7days', '30days', '3months', '6months', '1year') AND DATE_TRUNC('week', ucip.updated_at)::DATE = tp.period_date)
    )
    LEFT JOIN public.profiles p ON ucip.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON s.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      -- Apply location and hierarchy filters
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include admin users when no class-based filters are applied
      OR (p.role = 'admin' AND filter_class_id IS NULL AND filter_school_id IS NULL 
          AND filter_board_id IS NULL AND filter_project_id IS NULL 
          AND filter_city_id IS NULL AND filter_region_id IS NULL 
          AND filter_country_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  )
  SELECT 
    CASE p_time_range
      WHEN '7days' THEN
        TO_CHAR(tp.period_date, 'Dy')
      WHEN '30days' THEN
        'Week ' || ROW_NUMBER() OVER (ORDER BY tp.period_date)
      WHEN '3months' THEN
        TO_CHAR(tp.period_date, 'Mon')
      WHEN '6months' THEN
        TO_CHAR(tp.period_date, 'Mon')
      WHEN '1year' THEN
        TO_CHAR(tp.period_date, 'Mon')
      ELSE
        'Week ' || ROW_NUMBER() OVER (ORDER BY tp.period_date)
    END as period_label,
    COALESCE(uc.total_users, 0) as total_users,
    COALESCE(uc.teachers, 0) as teachers,
    COALESCE(uc.students, 0) as students,
    COALESCE(uc.admins, 0) as admins,
    COALESCE(au.active_users, 0) as active_users
  FROM time_periods tp
  LEFT JOIN user_counts uc ON tp.period_date = uc.period_date
  LEFT JOIN active_users_data au ON tp.period_date = au.period_date
  ORDER BY tp.period_date;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_user_growth_trends_with_filters(text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_admin_user_growth_trends_with_filters IS 'Get user growth trends data with hierarchical filtering for admin dashboard';
