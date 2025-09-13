DROP FUNCTION IF EXISTS get_engagement_trends_data_with_filters CASCADE;

CREATE OR REPLACE FUNCTION get_engagement_trends_data_with_filters(
    p_teacher_id UUID,
    p_time_range TEXT DEFAULT '30days',
    filter_country_id UUID DEFAULT NULL,
    filter_region_id UUID DEFAULT NULL,
    filter_city_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL,
    filter_board_id UUID DEFAULT NULL,
    filter_school_id UUID DEFAULT NULL,
    filter_grade TEXT DEFAULT NULL,
    filter_class_id UUID DEFAULT NULL
)
RETURNS TABLE (
    week_label TEXT,
    discussions_count BIGINT,
    assignments_count BIGINT,
    quizzes_count BIGINT,
    videos_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE p_time_range
    WHEN '7days' THEN start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN start_date := NOW() - INTERVAL '1 year';
    ELSE -- alltime (limit to a reasonable past for performance, e.g. 2 years)
      start_date := NOW() - INTERVAL '2 years';
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT cm.course_id
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
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  weeks AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY week_start) as week_number,
      'Week ' || ROW_NUMBER() OVER (ORDER BY week_start)::TEXT as week_label,
      week_start
    FROM generate_series(
      date_trunc('week', start_date),
      date_trunc('week', NOW()),
      '1 week'::INTERVAL
    ) as gs(week_start)
  ),
  discussions_by_week AS (
      SELECT
          date_trunc('week', d.created_at) as week_start,
          COUNT(d.id) as count
      FROM public.discussions d
      WHERE d.course_id IN (SELECT course_id FROM teacher_courses)
      AND d.created_at >= start_date
      GROUP BY 1
  ),
  assignments_by_week AS (
      SELECT
          date_trunc('week', asub.submitted_at) as week_start,
          COUNT(asub.id) as count
      FROM public.assignment_submissions asub
      JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
      JOIN public.course_lessons cl ON clc.lesson_id = cl.id
      JOIN public.course_sections cs ON cl.section_id = cs.id
      WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
      AND asub.submitted_at >= start_date
      AND asub.user_id IN (SELECT user_id FROM filtered_students)
      GROUP BY 1
  ),
  quizzes_by_week AS (
      SELECT
          date_trunc('week', qs.submitted_at) as week_start,
          COUNT(qs.id) as count
      FROM public.quiz_submissions qs
      JOIN public.course_lessons cl ON qs.lesson_id = cl.id
      JOIN public.course_sections cs ON cl.section_id = cs.id
      WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
      AND qs.submitted_at >= start_date
      AND qs.user_id IN (SELECT user_id FROM filtered_students)
      GROUP BY 1
  ),
  videos_by_week AS (
      SELECT
          date_trunc('week', ucip.updated_at) as week_start,
          COUNT(ucip.id) as count
      FROM public.user_content_item_progress ucip
      JOIN public.course_lesson_content clc ON ucip.lesson_content_id = clc.id
      WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
      AND clc.content_type = 'video'
      AND (ucip.progress_data->>'time_spent_seconds')::numeric > 0
      AND ucip.updated_at >= start_date
      AND ucip.user_id IN (SELECT user_id FROM filtered_students)
      GROUP BY 1
  )
  SELECT
      w.week_label,
      COALESCE(d.count, 0),
      COALESCE(a.count, 0),
      COALESCE(q.count, 0),
      COALESCE(v.count, 0)
  FROM weeks w
  LEFT JOIN discussions_by_week d ON w.week_start = d.week_start
  LEFT JOIN assignments_by_week a ON w.week_start = a.week_start
  LEFT JOIN quizzes_by_week q ON w.week_start = q.week_start
  LEFT JOIN videos_by_week v ON w.week_start = v.week_start
  ORDER BY w.week_number;
END;
$$;

GRANT EXECUTE ON FUNCTION get_engagement_trends_data_with_filters(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, uuid) TO authenticated;
COMMENT ON FUNCTION get_engagement_trends_data_with_filters(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, uuid) IS 'Get engagement trends data with hierarchical and grade filtering';
