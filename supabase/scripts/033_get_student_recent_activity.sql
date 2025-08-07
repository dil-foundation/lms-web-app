DROP FUNCTION IF EXISTS public.get_student_recent_activity(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_student_recent_activity(
    student_id uuid,
    days_back integer
)
RETURNS TABLE (
    activity_type text,
    activity_description text,
    activity_time timestamp with time zone,
    course_title text,
    lesson_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  content_item_activities AS (
    SELECT 
      'content_completed' as activity_type,
      'Completed: ' || clc.title as activity_description,
      ucip.completed_at as activity_time,
      c.title as course_title,
      clc.title as lesson_title
    FROM public.user_content_item_progress ucip
    JOIN public.course_lesson_content clc ON ucip.lesson_content_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE ucip.user_id = student_id
      AND cs.course_id IN (SELECT course_id FROM student_courses)
      AND ucip.completed_at IS NOT NULL
      AND ucip.completed_at >= NOW() - (days_back || ' days')::INTERVAL
      AND clc.content_type != 'assignment'
  ),
  discussion_activities AS (
    SELECT 
      'discussion_reply' as activity_type,
      'Replied to discussion: ' || d.title as activity_description,
      dr.created_at as activity_time,
      c.title as course_title,
      d.title as lesson_title
    FROM public.discussion_replies dr
    JOIN public.discussions d ON dr.discussion_id = d.id
    JOIN public.courses c ON d.course_id = c.id
    WHERE dr.user_id = student_id 
      AND d.course_id IN (SELECT course_id FROM student_courses)
      AND dr.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  assignment_activities AS (
    SELECT 
      'assignment_submitted' as activity_type,
      'Submitted assignment: ' || clc.title as activity_description,
      asub.submitted_at as activity_time,
      c.title as course_title,
      clc.title as lesson_title
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE asub.user_id = student_id 
      AND cs.course_id IN (SELECT course_id FROM student_courses)
      AND asub.submitted_at IS NOT NULL
      AND asub.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  all_activities AS (
    SELECT * FROM content_item_activities
    UNION ALL
    SELECT * FROM discussion_activities
    UNION ALL
    SELECT * FROM assignment_activities
  )
  SELECT aa.* FROM all_activities aa
  ORDER BY aa.activity_time DESC
  LIMIT 20;
END;
$$;