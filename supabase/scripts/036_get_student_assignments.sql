CREATE OR REPLACE FUNCTION get_student_assignments(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    title text,
    overview text,
    description text,
    due_date timestamp with time zone,
    course_title text,
    course_id uuid,
    submission_id uuid,
    submitted_at timestamp with time zone,
    submission_status text,
    submission_content text,
    submission_type text,
    feedback text,
    graded_at timestamp with time zone,
    grade integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    clc.id,
    clc.title,
    cl.overview,
    clc.content_path AS description,
    cl.due_date,
    c.title AS course_title,
    c.id AS course_id,
    sub.id AS submission_id,
    sub.submitted_at,
    sub.status AS submission_status,
    sub.content AS submission_content,
    sub.submission_type,
    sub.feedback,
    sub.graded_at,
    sub.grade
  FROM
    public.course_lesson_content AS clc
  JOIN
    public.course_lessons AS cl ON clc.lesson_id = cl.id
  JOIN
    public.course_sections AS cs ON cl.section_id = cs.id
  JOIN
    public.courses AS c ON cs.course_id = c.id
  JOIN
    public.course_members AS cm ON c.id = cm.course_id
  LEFT JOIN
    public.assignment_submissions AS sub ON clc.id = sub.assignment_id AND sub.user_id = p_user_id
  WHERE
    clc.content_type = 'assignment'
    AND cm.user_id = p_user_id
    AND cm.role = 'student'
    AND c.status = 'Published';
END;
$$;
