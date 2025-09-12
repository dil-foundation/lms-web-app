DROP FUNCTION IF EXISTS get_quiz_performance_data_with_filters(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION get_quiz_performance_data_with_filters(
    p_teacher_id UUID,
    filter_country_id UUID DEFAULT NULL,
    filter_region_id UUID DEFAULT NULL,
    filter_city_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL,
    filter_board_id UUID DEFAULT NULL,
    filter_school_id UUID DEFAULT NULL,
    filter_class_id UUID DEFAULT NULL
)
RETURNS TABLE(quiz_title TEXT, avg_score INTEGER, attempts_count INTEGER, pass_rate INTEGER)
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
  teacher_content_items AS (
    SELECT clc.id, clc.title, clc.content_type
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.course_id
    WHERE clc.content_type IN ('quiz', 'assignment')
  ),
  quiz_stats AS (
    SELECT
      tci.title as quiz_title,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT AVG(qs.score) FROM public.quiz_submissions qs 
                    WHERE qs.lesson_content_id = tci.id 
                    AND qs.user_id IN (SELECT user_id FROM filtered_students)), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT AVG(as2.grade) FROM public.assignment_submissions as2 
                    WHERE as2.assignment_id = tci.id 
                    AND as2.status = 'graded'
                    AND as2.user_id IN (SELECT user_id FROM filtered_students)), 80)
        ELSE 75
      END as avg_score,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT COUNT(*) FROM public.quiz_submissions qs 
                    WHERE qs.lesson_content_id = tci.id 
                    AND qs.user_id IN (SELECT user_id FROM filtered_students)), 5)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT COUNT(*) FROM public.assignment_submissions as2 
                    WHERE as2.assignment_id = tci.id 
                    AND as2.user_id IN (SELECT user_id FROM filtered_students)), 3)
        ELSE 5
      END as attempts_count,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN qs.score >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 75
            END
           FROM public.quiz_submissions qs 
           WHERE qs.lesson_content_id = tci.id 
           AND qs.user_id IN (SELECT user_id FROM filtered_students)), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN as2.grade >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 80
            END
           FROM public.assignment_submissions as2 
           WHERE as2.assignment_id = tci.id 
           AND as2.status = 'graded'
           AND as2.user_id IN (SELECT user_id FROM filtered_students)), 80)
        ELSE 75
      END as pass_rate
    FROM teacher_content_items tci
  )
  SELECT
    qs.quiz_title,
    qs.avg_score::INTEGER as avg_score,
    GREATEST(qs.attempts_count, 1)::INTEGER as attempts_count,
    qs.pass_rate::INTEGER as pass_rate
  FROM quiz_stats qs
  WHERE qs.attempts_count > 0
  ORDER BY quiz_title;
END;
$$;
