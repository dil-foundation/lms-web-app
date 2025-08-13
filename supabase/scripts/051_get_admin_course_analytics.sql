-- Function for Admin Course Analytics
DROP FUNCTION IF EXISTS public.get_admin_course_analytics();

CREATE OR REPLACE FUNCTION public.get_admin_course_analytics()
RETURNS TABLE(
    course_id uuid,
    course_title text,
    enrolled_students integer,
    completed_students integer,
    in_progress_students integer,
    completion_rate integer,
    average_score integer,
    total_assignments integer,
    completed_assignments integer,
    last_activity timestamp with time zone
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
      COUNT(CASE WHEN cm.role = 'student' THEN 1 END) as enrolled_students
    FROM public.courses c
    LEFT JOIN public.course_members cm ON c.id = cm.course_id
    WHERE c.status = 'Published'
    GROUP BY c.id, c.title
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE c.status = 'Published'
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      cm.course_id,
      cm.user_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM public.course_members cm
    JOIN course_content_totals cct ON cm.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON cm.user_id = ucip.user_id
      AND cm.course_id = ucip.course_id
      AND ucip.status = 'completed'
    WHERE cm.role = 'student'
    GROUP BY cm.course_id, cm.user_id, cct.total_content_items
  ),
  course_completion_stats AS (
    SELECT
      spc.course_id,
      COUNT(*) as total_students,
      COUNT(CASE WHEN spc.completed_content_items = spc.total_content_items THEN 1 END) as completed_students,
      COUNT(CASE WHEN spc.completed_content_items > 0 AND spc.completed_content_items < spc.total_content_items THEN 1 END) as in_progress_students,
      AVG(CASE 
        WHEN spc.total_content_items > 0 THEN (spc.completed_content_items::decimal / spc.total_content_items) * 100
        ELSE 0 
      END)::integer as avg_completion_rate
    FROM student_progress_by_course spc
    GROUP BY spc.course_id
  ),
  course_assignments AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) as total_assignments
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE c.status = 'Published'
      AND clc.content_type = 'assignment'
    GROUP BY cs.course_id
  ),
  course_submissions AS (
    SELECT
      cs.course_id,
      COUNT(asub.id) as completed_assignments,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE c.status = 'Published'
      AND asub.grade IS NOT NULL
    GROUP BY cs.course_id
  ),
  course_last_activity AS (
    SELECT
      ucip.course_id,
      MAX(ucip.updated_at) as last_activity
    FROM public.user_content_item_progress ucip
    JOIN public.courses c ON ucip.course_id = c.id
    WHERE c.status = 'Published'
    GROUP BY ucip.course_id
  )
  SELECT
    ce.course_id::uuid,
    ce.course_title::text,
    ce.enrolled_students::integer,
    COALESCE(ccs.completed_students, 0)::integer as completed_students,
    COALESCE(ccs.in_progress_students, 0)::integer as in_progress_students,
    COALESCE(ccs.avg_completion_rate, 0)::integer as completion_rate,
    COALESCE(cs.avg_score, 0)::integer as average_score,
    COALESCE(ca.total_assignments, 0)::integer as total_assignments,
    COALESCE(cs.completed_assignments, 0)::integer as completed_assignments,
    COALESCE(cla.last_activity, NOW())::timestamp with time zone as last_activity
  FROM course_enrollments ce
  LEFT JOIN course_completion_stats ccs ON ce.course_id = ccs.course_id
  LEFT JOIN course_assignments ca ON ce.course_id = ca.course_id
  LEFT JOIN course_submissions cs ON ce.course_id = cs.course_id
  LEFT JOIN course_last_activity cla ON ce.course_id = cla.course_id
  ORDER BY ce.enrolled_students DESC, ce.course_title
  LIMIT 10;
END;
$$;
