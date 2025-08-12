DROP FUNCTION IF EXISTS public.get_student_upcoming_assignments(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_student_upcoming_assignments(
    student_id uuid,
    days_ahead integer
)
RETURNS TABLE (
    assignment_id uuid,
    assignment_title text,
    course_title text,
    due_date timestamp with time zone,
    days_remaining integer,
    priority text,
    submission_status text
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
  upcoming_assignments AS (
    SELECT 
      clc.id as assignment_id,
      clc.title as assignment_title,
      c.title as course_title,
      clc.due_date,
      EXTRACT(DAY FROM clc.due_date - NOW())::INTEGER as days_remaining,
      CASE 
        WHEN clc.due_date <= NOW() + INTERVAL '1 day' THEN 'High'
        WHEN clc.due_date <= NOW() + INTERVAL '3 days' THEN 'Medium'
        ELSE 'Low'
      END as priority,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.assignment_submissions asub
          WHERE asub.assignment_id = clc.id AND asub.user_id = student_id
        ) THEN 'Submitted'
        ELSE 'Not Submitted'
      END as submission_status
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
    JOIN public.courses c ON sc.course_id = c.id
    WHERE clc.content_type = 'assignment'
      AND clc.due_date IS NOT NULL
      AND clc.due_date > NOW()
      AND clc.due_date <= NOW() + (days_ahead || ' days')::INTERVAL
  )
  SELECT ua.* FROM upcoming_assignments ua
  ORDER BY ua.due_date ASC;
END;
$$;