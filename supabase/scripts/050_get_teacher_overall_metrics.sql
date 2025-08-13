-- Function for Overall Metrics (Dashboard Cards)
DROP FUNCTION IF EXISTS public.get_teacher_overall_metrics(uuid);

CREATE OR REPLACE FUNCTION public.get_teacher_overall_metrics(
    p_teacher_id uuid
)
RETURNS TABLE(
    total_students integer,
    active_students integer,
    average_completion integer,
    average_score integer,
    courses_published integer,
    total_assignments integer,
    total_enrollments integer,
    average_engagement integer
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
  student_completion_rates AS (
    SELECT
      spc.user_id,
      AVG(CASE 
        WHEN spc.total_content_items > 0 THEN (spc.completed_content_items::decimal / spc.total_content_items) * 100
        ELSE 0 
      END)::integer as completion_rate
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  active_students AS (
    SELECT
      COUNT(DISTINCT ucip.user_id) as active_count
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND ucip.updated_at > NOW() - INTERVAL '30 days'
  ),
  assignment_submissions AS (
    SELECT
      COUNT(asub.id) as total_submissions,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND asub.grade IS NOT NULL
  ),
  course_assignments AS (
    SELECT
      COUNT(clc.id) as assignment_count
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND clc.content_type = 'assignment'
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM students_in_courses)::integer as total_students,
    COALESCE((SELECT active_count FROM active_students), 0)::integer as active_students,
    COALESCE((SELECT AVG(completion_rate)::integer FROM student_completion_rates), 0)::integer as average_completion,
    COALESCE((SELECT avg_score FROM assignment_submissions), 0)::integer as average_score,
    (SELECT COUNT(*) FROM teacher_courses)::integer as courses_published,
    COALESCE((SELECT assignment_count FROM course_assignments), 0)::integer as total_assignments,
    (SELECT COUNT(*) FROM students_in_courses)::integer as total_enrollments,
    CASE 
      WHEN (SELECT COUNT(DISTINCT user_id) FROM students_in_courses) > 0 THEN
        ROUND((COALESCE((SELECT active_count FROM active_students), 0)::decimal / (SELECT COUNT(DISTINCT user_id) FROM students_in_courses)) * 100)::integer
      ELSE 0 
    END as average_engagement;
END;
$$;
