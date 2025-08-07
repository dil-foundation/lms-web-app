DROP FUNCTION IF EXISTS public.get_engagement_trends_data(uuid, text);

CREATE OR REPLACE FUNCTION public.get_engagement_trends_data(
    teacher_id uuid,
    time_range text
)
RETURNS TABLE (
    week_label text,
    discussions_count bigint,
    assignments_count bigint,
    quizzes_count bigint,
    videos_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN start_date := NOW() - INTERVAL '1 year';
    ELSE -- alltime (limit to a reasonable past for performance, e.g. 2 years)
      start_date := NOW() - INTERVAL '2 years';
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  weeks AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY week_start) as week_number,
      'Week ' || ROW_NUMBER() OVER (ORDER BY week_start)::TEXT as week_label,
      week_start
    FROM generate_series(
      date_trunc('week', start_date),
      date_trunc('week', NOW()),
      '1 week'::INTERVAL
    ) as gs(week_start)
  ),
  discussions_by_week AS (
      SELECT
          date_trunc('week', d.created_at) as week_start,
          COUNT(d.id) as count
      FROM public.discussions d
      WHERE d.course_id IN (SELECT course_id FROM teacher_courses)
      AND d.created_at >= start_date
      GROUP BY 1
  ),
  assignments_by_week AS (
      SELECT
          date_trunc('week', asub.submitted_at) as week_start,
          COUNT(asub.id) as count
      FROM public.assignment_submissions asub
      JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
      JOIN public.course_lessons cl ON clc.lesson_id = cl.id
      JOIN public.course_sections cs ON cl.section_id = cs.id
      WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
      AND asub.submitted_at >= start_date
      GROUP BY 1
  ),
  quizzes_by_week AS (
      SELECT
          date_trunc('week', qs.submitted_at) as week_start,
          COUNT(qs.id) as count
      FROM public.quiz_submissions qs
      JOIN public.course_lessons cl ON qs.lesson_id = cl.id
      JOIN public.course_sections cs ON cl.section_id = cs.id
      WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
      AND qs.submitted_at >= start_date
      GROUP BY 1
  ),
  videos_by_week AS (
      SELECT
          date_trunc('week', ucip.updated_at) as week_start,
          COUNT(ucip.id) as count
      FROM public.user_content_item_progress ucip
      JOIN public.course_lesson_content clc ON ucip.lesson_content_id = clc.id
      WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
      AND clc.content_type = 'video'
      AND (ucip.progress_data->>'time_spent_seconds')::numeric > 0
      AND ucip.updated_at >= start_date
      GROUP BY 1
  )
  SELECT
      w.week_label,
      COALESCE(d.count, 0),
      COALESCE(a.count, 0),
      COALESCE(q.count, 0),
      COALESCE(v.count, 0)
  FROM weeks w
  LEFT JOIN discussions_by_week d ON w.week_start = d.week_start
  LEFT JOIN assignments_by_week a ON w.week_start = a.week_start
  LEFT JOIN quizzes_by_week q ON w.week_start = q.week_start
  LEFT JOIN videos_by_week v ON w.week_start = v.week_start
  ORDER BY w.week_number;
END;
$$;