DROP FUNCTION IF EXISTS public.get_student_progress_distribution(uuid);

CREATE OR REPLACE FUNCTION public.get_student_progress_distribution(
    p_teacher_id UUID
)
RETURNS TABLE(category_name TEXT, student_count BIGINT, color_code TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- 1. Get all courses for the given teacher
  WITH teacher_courses AS (
    SELECT course_id
    FROM public.course_members
    WHERE user_id = p_teacher_id AND role = 'teacher'
  ),

  -- 2. Get the total number of content items for each of the teacher's courses
  course_item_counts AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_items
    FROM public.course_sections cs
    JOIN public.course_lessons cl ON cs.id = cl.section_id
    JOIN public.course_lesson_content clc ON cl.id = clc.lesson_id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY cs.course_id
  ),

  -- 3. Get all students enrolled in the teacher's courses
  teacher_students AS (
      SELECT DISTINCT user_id
      FROM public.course_members
      WHERE course_id IN (SELECT course_id FROM teacher_courses)
        AND role = 'student'
  ),

  -- 4. For each student, find the number of unique content items they've interacted with (progressed)
  student_progress_counts AS (
      SELECT
          ucip.user_id,
          COUNT(DISTINCT ucip.lesson_content_id) as progressed_items
      FROM public.user_content_item_progress ucip
      WHERE ucip.user_id IN (SELECT user_id FROM teacher_students)
        AND ucip.course_id IN (SELECT course_id FROM teacher_courses)
      GROUP BY ucip.user_id
  ),
  
  -- 5. For each student, calculate their total possible items across all courses they share with the teacher
  student_total_items AS (
      SELECT
          cm.user_id,
          SUM(cic.total_items) as total_items
      FROM public.course_members cm
      JOIN course_item_counts cic ON cm.course_id = cic.course_id
      WHERE cm.user_id IN (SELECT user_id FROM teacher_students)
        AND cm.role = 'student'
      GROUP BY cm.user_id
  ),

  -- 6. Combine progress and total items for each student and categorize them
  progress_categories AS (
    SELECT
      ts.user_id,
      CASE
        WHEN COALESCE(sti.total_items, 0) = 0 THEN 'Not Started'
        WHEN COALESCE(spc.progressed_items, 0) = 0 THEN 'Not Started'
        WHEN (COALESCE(spc.progressed_items, 0)::DECIMAL / sti.total_items) >= 0.9 THEN 'Excellent (90-100%)'
        WHEN (COALESCE(spc.progressed_items, 0)::DECIMAL / sti.total_items) >= 0.8 THEN 'Good (80-89%)'
        WHEN (COALESCE(spc.progressed_items, 0)::DECIMAL / sti.total_items) >= 0.7 THEN 'Average (70-79%)'
        ELSE 'Needs Help (<70%)'
      END AS category
    FROM teacher_students ts
    LEFT JOIN student_progress_counts spc ON ts.user_id = spc.user_id
    LEFT JOIN student_total_items sti ON ts.user_id = sti.user_id
  )

  -- 7. Count students in each category
  SELECT
    pc.category,
    COUNT(pc.user_id) AS student_count,
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN '#10B981'::TEXT
      WHEN 'Good (80-89%)' THEN '#3B82F6'::TEXT
      WHEN 'Average (70-79%)' THEN '#F59E0B'::TEXT
      WHEN 'Needs Help (<70%)' THEN '#EF4444'::TEXT
      ELSE '#6B7280'::TEXT
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