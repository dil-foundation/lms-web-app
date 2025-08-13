DROP FUNCTION IF EXISTS public.get_student_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_student_dashboard_stats(
    student_id uuid
)
RETURNS TABLE (
    enrolled_courses_count integer,
    total_lessons_count integer,
    completed_lessons_count integer,
    active_discussions_count integer,
    study_streak_days integer,
    total_study_time_minutes integer,
    average_grade decimal,
    upcoming_assignments_count integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.user_id = student_id 
      AND cm.role = 'student' 
      AND c.status = 'Published'
  ),
  total_content_items AS (
    SELECT COUNT(clc.id) as count
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM student_courses)
  ),
  content_item_progress AS (
    SELECT
      ucip.completed_at
    FROM public.user_content_item_progress ucip
    WHERE ucip.user_id = student_id
      AND ucip.course_id IN (SELECT course_id FROM student_courses)
  ),
  discussion_participation AS (
    SELECT COUNT(DISTINCT d.id) as active_discussions
    FROM public.discussions d
    JOIN public.discussion_replies dr ON d.id = dr.discussion_id
    WHERE dr.user_id = student_id
  ),
  study_dates AS (
    SELECT DISTINCT DATE(ucip.updated_at) as study_date
    FROM public.user_content_item_progress ucip
    WHERE ucip.user_id = student_id 
      AND ucip.course_id IN (SELECT course_id FROM student_courses)
      AND ucip.updated_at >= NOW() - INTERVAL '30 days'
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
      END::integer as streak_days
    FROM study_dates
    WHERE study_date = (
      SELECT MAX(study_date) FROM study_dates
    )
  ),
  assignment_grades AS (
    SELECT
        AVG(asub.grade) as avg_grade
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE asub.user_id = student_id
    AND cs.course_id IN (SELECT course_id FROM student_courses)
    AND asub.status = 'graded'
    AND asub.grade IS NOT NULL
  ),
  upcoming_assignments AS (
    SELECT COUNT(DISTINCT clc.id) as upcoming_count
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE clc.content_type = 'assignment'
    AND cs.course_id IN (SELECT course_id FROM student_courses)
    AND clc.due_date > NOW()
    AND clc.due_date <= NOW() + INTERVAL '7 days'
    AND NOT EXISTS (
        SELECT 1 FROM public.assignment_submissions asub
        WHERE asub.assignment_id = clc.id AND asub.user_id = student_id
    )
  )
  SELECT 
    (SELECT COUNT(*) FROM student_courses)::INTEGER as enrolled_courses_count,
    (SELECT count FROM total_content_items)::INTEGER as total_lessons_count,
    (SELECT COUNT(*) FROM content_item_progress WHERE completed_at IS NOT NULL)::INTEGER as completed_lessons_count,
    COALESCE((SELECT active_discussions FROM discussion_participation), 0)::INTEGER as active_discussions_count,
    COALESCE((SELECT streak_days FROM study_streak), 0)::INTEGER as study_streak_days,
    0::INTEGER as total_study_time_minutes, -- NOTE: user_content_item_progress does not track time spent.
    COALESCE((SELECT avg_grade FROM assignment_grades), 0)::DECIMAL as average_grade,
    (SELECT upcoming_count FROM upcoming_assignments)::INTEGER as upcoming_assignments_count;
END;
$$;