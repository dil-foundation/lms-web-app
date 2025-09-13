-- Function to get platform distribution stats with hierarchical filtering
-- This function provides course and assignment statistics filtered by location and educational hierarchy

-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS public.get_admin_platform_stats_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_platform_stats_with_filters(
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
  stat_name TEXT,
  stat_value BIGINT,
  stat_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT 
      c.status,
      COUNT(*) as course_count
    FROM public.courses c
    WHERE 
      -- When no filters are applied, show all courses
      (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
       AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
       AND filter_class_id IS NULL AND filter_grade IS NULL)
      -- When filters are applied, check hierarchy
      OR EXISTS (
        SELECT 1 FROM public.classes cl 
        LEFT JOIN public.schools s ON cl.school_id = s.id
        LEFT JOIN public.boards b ON s.board_id = b.id
        LEFT JOIN public.projects pr ON b.project_id = pr.id
        LEFT JOIN public.cities ci ON pr.city_id = ci.id
        LEFT JOIN public.regions r ON ci.region_id = r.id
        LEFT JOIN public.countries co ON r.country_id = co.id
        WHERE cl.id = ANY(c.class_ids)
          AND (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR ci.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also include courses that match school filters directly
      OR (filter_school_id IS NOT NULL AND filter_school_id = ANY(c.school_ids))
    GROUP BY c.status
  ),
  assignment_stats AS (
    SELECT 
      COUNT(*) as completed_assignments
    FROM public.assignment_submissions asub
    JOIN public.profiles p ON asub.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON s.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities ci ON pr.city_id = ci.id
    LEFT JOIN public.regions r ON ci.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      asub.status = 'completed'
      -- Apply location and hierarchy filters
      AND (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR ci.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include assignments from users not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_class_id IS NULL AND filter_school_id IS NULL 
          AND filter_board_id IS NULL AND filter_project_id IS NULL 
          AND filter_city_id IS NULL AND filter_region_id IS NULL 
          AND filter_country_id IS NULL AND filter_grade IS NULL)
  )
  SELECT 
    'Active Courses'::TEXT as stat_name,
    COALESCE(SUM(cs.course_count) FILTER (WHERE cs.status = 'Published'), 0)::BIGINT as stat_value,
    '#3B82F6'::TEXT as stat_color
  FROM course_stats cs
  
  UNION ALL
  
  SELECT 
    'Draft Courses'::TEXT as stat_name,
    COALESCE(SUM(cs.course_count) FILTER (WHERE cs.status = 'Draft'), 0)::BIGINT as stat_value,
    '#F59E0B'::TEXT as stat_color
  FROM course_stats cs
  
  UNION ALL
  
  SELECT 
    'Archived Courses'::TEXT as stat_name,
    COALESCE(SUM(cs.course_count) FILTER (WHERE cs.status = 'Archived'), 0)::BIGINT as stat_value,
    '#6B7280'::TEXT as stat_color
  FROM course_stats cs
  
  UNION ALL
  
  SELECT 
    'Completed Assignments'::TEXT as stat_name,
    COALESCE(ast.completed_assignments, 0)::BIGINT as stat_value,
    '#10B981'::TEXT as stat_color
  FROM assignment_stats ast;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_platform_stats_with_filters(uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_admin_platform_stats_with_filters IS 'Get platform distribution stats with hierarchical filtering for admin dashboard';
