-- =====================================================
-- ADMIN REPORTS DYNAMIC FUNCTIONS
-- =====================================================

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS get_admin_dashboard_stats(TEXT);
DROP FUNCTION IF EXISTS get_user_growth_data(TEXT);
DROP FUNCTION IF EXISTS get_platform_stats_data();
DROP FUNCTION IF EXISTS get_course_analytics_data();
DROP FUNCTION IF EXISTS get_engagement_data(TEXT);
DROP FUNCTION IF EXISTS get_user_analytics_data(TEXT);
DROP FUNCTION IF EXISTS get_course_performance_data_admin();
DROP FUNCTION IF EXISTS get_engagement_metrics_data(TEXT);

-- Function 1: Get Admin Dashboard Stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
  time_range TEXT DEFAULT 'alltime'
)
RETURNS TABLE (
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
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'teacher' THEN 1 END) as total_teachers,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
      COUNT(CASE WHEN created_at >= start_date THEN 1 END) as new_users_in_period
    FROM profiles
  ),
  course_counts AS (
    SELECT 
      COUNT(*) as total_courses,
      COUNT(CASE WHEN status = 'Published' THEN 1 END) as active_courses
    FROM courses
  ),
  assignment_stats AS (
    SELECT 
      COUNT(*) as completed_assignments
    FROM assignment_submissions
    WHERE status = 'graded' AND submitted_at >= start_date
  ),
  discussion_stats AS (
    SELECT 
      COUNT(DISTINCT d.id) as active_discussions
    FROM discussions d
    JOIN discussion_replies dr ON d.id = dr.discussion_id
    WHERE dr.created_at >= start_date
  ),
  engagement_stats AS (
    SELECT 
      COUNT(DISTINCT ucp.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN ucp.user_id END) as users_with_completions,
      COUNT(DISTINCT CASE WHEN ucp.progress_seconds > 0 THEN ucp.user_id END) as users_with_activity
    FROM user_course_progress ucp
    WHERE ucp.updated_at >= start_date
  ),
  course_completion_stats AS (
    SELECT 
      COUNT(DISTINCT ucp.user_id) as users_with_progress,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN ucp.user_id END) as users_with_completions
    FROM user_course_progress ucp
    WHERE ucp.updated_at >= start_date
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
        ROUND((cc.active_courses::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as avg_engagement,
    uc.new_users_in_period::INTEGER as new_users_this_month,
    CASE 
      WHEN ccs.users_with_progress > 0 THEN 
        ROUND((ccs.users_with_completions::DECIMAL / ccs.users_with_progress) * 100)::INTEGER
      ELSE 0 
    END as course_completion_rate,
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
$$;

-- Function 2: Get User Growth Data
CREATE OR REPLACE FUNCTION get_user_growth_data(
  time_range TEXT DEFAULT 'alltime'
)
RETURNS TABLE (
  period_label TEXT,
  new_users INTEGER,
  active_users INTEGER,
  churn_rate INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      period_type := 'week';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      period_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      period_type := 'month';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
      period_type := 'month';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH published_courses AS (
    SELECT id as course_id
    FROM courses
    WHERE status = 'Published'
  ),
  periods AS (
    SELECT 
      CASE period_type
        WHEN 'day' THEN 
          date_series::DATE::TEXT
        WHEN 'week' THEN 
          'Week ' || EXTRACT(WEEK FROM date_series)::TEXT
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
  user_activity AS (
    SELECT 
      p.period_label,
      COUNT(CASE WHEN p2.created_at >= p.period_start AND p2.created_at < p.period_end THEN 1 END)::INTEGER as new_users,
      COUNT(DISTINCT CASE WHEN ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end THEN ucp.user_id END)::INTEGER as active_users,
      COUNT(CASE WHEN p2.updated_at >= p.period_start AND p2.updated_at < p.period_end THEN 1 END) as total_activity
    FROM periods p
    LEFT JOIN profiles p2 ON 
      p2.created_at >= p.period_start AND p2.created_at < p.period_end
    LEFT JOIN user_course_progress ucp ON 
      ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end
    LEFT JOIN course_sections cs ON ucp.course_id = cs.course_id
    LEFT JOIN published_courses pc ON cs.course_id = pc.course_id
    WHERE (ucp.course_id IS NULL OR pc.course_id IS NOT NULL)
    GROUP BY p.period_label, p.period_start
    ORDER BY p.period_start
  )
  SELECT 
    ua.period_label,
    ua.new_users,
    ua.active_users,
    CASE 
      WHEN ua.total_activity > 0 THEN 
        ROUND((ua.active_users::DECIMAL / ua.total_activity) * 100)::INTEGER
      ELSE 0 
    END as churn_rate
  FROM user_activity ua;
END;
$$;

-- Function 3: Get Platform Stats Data
CREATE OR REPLACE FUNCTION get_platform_stats_data()
RETURNS TABLE (
  category_name TEXT,
  value INTEGER,
  color_code TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_distribution AS (
    SELECT 
      'Students' as category,
      COUNT(*) as count
    FROM profiles
    WHERE role = 'student'
  ),
  teacher_distribution AS (
    SELECT 
      'Teachers' as category,
      COUNT(*) as count
    FROM profiles
    WHERE role = 'teacher'
  ),
  admin_distribution AS (
    SELECT 
      'Admins' as category,
      COUNT(*) as count
    FROM profiles
    WHERE role = 'admin'
  ),
  course_distribution AS (
    SELECT 
      'Published Courses' as category,
      COUNT(*) as count
    FROM courses
    WHERE status = 'Published'
  ),
  all_distributions AS (
    SELECT * FROM user_distribution
    UNION ALL
    SELECT * FROM teacher_distribution
    UNION ALL
    SELECT * FROM admin_distribution
    UNION ALL
    SELECT * FROM course_distribution
  )
  SELECT 
    ad.category as category_name,
    ad.count::INTEGER as value,
    CASE ad.category
      WHEN 'Students' THEN '#3B82F6'
      WHEN 'Teachers' THEN '#10B981'
      WHEN 'Admins' THEN '#F59E0B'
      WHEN 'Published Courses' THEN '#8B5CF6'
      ELSE '#6B7280'
    END as color_code
  FROM all_distributions ad
  WHERE ad.count > 0
  ORDER BY ad.count DESC;
END;
$$;

-- Function 4: Get Course Analytics Data
CREATE OR REPLACE FUNCTION get_course_analytics_data()
RETURNS TABLE (
  course_title TEXT,
  enrolled_students INTEGER,
  completion_rate INTEGER,
  avg_rating DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT 
      c.title as course_title,
      COUNT(DISTINCT cm.user_id)::INTEGER as enrolled_students,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN ucp.user_id END)::INTEGER as completed_students
    FROM courses c
    LEFT JOIN course_members cm ON c.id = cm.course_id AND cm.role = 'student'
    LEFT JOIN course_sections cs ON c.id = cs.course_id
    LEFT JOIN course_lessons cl ON cs.id = cl.section_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND cm.user_id = ucp.user_id
    WHERE c.status = 'Published'
    GROUP BY c.id, c.title
  )
  SELECT 
    cs.course_title,
    cs.enrolled_students,
    CASE 
      WHEN cs.enrolled_students > 0 THEN 
        ROUND((cs.completed_students::DECIMAL / cs.enrolled_students) * 100)::INTEGER
      ELSE 0 
    END as completion_rate,
    4.5 as avg_rating -- Placeholder, can be enhanced with actual ratings
  FROM course_stats cs
  WHERE cs.enrolled_students > 0
  ORDER BY cs.enrolled_students DESC
  LIMIT 5;
END;
$$;

-- Function 5: Get Engagement Data
CREATE OR REPLACE FUNCTION get_engagement_data(
  time_range TEXT DEFAULT 'alltime'
)
RETURNS TABLE (
  period_label TEXT,
  active_users INTEGER,
  time_spent INTEGER,
  courses INTEGER,
  discussions INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      period_type := 'week';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      period_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      period_type := 'month';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
      period_type := 'month';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH published_courses AS (
    SELECT id as course_id
    FROM courses
    WHERE status = 'Published'
  ),
  periods AS (
    SELECT 
      CASE period_type
        WHEN 'day' THEN 
          date_series::DATE::TEXT
        WHEN 'week' THEN 
          'Week ' || EXTRACT(WEEK FROM date_series)::TEXT
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
      p.period_label,
      COUNT(DISTINCT ucp.user_id)::INTEGER as active_users,
      COALESCE(SUM(ucp.progress_seconds) / 60, 0)::INTEGER as time_spent,
      COUNT(DISTINCT cs.course_id)::INTEGER as courses,
      COUNT(DISTINCT d.id)::INTEGER as discussions
    FROM periods p
    LEFT JOIN user_course_progress ucp ON 
      ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end
    LEFT JOIN course_sections cs ON ucp.course_id = cs.course_id
    LEFT JOIN published_courses pc ON cs.course_id = pc.course_id
    LEFT JOIN discussions d ON 
      d.created_at >= p.period_start AND d.created_at < p.period_end
    LEFT JOIN course_sections cs_d ON d.course_id = cs_d.course_id
    LEFT JOIN published_courses pc_d ON cs_d.course_id = pc_d.course_id
    WHERE (ucp.course_id IS NULL OR pc.course_id IS NOT NULL)
      AND (d.course_id IS NULL OR pc_d.course_id IS NOT NULL)
    GROUP BY p.period_label, p.period_start
    ORDER BY p.period_start
  )
  SELECT 
    ad.period_label,
    ad.active_users,
    ad.time_spent,
    ad.courses,
    ad.discussions
  FROM activity_data ad;
END;
$$;

-- Function 6: Get User Analytics Data
CREATE OR REPLACE FUNCTION get_user_analytics_data(
  time_range TEXT DEFAULT 'alltime'
)
RETURNS TABLE (
  month_label TEXT,
  active_users INTEGER,
  new_signups INTEGER,
  churn_rate INTEGER
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
      start_date := NOW() - INTERVAL '2 years'; -- Limit to last 2 years instead of from 2020
      interval_type := 'quarter'; -- Use quarters for alltime to avoid too many data points
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH published_courses AS (
    SELECT id as course_id
    FROM courses
    WHERE status = 'Published'
  ),
  periods AS (
    SELECT 
      CASE interval_type
        WHEN 'day' THEN 
          date_series::DATE::TEXT
        WHEN 'month' THEN 
          TO_CHAR(date_series, 'Mon')
        WHEN 'quarter' THEN 
          'Q' || EXTRACT(QUARTER FROM date_series)::TEXT || ' ' || EXTRACT(YEAR FROM date_series)::TEXT
        WHEN 'month' THEN 
          TO_CHAR(date_series, 'Mon YYYY')
      END as period_label,
      date_series as period_start,
      CASE interval_type
        WHEN 'day' THEN date_series + INTERVAL '1 day'
        WHEN 'month' THEN date_series + INTERVAL '1 month'
        WHEN 'quarter' THEN date_series + INTERVAL '3 months'
      END as period_end
    FROM generate_series(
      start_date::DATE,
      end_date::DATE,
      CASE interval_type
        WHEN 'day' THEN '1 day'::INTERVAL
        WHEN 'month' THEN '1 month'::INTERVAL
        WHEN 'quarter' THEN '3 months'::INTERVAL
      END
    ) as date_series
  ),
  user_activity AS (
    SELECT 
      p.period_label,
      COUNT(DISTINCT ucp.user_id)::INTEGER as active_users,
      COUNT(CASE WHEN p2.created_at >= p.period_start AND p2.created_at < p.period_end THEN 1 END)::INTEGER as new_signups,
      COUNT(CASE WHEN p2.updated_at >= p.period_start AND p2.updated_at < p.period_end THEN 1 END) as total_activity
    FROM periods p
    LEFT JOIN user_course_progress ucp ON 
      ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end
    LEFT JOIN course_sections cs ON ucp.course_id = cs.course_id
    LEFT JOIN published_courses pc ON cs.course_id = pc.course_id
    LEFT JOIN profiles p2 ON 
      p2.created_at >= p.period_start AND p2.created_at < p.period_end
    WHERE (ucp.course_id IS NULL OR pc.course_id IS NOT NULL)
    GROUP BY p.period_label, p.period_start
    ORDER BY p.period_start
  )
  SELECT 
    ua.period_label,
    ua.active_users,
    ua.new_signups,
    CASE 
      WHEN ua.total_activity > 0 THEN 
        ROUND((ua.active_users::DECIMAL / ua.total_activity) * 100)::INTEGER
      ELSE 0 
    END as churn_rate
  FROM user_activity ua;
END;
$$;

-- Function 7: Get Course Performance Data for Admin
CREATE OR REPLACE FUNCTION get_course_performance_data_admin()
RETURNS TABLE (
  course_title TEXT,
  enrollments INTEGER,
  completion_rate INTEGER,
  avg_rating DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT 
      c.title as course_title,
      COUNT(DISTINCT cm.user_id)::INTEGER as enrollments,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN ucp.user_id END)::INTEGER as completed_students
    FROM courses c
    LEFT JOIN course_members cm ON c.id = cm.course_id AND cm.role = 'student'
    LEFT JOIN course_sections cs ON c.id = cs.course_id
    LEFT JOIN course_lessons cl ON cs.id = cl.section_id
    LEFT JOIN user_course_progress ucp ON cl.id = ucp.lesson_id AND cm.user_id = ucp.user_id
    WHERE c.status = 'Published'
    GROUP BY c.id, c.title
  )
  SELECT 
    cs.course_title,
    cs.enrollments,
    CASE 
      WHEN cs.enrollments > 0 THEN 
        ROUND((cs.completed_students::DECIMAL / cs.enrollments) * 100)::INTEGER
      ELSE 0 
    END as completion_rate,
    4.5 as avg_rating -- Placeholder, can be enhanced with actual ratings
  FROM course_stats cs
  WHERE cs.enrollments > 0
  ORDER BY cs.enrollments DESC
  LIMIT 5;
END;
$$;

-- Function 8: Get Engagement Metrics Data
CREATE OR REPLACE FUNCTION get_engagement_metrics_data(
  time_range TEXT DEFAULT 'alltime'
)
RETURNS TABLE (
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
  -- Set date range and interval type based on time_range parameter
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
      start_date := NOW() - INTERVAL '2 years'; -- Limit to last 2 years instead of from 2020
      interval_type := 'quarter'; -- Use quarters for alltime to avoid too many data points
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH published_courses AS (
    SELECT id as course_id
    FROM courses
    WHERE status = 'Published'
  ),
  periods AS (
    SELECT 
      CASE interval_type
        WHEN 'day' THEN 
          TO_CHAR(date_series, 'YYYY-MM-DD')
        WHEN 'month' THEN 
          TO_CHAR(date_series, 'Mon YYYY')
        WHEN 'quarter' THEN 
          'Q' || EXTRACT(QUARTER FROM date_series)::TEXT || ' ' || EXTRACT(YEAR FROM date_series)::TEXT
      END as period_label,
      date_series as period_start,
      CASE interval_type
        WHEN 'day' THEN date_series + INTERVAL '1 day'
        WHEN 'month' THEN date_series + INTERVAL '1 month'
        WHEN 'quarter' THEN date_series + INTERVAL '3 months'
      END as period_end
    FROM generate_series(
      start_date::DATE,
      end_date::DATE,
      CASE interval_type
        WHEN 'day' THEN '1 day'::INTERVAL
        WHEN 'month' THEN '1 month'::INTERVAL
        WHEN 'quarter' THEN '3 months'::INTERVAL
      END
    ) as date_series
  ),
  period_activity AS (
    SELECT 
      p.period_label,
      COUNT(DISTINCT ucp.user_id)::INTEGER as active_users,
      COUNT(CASE WHEN as2.submitted_at >= p.period_start AND as2.submitted_at < p.period_end THEN 1 END)::INTEGER as assignments_submitted,
      COUNT(CASE WHEN qs.submitted_at >= p.period_start AND qs.submitted_at < p.period_end THEN 1 END)::INTEGER as quiz_submissions,
      COUNT(CASE WHEN ucp.completed_at >= p.period_start AND ucp.completed_at < p.period_end THEN 1 END)::INTEGER as lessons_completed,
      COUNT(CASE WHEN d.created_at >= p.period_start AND d.created_at < p.period_end THEN 1 END)::INTEGER as discussions_created
    FROM periods p
    LEFT JOIN user_course_progress ucp ON 
      ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end
    LEFT JOIN course_sections cs ON ucp.course_id = cs.course_id
    LEFT JOIN published_courses pc ON cs.course_id = pc.course_id
    LEFT JOIN assignment_submissions as2 ON 
      as2.submitted_at >= p.period_start AND as2.submitted_at < p.period_end
    LEFT JOIN course_lessons cl_as ON as2.assignment_id = cl_as.id
    LEFT JOIN course_sections cs_as ON cl_as.section_id = cs_as.id
    LEFT JOIN published_courses pc_as ON cs_as.course_id = pc_as.course_id
    LEFT JOIN quiz_submissions qs ON 
      qs.submitted_at >= p.period_start AND qs.submitted_at < p.period_end
    LEFT JOIN course_lessons cl_qs ON qs.lesson_id = cl_qs.id
    LEFT JOIN course_sections cs_qs ON cl_qs.section_id = cs_qs.id
    LEFT JOIN published_courses pc_qs ON cs_qs.course_id = pc_qs.course_id
    LEFT JOIN discussions d ON 
      d.created_at >= p.period_start AND d.created_at < p.period_end
    LEFT JOIN course_sections cs_d ON d.course_id = cs_d.course_id
    LEFT JOIN published_courses pc_d ON cs_d.course_id = pc_d.course_id
    GROUP BY p.period_label, p.period_start
    ORDER BY p.period_start
  )
  SELECT 
    pa.period_label,
    pa.active_users,
    pa.assignments_submitted,
    pa.quiz_submissions,
    pa.lessons_completed,
    pa.discussions_created
  FROM period_activity pa;
END;
$$;

-- =====================================================
-- TEST FUNCTION TO VERIFY REAL DATA
-- =====================================================

-- Function to test if we have real data in the database
CREATE OR REPLACE FUNCTION test_real_data()
RETURNS TABLE (
  test_name TEXT,
  count_value INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 'Published Courses'::TEXT, COUNT(*)::INTEGER FROM courses WHERE status = 'Published'
  UNION ALL
  SELECT 'User Course Progress'::TEXT, COUNT(*)::INTEGER FROM user_course_progress
  UNION ALL
  SELECT 'Assignment Submissions'::TEXT, COUNT(*)::INTEGER FROM assignment_submissions
  UNION ALL
  SELECT 'Quiz Submissions'::TEXT, COUNT(*)::INTEGER FROM quiz_submissions
  UNION ALL
  SELECT 'Discussions'::TEXT, COUNT(*)::INTEGER FROM discussions
  UNION ALL
  SELECT 'Profiles'::TEXT, COUNT(*)::INTEGER FROM profiles;
END;
$$;

-- =====================================================
-- USAGE EXAMPLES:
-- =====================================================

-- Get admin dashboard stats
-- SELECT * FROM get_admin_dashboard_stats('alltime');

-- Get user growth data
-- SELECT * FROM get_user_growth_data('6months');

-- Get platform stats data
-- SELECT * FROM get_platform_stats_data();

-- Get course analytics data
-- SELECT * FROM get_course_analytics_data();

-- Get engagement data
-- SELECT * FROM get_engagement_data('30days');

-- Get user analytics data
-- SELECT * FROM get_user_analytics_data('alltime');

-- Get course performance data
-- SELECT * FROM get_course_performance_data_admin();

-- Get engagement metrics data
-- SELECT * FROM get_engagement_metrics_data('7days');

-- Test real data
-- SELECT * FROM test_real_data(); 