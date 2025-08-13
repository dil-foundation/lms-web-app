DROP FUNCTION IF EXISTS public.get_course_performance_data(uuid);

CREATE OR REPLACE FUNCTION public.get_course_performance_data(
    p_teacher_id uuid
)
RETURNS TABLE(
    course_id uuid,
    course_title text, 
    course_description text,
    total_students integer, 
    active_students integer, 
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
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, cm.course_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  course_completion_rates AS (
    SELECT
      spc.course_id,
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
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND clc.content_type = 'assignment'
    GROUP BY cs.course_id
  ),
  course_submissions AS (
    SELECT
      cs.course_id,
      COUNT(asub.id) as total_submissions,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND asub.grade IS NOT NULL
    GROUP BY cs.course_id
  ),
  course_last_activity AS (
    SELECT
      ucip.course_id,
      MAX(ucip.updated_at) as last_activity
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
    GROUP BY ucip.course_id
  ),
  course_active_students AS (
    SELECT
      ucip.course_id,
      COUNT(DISTINCT ucip.user_id) as active_students
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND ucip.updated_at > NOW() - INTERVAL '30 days'
    GROUP BY ucip.course_id
  )
  SELECT
    c.id::uuid,
    c.title::text,
    c.description::text,
    COUNT(DISTINCT sic.user_id)::integer as total_students,
    COALESCE(cas.active_students, 0)::integer as active_students,
    COALESCE(ccr.avg_completion_rate, 0)::integer as completion_rate,
    COALESCE(cs.avg_score, 0)::integer as average_score,
    COALESCE(ca.total_assignments, 0)::integer as total_assignments,
    COALESCE(cs.total_submissions, 0)::integer as completed_assignments,
    COALESCE(cla.last_activity, NOW())::timestamp with time zone as last_activity
  FROM public.courses c
  JOIN teacher_courses tc ON c.id = tc.course_id
  LEFT JOIN students_in_courses sic ON c.id = sic.course_id
  LEFT JOIN course_completion_rates ccr ON c.id = ccr.course_id
  LEFT JOIN course_assignments ca ON c.id = ca.course_id
  LEFT JOIN course_submissions cs ON c.id = cs.course_id
  LEFT JOIN course_last_activity cla ON c.id = cla.course_id
  LEFT JOIN course_active_students cas ON c.id = cas.course_id
  WHERE c.status = 'Published'
  GROUP BY 
    c.id, 
    c.title, 
    c.description, 
    ccr.avg_completion_rate, 
    cs.avg_score, 
    ca.total_assignments, 
    cs.total_submissions, 
    cla.last_activity,
    cas.active_students
  ORDER BY c.title;
END;
$$;
