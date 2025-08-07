
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  content_items AS (
    SELECT
      cs.course_id,
      cl.id as lesson_id,
      clc.id as content_item_id
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
  ),
  course_progress AS (
    SELECT
      ci.course_id,
      COUNT(DISTINCT ci.lesson_id)::integer as total_lessons,
      COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ci.lesson_id ELSE NULL END)::integer as completed_lessons,
      MAX(ucip.updated_at) as last_accessed,
      -- Calculate percentage based on content items for accuracy
      (COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ci.content_item_id ELSE NULL END)::DECIMAL / NULLIF(COUNT(DISTINCT ci.content_item_id), 0) * 100)::INTEGER as progress_percentage
    FROM content_items ci
    LEFT JOIN public.user_content_item_progress ucip ON ci.content_item_id = ucip.lesson_content_id AND ucip.user_id = student_id
    GROUP BY ci.course_id
  )
  SELECT
    c.id as course_id,
    c.title,
    COALESCE(c.subtitle, '') as subtitle,
    COALESCE(c.image_url, '') as image_url,
    COALESCE(cp.progress_percentage, 0) as progress_percentage,
    COALESCE(cp.total_lessons, 0) as total_lessons,
    COALESCE(cp.completed_lessons, 0) as completed_lessons,
    cp.last_accessed
  FROM public.courses c
  JOIN student_courses sc ON c.id = sc.course_id
  LEFT JOIN course_progress cp ON c.id = cp.course_id
  WHERE c.status = 'Published'
  ORDER BY cp.last_accessed DESC NULLS LAST, c.created_at DESC;
END;
