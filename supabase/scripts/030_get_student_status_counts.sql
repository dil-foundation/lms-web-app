DROP FUNCTION IF EXISTS public.get_student_status_counts(uuid);

CREATE OR REPLACE FUNCTION public.get_student_status_counts(
    teacher_id uuid
)
RETURNS TABLE (
    total_students bigint,
    active_students bigint,
    behind_students bigint,
    excellent_students bigint,
    not_started_students bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id AS course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
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
  student_overall_progress AS (
    SELECT
      spc.user_id,
      SUM(spc.total_content_items) AS total_items,
      SUM(spc.completed_content_items) AS completed_items
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  student_statuses AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.9 THEN 'Excellent'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.7 THEN 'Active'
        ELSE 'Behind'
      END as status
    FROM student_overall_progress sop
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM students_in_courses) as total_students,
    COUNT(CASE WHEN ss.status = 'Active' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Behind' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Excellent' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Not Started' THEN 1 END)
  FROM student_statuses ss;
END;
$$;