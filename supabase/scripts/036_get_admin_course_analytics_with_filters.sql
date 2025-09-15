-- Function to get course analytics with hierarchical filtering
-- This function provides course performance data filtered by location and educational hierarchy

-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS public.get_admin_course_analytics_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_course_analytics_with_filters(
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
  course_id UUID,
  course_title TEXT,
  enrolled_students BIGINT,
  completed_students BIGINT,
  completion_rate NUMERIC,
  average_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH course_enrollments AS (
    SELECT 
      c.id as course_id,
      c.title as course_title,
      COUNT(DISTINCT cm.user_id) as enrolled_students,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN cm.user_id END) as completed_students,
      CASE 
        WHEN COUNT(DISTINCT cm.user_id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN cm.user_id END)::NUMERIC / COUNT(DISTINCT cm.user_id)::NUMERIC) * 100, 2)
        ELSE 0 
      END as completion_rate
    FROM public.courses c
    LEFT JOIN public.course_members cm ON c.id = cm.course_id AND cm.role = 'student'
    LEFT JOIN public.user_content_item_progress ucp ON cm.user_id = ucp.user_id AND c.id = ucp.course_id
    LEFT JOIN public.profiles p ON cm.user_id = p.id AND p.role = 'student'
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.classes cl ON cs.class_id = cl.id
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities ci ON pr.city_id = ci.id
    LEFT JOIN public.regions r ON ci.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE c.status = 'Published'
      AND (
        -- When no filters are applied, show all published courses
        (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
         AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
         AND filter_class_id IS NULL AND filter_grade IS NULL)
        -- When filters are applied, check hierarchy
        OR (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR ci.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also filter courses by their class_ids and school_ids arrays
      AND (filter_class_id IS NULL OR filter_class_id = ANY(c.class_ids))
      AND (filter_school_id IS NULL OR filter_school_id = ANY(c.school_ids))
      AND (filter_grade IS NULL OR EXISTS (
        SELECT 1 FROM classes cl2 
        WHERE cl2.id = ANY(c.class_ids) 
        AND cl2.grade = filter_grade
      ))
    GROUP BY c.id, c.title
  ),
  course_scores AS (
    SELECT 
      c.id as course_id,
      AVG(COALESCE(qs.score, 0))::NUMERIC as average_score
    FROM public.courses c
    LEFT JOIN public.course_members cm ON c.id = cm.course_id AND cm.role = 'student'
    LEFT JOIN public.quiz_submissions qs ON cm.user_id = qs.user_id AND c.id = qs.course_id
    LEFT JOIN public.profiles p ON cm.user_id = p.id AND p.role = 'student'
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.classes cl ON cs.class_id = cl.id
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities ci ON pr.city_id = ci.id
    LEFT JOIN public.regions r ON ci.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE c.status = 'Published'
      AND (
        -- When no filters are applied, show all published courses
        (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
         AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
         AND filter_class_id IS NULL AND filter_grade IS NULL)
        -- When filters are applied, check hierarchy
        OR (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR ci.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also filter courses by their class_ids and school_ids arrays
      AND (filter_class_id IS NULL OR filter_class_id = ANY(c.class_ids))
      AND (filter_school_id IS NULL OR filter_school_id = ANY(c.school_ids))
      AND (filter_grade IS NULL OR EXISTS (
        SELECT 1 FROM classes cl2 
        WHERE cl2.id = ANY(c.class_ids) 
        AND cl2.grade = filter_grade
      ))
    GROUP BY c.id
  )
  SELECT 
    ce.course_id,
    ce.course_title,
    ce.enrolled_students,
    ce.completed_students,
    ce.completion_rate,
    COALESCE(cs.average_score, 0) as average_score
  FROM course_enrollments ce
  LEFT JOIN course_scores cs ON ce.course_id = cs.course_id
  ORDER BY ce.enrolled_students DESC, ce.completion_rate DESC
  LIMIT 20;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_course_analytics_with_filters(uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) TO authenticated;
