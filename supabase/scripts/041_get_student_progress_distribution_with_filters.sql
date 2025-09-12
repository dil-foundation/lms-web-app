DROP FUNCTION IF EXISTS get_student_progress_distribution_with_filters(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION get_student_progress_distribution_with_filters(
    p_teacher_id UUID,
    filter_country_id UUID DEFAULT NULL,
    filter_region_id UUID DEFAULT NULL,
    filter_city_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL,
    filter_board_id UUID DEFAULT NULL,
    filter_school_id UUID DEFAULT NULL,
    filter_class_id UUID DEFAULT NULL
)
RETURNS TABLE(category_name TEXT, student_count BIGINT, color_code TEXT)
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
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id as course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
      AND cm.user_id IN (SELECT user_id FROM filtered_students)
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
  progress_categories AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.9 THEN 'Excellent (90-100%)'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.8 THEN 'Good (80-89%)'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.7 THEN 'Average (70-79%)'
        ELSE 'Needs Help (<70%)'
      END AS category
    FROM student_overall_progress sop
  )
  SELECT
    pc.category,
    COUNT(pc.user_id) AS student_count,
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN '#10B981'::text
      WHEN 'Good (80-89%)' THEN '#3B82F6'::text
      WHEN 'Average (70-79%)' THEN '#F59E0B'::text
      WHEN 'Needs Help (<70%)' THEN '#EF4444'::text
      ELSE '#6B7280'::text
    END AS color_code
  FROM progress_categories pc
  GROUP BY pc.category
  ORDER BY
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN 1
      WHEN 'Good (80-89%)' THEN 2
      WHEN 'Average (70-79%)' THEN 3
      WHEN 'Needs Help (<70%)' THEN 4
      WHEN 'Not Started' THEN 5
      ELSE 6
    END;
END;
$$;
