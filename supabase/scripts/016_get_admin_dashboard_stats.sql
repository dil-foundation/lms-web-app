DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats(TEXT);

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(time_range TEXT)
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
      COUNT(DISTINCT CASE WHEN ucp.progress_data->>'seconds' IS NOT NULL THEN ucp.user_id END) as users_with_activity
    FROM user_content_item_progress ucp
    WHERE ucp.updated_at >= start_date
  ),
  course_completion_stats AS (
    SELECT 
      COUNT(DISTINCT ucp.user_id) as users_with_progress,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN ucp.user_id END) as users_with_completions
    FROM user_content_item_progress ucp
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
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
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
$$ LANGUAGE plpgsql;
