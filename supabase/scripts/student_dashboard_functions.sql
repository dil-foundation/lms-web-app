-- =====================================================
-- STUDENT DASHBOARD DYNAMIC FUNCTIONS
-- =====================================================

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS get_student_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS get_student_courses_with_progress(UUID);
DROP FUNCTION IF EXISTS get_student_upcoming_assignments(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_student_recent_activity(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_student_study_analytics(UUID, TEXT);

-- Function 1: Get Student Dashboard Stats
CREATE OR REPLACE FUNCTION get_student_dashboard_stats(
  student_id UUID
)
RETURNS TABLE (
  enrolled_courses_count INTEGER,
  total_lessons_count INTEGER,
  completed_lessons_count INTEGER,
  active_discussions_count INTEGER,
  study_streak_days INTEGER,
  total_study_time_minutes INTEGER,
  average_grade DECIMAL,
  upcoming_assignments_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  course_lessons AS (
    SELECT cl.id, cl.section_id, cl.type, cl.due_date
    FROM course_lessons cl
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
  ),
  lesson_progress AS (
    SELECT 
      ucp.lesson_id,
      ucp.completed_at,
      ucp.progress_seconds
    FROM user_course_progress ucp
    JOIN course_lessons cl ON ucp.lesson_id = cl.id
    WHERE ucp.user_id = student_id
  ),
  discussion_participation AS (
    SELECT COUNT(DISTINCT d.id) as active_discussions
    FROM discussions d
    JOIN discussion_replies dr ON d.id = dr.discussion_id
    WHERE dr.user_id = student_id
  ),
  study_dates AS (
    SELECT DISTINCT DATE(ucp.updated_at) as study_date
    FROM user_course_progress ucp
    JOIN course_lessons cl ON ucp.lesson_id = cl.id
    WHERE ucp.user_id = student_id 
      AND ucp.updated_at >= NOW() - INTERVAL '30 days'
    ORDER BY study_date DESC
  ),
  study_streak AS (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (
          WITH RECURSIVE consecutive_days AS (
            SELECT study_date, 1 as streak_length
            FROM study_dates
            WHERE study_date = (
              SELECT MAX(study_date) FROM study_dates
            )
            
            UNION ALL
            
            SELECT sd.study_date, cd.streak_length + 1
            FROM study_dates sd
            JOIN consecutive_days cd ON sd.study_date = cd.study_date - INTERVAL '1 day'
          )
          SELECT MAX(streak_length)
          FROM consecutive_days
        )
      END as streak_days
    FROM study_dates
    WHERE study_date = (
      SELECT MAX(study_date) FROM study_dates
    )
  ),
  assignment_grades AS (
    SELECT 
      AVG(as2.grade) as avg_grade
    FROM assignment_submissions as2
    JOIN course_lessons cl ON as2.assignment_id = cl.id
    JOIN student_courses sc ON cl.section_id IN (
      SELECT id FROM course_sections WHERE course_id = sc.course_id
    )
    WHERE as2.user_id = student_id 
      AND as2.status = 'graded'
      AND as2.grade IS NOT NULL
  ),
  upcoming_assignments AS (
    SELECT COUNT(*) as upcoming_count
    FROM course_lessons cl
    JOIN student_courses sc ON cl.section_id IN (
      SELECT id FROM course_sections WHERE course_id = sc.course_id
    )
    WHERE cl.type = 'assignment'
      AND cl.due_date > NOW()
      AND cl.due_date <= NOW() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM assignment_submissions as2 
        WHERE as2.assignment_id = cl.id AND as2.user_id = student_id
      )
  )
  SELECT 
    (SELECT COUNT(*) FROM student_courses)::INTEGER as enrolled_courses_count,
    (SELECT COUNT(*) FROM course_lessons)::INTEGER as total_lessons_count,
    (SELECT COUNT(*) FROM lesson_progress WHERE completed_at IS NOT NULL)::INTEGER as completed_lessons_count,
    (SELECT active_discussions FROM discussion_participation)::INTEGER as active_discussions_count,
    COALESCE((SELECT streak_days FROM study_streak), 0)::INTEGER as study_streak_days,
    COALESCE((SELECT ROUND(SUM(progress_seconds) / 60) FROM lesson_progress), 0)::INTEGER as total_study_time_minutes,
    COALESCE((SELECT avg_grade FROM assignment_grades), 0)::DECIMAL as average_grade,
    (SELECT upcoming_count FROM upcoming_assignments)::INTEGER as upcoming_assignments_count;
END;
$$;

-- Function 2: Get Student Courses with Progress
CREATE OR REPLACE FUNCTION get_student_courses_with_progress(
  student_id UUID
)
RETURNS TABLE (
  course_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  progress_percentage INTEGER,
  total_lessons INTEGER,
  completed_lessons INTEGER,
  last_accessed TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  course_lessons AS (
    SELECT 
      cs.course_id,
      cl.id as lesson_id,
      cl.type
    FROM course_lessons cl
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
  ),
  lesson_progress AS (
    SELECT 
      cl.course_id,
      COUNT(*) as total_lessons,
      COUNT(CASE WHEN ucp.completed_at IS NOT NULL THEN 1 END) as completed_lessons,
      MAX(ucp.updated_at) as last_accessed
    FROM course_lessons cl
    LEFT JOIN user_course_progress ucp ON cl.lesson_id = ucp.lesson_id AND ucp.user_id = student_id
    GROUP BY cl.course_id
  )
  SELECT 
    c.id as course_id,
    c.title,
    COALESCE(c.subtitle, '') as subtitle,
    COALESCE(c.image_url, '') as image_url,
    CASE 
      WHEN lp.total_lessons > 0 THEN 
        ROUND((lp.completed_lessons::DECIMAL / lp.total_lessons) * 100)::INTEGER
      ELSE 0 
    END as progress_percentage,
    lp.total_lessons::INTEGER,
    lp.completed_lessons::INTEGER,
    lp.last_accessed
  FROM student_courses sc
  JOIN courses c ON sc.course_id = c.id
  LEFT JOIN lesson_progress lp ON c.id = lp.course_id
  WHERE c.status = 'Published'
  ORDER BY lp.last_accessed DESC NULLS LAST, c.created_at DESC;
END;
$$;

-- Function 3: Get Student Upcoming Assignments
CREATE OR REPLACE FUNCTION get_student_upcoming_assignments(
  student_id UUID,
  days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  assignment_id UUID,
  assignment_title TEXT,
  course_title TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  priority TEXT,
  submission_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  upcoming_assignments AS (
    SELECT 
      cl.id as assignment_id,
      cl.title as assignment_title,
      c.title as course_title,
      cl.due_date,
      EXTRACT(DAY FROM cl.due_date - NOW())::INTEGER as days_remaining,
      CASE 
        WHEN cl.due_date <= NOW() + INTERVAL '1 day' THEN 'High'
        WHEN cl.due_date <= NOW() + INTERVAL '3 days' THEN 'Medium'
        ELSE 'Low'
      END as priority,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM assignment_submissions as2 
          WHERE as2.assignment_id = cl.id AND as2.user_id = student_id
        ) THEN 'Submitted'
        ELSE 'Not Submitted'
      END as submission_status
    FROM course_lessons cl
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
    JOIN courses c ON sc.course_id = c.id
    WHERE cl.type = 'assignment'
      AND cl.due_date > NOW()
      AND cl.due_date <= NOW() + (days_ahead || ' days')::INTERVAL
  )
  SELECT * FROM upcoming_assignments
  ORDER BY due_date ASC;
END;
$$;

-- Function 4: Get Student Recent Activity
CREATE OR REPLACE FUNCTION get_student_recent_activity(
  student_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  activity_type TEXT,
  activity_description TEXT,
  activity_time TIMESTAMP WITH TIME ZONE,
  course_title TEXT,
  lesson_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  lesson_activities AS (
    SELECT 
      'lesson_completed' as activity_type,
      'Completed lesson: ' || cl.title as activity_description,
      ucp.completed_at as activity_time,
      c.title as course_title,
      cl.title as lesson_title
    FROM user_course_progress ucp
    JOIN course_lessons cl ON ucp.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
    JOIN courses c ON sc.course_id = c.id
    WHERE ucp.user_id = student_id 
      AND ucp.completed_at IS NOT NULL
      AND ucp.completed_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  discussion_activities AS (
    SELECT 
      'discussion_reply' as activity_type,
      'Replied to discussion: ' || d.title as activity_description,
      dr.created_at as activity_time,
      c.title as course_title,
      d.title as lesson_title
    FROM discussion_replies dr
    JOIN discussions d ON dr.discussion_id = d.id
    JOIN student_courses sc ON d.course_id = sc.course_id
    JOIN courses c ON sc.course_id = c.id
    WHERE dr.user_id = student_id 
      AND dr.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  assignment_activities AS (
    SELECT 
      'assignment_submitted' as activity_type,
      'Submitted assignment: ' || cl.title as activity_description,
      as2.submitted_at as activity_time,
      c.title as course_title,
      cl.title as lesson_title
    FROM assignment_submissions as2
    JOIN course_lessons cl ON as2.assignment_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
    JOIN courses c ON sc.course_id = c.id
    WHERE as2.user_id = student_id 
      AND as2.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  all_activities AS (
    SELECT * FROM lesson_activities
    UNION ALL
    SELECT * FROM discussion_activities
    UNION ALL
    SELECT * FROM assignment_activities
  )
  SELECT * FROM all_activities
  ORDER BY activity_time DESC
  LIMIT 20;
END;
$$;

-- Function 5: Get Student Study Analytics
CREATE OR REPLACE FUNCTION get_student_study_analytics(
  student_id UUID,
  time_range TEXT DEFAULT '7days'
)
RETURNS TABLE (
  date_label TEXT,
  lessons_completed INTEGER,
  study_time_minutes INTEGER,
  assignments_submitted INTEGER
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
    ELSE
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  periods AS (
    SELECT 
      CASE period_type
        WHEN 'day' THEN 
          date_series::DATE::TEXT
        WHEN 'week' THEN 
          'Week ' || EXTRACT(WEEK FROM date_series)::TEXT
      END as date_label,
      date_series as period_start,
      CASE period_type
        WHEN 'day' THEN date_series + INTERVAL '1 day'
        WHEN 'week' THEN date_series + INTERVAL '1 week'
      END as period_end
    FROM generate_series(
      start_date::DATE,
      end_date::DATE,
      CASE period_type
        WHEN 'day' THEN '1 day'::INTERVAL
        WHEN 'week' THEN '1 week'::INTERVAL
      END
    ) as date_series
  ),
  activity_data AS (
    SELECT 
      p.date_label,
      COUNT(CASE WHEN ucp.completed_at >= p.period_start AND ucp.completed_at < p.period_end THEN 1 END)::INTEGER as lessons_completed,
      COALESCE(SUM(CASE WHEN ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end THEN ucp.progress_seconds ELSE 0 END) / 60, 0)::INTEGER as study_time_minutes,
      COUNT(CASE WHEN as2.submitted_at >= p.period_start AND as2.submitted_at < p.period_end THEN 1 END)::INTEGER as assignments_submitted
    FROM periods p
    LEFT JOIN user_course_progress ucp ON 
      ucp.user_id = student_id AND
      (ucp.completed_at >= p.period_start AND ucp.completed_at < p.period_end OR
       ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end)
    LEFT JOIN assignment_submissions as2 ON 
      as2.user_id = student_id AND
      as2.submitted_at >= p.period_start AND as2.submitted_at < p.period_end
    GROUP BY p.date_label, p.period_start
    ORDER BY p.period_start
  )
  SELECT 
    ad.date_label,
    ad.lessons_completed,
    ad.study_time_minutes,
    ad.assignments_submitted
  FROM activity_data ad;
END;
$$;

-- =====================================================
-- USAGE EXAMPLES:
-- =====================================================

-- Get student dashboard stats
-- SELECT * FROM get_student_dashboard_stats('student-uuid-here');

-- Get student courses with progress
-- SELECT * FROM get_student_courses_with_progress('student-uuid-here');

-- Get upcoming assignments
-- SELECT * FROM get_student_upcoming_assignments('student-uuid-here', 7);

-- Get recent activity
-- SELECT * FROM get_student_recent_activity('student-uuid-here', 7);

-- Get study analytics
-- SELECT * FROM get_student_study_analytics('student-uuid-here', '7days'); 