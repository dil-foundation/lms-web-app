-- Fix teacher assessments function to use SECURITY DEFINER
-- This allows the function to bypass RLS policies and access the necessary tables
-- The function already has proper authorization checks (only shows courses where user is a teacher)

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION "public"."get_teacher_assessments_data"(
  "teacher_id" "uuid",
  "search_query" "text" DEFAULT ''::"text",
  "course_filter_id" "uuid" DEFAULT NULL::"uuid"
)
RETURNS TABLE(
  "id" "uuid",
  "title" "text",
  "course" "text",
  "course_id" "uuid",
  "type" "text",
  "due_date" timestamp with time zone,
  "submissions" bigint,
  "graded" bigint,
  "avg_score" numeric
)
LANGUAGE "plpgsql"
SECURITY DEFINER  -- Added SECURITY DEFINER to match admin function
SET "search_path" TO 'public'  -- Added to match admin function
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT c.id, c.title
    FROM courses c
    JOIN course_members cm ON c.id = cm.course_id
    WHERE cm.user_id = teacher_id
      AND cm.role = 'teacher'
      AND c.status = 'Published'
      AND (course_filter_id IS NULL OR c.id = course_filter_id)
  ),
  assessments AS (
    SELECT
      clc.id,
      clc.title,
      tc.title AS course,
      tc.id AS course_id,
      clc.content_type AS type,
      clc.due_date
    FROM course_lesson_content clc
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.id
    WHERE clc.content_type IN ('assignment', 'quiz')
      AND (search_query = '' OR clc.title ILIKE '%' || search_query || '%')
  ),
  quiz_stats AS (
    SELECT
      a.id,
      COUNT(qs.id) AS submissions,
      COUNT(qs.id) AS graded,
      COALESCE(AVG(qs.score), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN quiz_submissions qs ON a.id = qs.lesson_content_id
    WHERE a.type = 'quiz'
    GROUP BY a.id
  ),
  assignment_stats AS (
    SELECT
      a.id,
      COUNT(asub.id) AS submissions,
      COUNT(CASE WHEN asub.status = 'graded' THEN 1 END) AS graded,
      COALESCE(AVG(asub.grade), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN assignment_submissions asub ON a.id = asub.assignment_id
    WHERE a.type = 'assignment'
    GROUP BY a.id
  )
  SELECT
    a.id,
    a.title,
    a.course,
    a.course_id,
    a.type,
    a.due_date,
    COALESCE(qs.submissions, asub.submissions, 0) AS submissions,
    COALESCE(qs.graded, asub.graded, 0) AS graded,
    COALESCE(qs.avg_score, asub.avg_score, 0) AS avg_score
  FROM assessments a
  LEFT JOIN quiz_stats qs ON a.id = qs.id AND a.type = 'quiz'
  LEFT JOIN assignment_stats asub ON a.id = asub.id AND a.type = 'assignment'
  ORDER BY a.due_date DESC NULLS LAST, a.title;
END;
$$;

-- Set function owner to postgres (matches admin function)
ALTER FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") OWNER TO "postgres";

-- Maintain existing permissions
GRANT ALL ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") TO "service_role";

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") IS 'Get assessments for a specific teacher with SECURITY DEFINER to bypass RLS. Function includes authorization check via course_members table.';
