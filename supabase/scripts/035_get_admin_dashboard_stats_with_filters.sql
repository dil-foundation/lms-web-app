-- Updated Admin Dashboard Stats Function with Filter Integration
-- This function provides comprehensive dashboard metrics with location and school hierarchy filtering

-- Drop all existing versions of the function first to allow parameter name changes
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats_with_filters(
  time_range TEXT DEFAULT '30days',
  filter_country_id UUID DEFAULT NULL,
  filter_region_id UUID DEFAULT NULL,
  filter_city_id UUID DEFAULT NULL,
  filter_project_id UUID DEFAULT NULL,
  filter_board_id UUID DEFAULT NULL,
  filter_school_id UUID DEFAULT NULL,
  filter_class_id UUID DEFAULT NULL,
  filter_grade TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_users INTEGER,
    total_teachers INTEGER,
    total_students INTEGER,
    total_admins INTEGER,
    total_courses INTEGER,
    active_courses INTEGER,
    completed_assignments INTEGER,
    active_discussions INTEGER,
    avg_engagement INTEGER,
    new_users_this_month INTEGER,
    course_completion_rate INTEGER,
    total_logins INTEGER,
    active_users_percentage INTEGER,
    course_engagement_percentage INTEGER,
    discussion_participation_percentage INTEGER,
    assignment_completion_percentage INTEGER
) AS $$
DECLARE
  date_start TIMESTAMP;
  date_end TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      date_start := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN
      date_start := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN
      date_start := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN
      date_start := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN
      date_start := NOW() - INTERVAL '1 year';
    ELSE -- alltime
      date_start := '2020-01-01'::TIMESTAMP;
  END CASE;
  
  date_end := NOW();

  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(DISTINCT p.id) as total_users,
      COUNT(DISTINCT CASE WHEN p.role = 'teacher' THEN p.id END) as total_teachers,
      COUNT(DISTINCT CASE WHEN p.role = 'student' THEN p.id END) as total_students,
      COUNT(DISTINCT CASE WHEN p.role = 'admin' THEN p.id END) as total_admins,
      COUNT(DISTINCT CASE WHEN p.created_at BETWEEN date_start AND date_end THEN p.id END) as new_users_in_period
    FROM profiles p
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
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
  ),
  course_counts AS (
    SELECT 
      COUNT(*) as total_courses,
      COUNT(CASE WHEN c.status = 'Published' THEN 1 END) as active_courses
    FROM courses c
    WHERE 
      -- When no filters are applied, show all courses
      (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
       AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
       AND filter_class_id IS NULL AND filter_grade IS NULL)
      -- When filters are applied, check hierarchy
      OR EXISTS (
        SELECT 1 FROM classes cl 
        LEFT JOIN schools s ON cl.school_id = s.id
        LEFT JOIN boards b ON s.board_id = b.id
        LEFT JOIN projects pr ON b.project_id = pr.id
        LEFT JOIN cities ci ON pr.city_id = ci.id
        LEFT JOIN regions r ON ci.region_id = r.id
        LEFT JOIN countries co ON r.country_id = co.id
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
  ),
  assignment_stats AS (
    SELECT 
      COUNT(*) as completed_assignments
    FROM assignment_submissions asub
    JOIN profiles p ON asub.user_id = p.id
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE asub.status = 'graded' 
      AND asub.submitted_at BETWEEN date_start AND date_end
      AND (
        (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        -- Include assignments from users not in any class (admins, etc.)
        OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
            AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
      )
  ),
  discussion_stats AS (
    SELECT 
      COUNT(DISTINCT d.id) as active_discussions
    FROM discussions d
    JOIN discussion_replies dr ON d.id = dr.discussion_id
    JOIN profiles p ON dr.user_id = p.id
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE dr.created_at BETWEEN date_start AND date_end
      AND (
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
      )
  ),
  engagement_stats AS (
    SELECT 
      COUNT(DISTINCT ucp.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL AND ucp.completed_at BETWEEN date_start AND date_end THEN ucp.user_id END) as users_with_completions,
      COUNT(DISTINCT CASE WHEN ucp.status IN ('in_progress', 'completed') THEN ucp.user_id END) as users_with_activity
    FROM user_content_item_progress ucp
    JOIN profiles p ON ucp.user_id = p.id
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE ucp.updated_at BETWEEN date_start AND date_end
      AND (
        (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        -- Include engagement from users not in any class (admins, etc.)
        OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
            AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
      )
  ),
  course_completion_stats AS (
    WITH course_content_counts AS (
      SELECT 
        c.id as course_id, 
        count(clc.id) as total_items
      FROM public.courses c
      JOIN public.course_sections cs ON cs.course_id = c.id
      JOIN public.course_lessons cl ON cl.section_id = cs.id
      JOIN public.course_lesson_content clc ON clc.lesson_id = cl.id
      LEFT JOIN schools s ON s.id = ANY(c.school_ids)
      LEFT JOIN boards b ON s.board_id = b.id
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN cities ci ON pr.city_id = ci.id
      LEFT JOIN regions r ON ci.region_id = r.id
      LEFT JOIN countries co ON r.country_id = co.id
      WHERE c.status = 'Published'
        AND (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR ci.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR filter_school_id = ANY(c.school_ids))
        AND (filter_class_id IS NULL OR filter_class_id = ANY(c.class_ids))
        AND (filter_grade IS NULL OR EXISTS (
          SELECT 1 FROM classes cl2 
          WHERE cl2.id = ANY(c.class_ids) 
          AND cl2.grade = filter_grade
        ))
      GROUP BY c.id
    ),
    user_course_completions AS (
      SELECT 
        ucp.user_id, 
        ucp.course_id, 
        count(ucp.id) as completed_items
      FROM public.user_content_item_progress ucp
      JOIN profiles p ON ucp.user_id = p.id
      LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
      LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
      LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
      LEFT JOIN schools s ON cl.school_id = s.id
      LEFT JOIN boards b ON cl.board_id = b.id
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN cities c ON pr.city_id = c.id
      LEFT JOIN regions r ON c.region_id = r.id
      LEFT JOIN countries co ON r.country_id = co.id
      WHERE ucp.completed_at IS NOT NULL
        AND (
          (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR c.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
          -- Include completions from users not in any class (admins, etc.)
          OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
              AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
        )
      GROUP BY ucp.user_id, ucp.course_id
    ),
    enrollment_progress AS (
      SELECT 
        cm.user_id,
        cm.course_id,
        COALESCE(ucc.completed_items, 0) as completed_items,
        GREATEST(ccc.total_items, 1) as total_items
      FROM public.course_members cm
      JOIN profiles p ON cm.user_id = p.id
      LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
      LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
      LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
      LEFT JOIN schools s ON cl.school_id = s.id
      LEFT JOIN boards b ON cl.board_id = b.id
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN cities c ON pr.city_id = c.id
      LEFT JOIN regions r ON c.region_id = r.id
      LEFT JOIN countries co ON r.country_id = co.id
      JOIN course_content_counts ccc ON cm.course_id = ccc.course_id
      LEFT JOIN user_course_completions ucc ON cm.user_id = ucc.user_id AND cm.course_id = ucc.course_id
      WHERE cm.role = 'student'
        AND (
          (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR c.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
          -- Include enrollments from users not in any class (admins, etc.)
          OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
              AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
        )
    )
    SELECT
      COALESCE(AVG( LEAST( (ep.completed_items::DECIMAL * 100) / ep.total_items, 100) ), 0) as rate
    FROM enrollment_progress ep
  )
  SELECT 
    uc.total_users::INTEGER,
    uc.total_teachers::INTEGER,
    uc.total_students::INTEGER,
    uc.total_admins::INTEGER,
    cc.total_courses::INTEGER,
    cc.active_courses::INTEGER,
    COALESCE(as2.completed_assignments, 0)::INTEGER as completed_assignments,
    COALESCE(ds.active_discussions, 0)::INTEGER as active_discussions,
    CASE 
      WHEN uc.total_users > 0 THEN
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0
    END as avg_engagement,
    uc.new_users_in_period::INTEGER as new_users_this_month,
    ROUND(ccs.rate)::INTEGER as course_completion_rate,
    uc.total_users::INTEGER as total_logins, -- Using total users as proxy for now
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as active_users_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((es.users_with_activity::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as course_engagement_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((ds.active_discussions::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as discussion_participation_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((as2.completed_assignments::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as assignment_completion_percentage
  FROM user_counts uc
  CROSS JOIN course_counts cc
  CROSS JOIN assignment_stats as2
  CROSS JOIN discussion_stats ds
  CROSS JOIN engagement_stats es
  CROSS JOIN course_completion_stats ccs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats_with_filters(text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_admin_dashboard_stats_with_filters(text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text) IS 
'Returns comprehensive admin dashboard statistics with optional filtering by location and school hierarchy. 
Parameters: time_range (7days|30days|3months|6months|1year|alltime), and optional UUID filters for filter_country_id, filter_region_id, filter_city_id, filter_project_id, filter_board_id, filter_school_id, filter_class_id, and filter_grade (1-12). 
Returns 16 metrics including user counts, course stats, engagement rates, and completion percentages.';
