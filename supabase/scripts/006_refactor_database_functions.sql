-- Refactored Database Functions
-- This script updates the database functions to work with the new 3-tier course structure.

-- First, an important assumption: we need to alter assignment_submissions
-- to link to content items instead of lessons.
ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_fkey,
ADD CONSTRAINT assignment_submissions_assignment_id_fkey
FOREIGN KEY (assignment_id) REFERENCES public.course_lesson_content(id) ON DELETE CASCADE;


-- 1. Refactor: get_student_courses_with_progress
CREATE OR REPLACE FUNCTION public.get_student_courses_with_progress(student_id uuid)
RETURNS TABLE(course_id uuid, title text, subtitle text, image_url text, progress_percentage integer, total_lessons integer, completed_lessons integer, last_accessed timestamp with time zone)
LANGUAGE plpgsql
AS $$
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
      COUNT(DISTINCT ci.lesson_id) as total_lessons,
      COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ci.lesson_id ELSE NULL END) as completed_lessons,
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
$$;


-- 2. Refactor: get_student_assignments
CREATE OR REPLACE FUNCTION public.get_student_assignments(p_user_id uuid)
RETURNS TABLE(id uuid, title text, overview text, description text, due_date timestamp with time zone, course_title text, course_id uuid, submission_id uuid, submitted_at timestamp with time zone, submission_status text, submission_content text, submission_type text, feedback text, graded_at timestamp with time zone, grade integer)
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
    AND cm.role = 'student';
END;
$$;


-- 3. Refactor: get_quiz_performance_data
CREATE OR REPLACE FUNCTION public.get_quiz_performance_data(teacher_id uuid)
RETURNS TABLE(quiz_title text, avg_score integer, attempts_count integer, pass_rate integer)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
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
          COALESCE((SELECT AVG(qs.score) FROM public.quiz_submissions qs WHERE qs.lesson_content_id = tci.id), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT AVG(as2.grade) FROM public.assignment_submissions as2 WHERE as2.assignment_id = tci.id AND as2.status = 'graded'), 80)
        ELSE 75
      END as avg_score,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT COUNT(*) FROM public.quiz_submissions qs WHERE qs.lesson_content_id = tci.id), 5)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT COUNT(*) FROM public.assignment_submissions as2 WHERE as2.assignment_id = tci.id), 3)
        ELSE 5
      END as attempts_count,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN qs.score >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 75
            END
           FROM public.quiz_submissions qs WHERE qs.lesson_content_id = tci.id), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN as2.grade >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 80
            END
           FROM public.assignment_submissions as2 WHERE as2.assignment_id = tci.id AND as2.status = 'graded'), 80)
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
  UNION ALL
  SELECT
    'No Quizzes Available'::TEXT as quiz_title, 0::INTEGER, 1::INTEGER, 0::INTEGER
  WHERE NOT EXISTS (SELECT 1 FROM quiz_stats qs WHERE qs.attempts_count > 0)
  ORDER BY attempts_count DESC
  LIMIT 5;
END;
$$;


-- 4. Refactor: publish_draft
CREATE OR REPLACE FUNCTION public.publish_draft(draft_id_in uuid, published_id_in uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec_section record;
  rec_lesson record;
  rec_content_item record;
  rec_question record;
  rec_option record;
  new_section_id uuid;
  new_lesson_id uuid;
  new_content_item_id uuid;
  new_question_id uuid;
BEGIN
  -- Clean up the old content of the published course
  DELETE FROM public.course_sections WHERE course_id = published_id_in;
  DELETE FROM public.course_members WHERE course_id = published_id_in;

  -- Update the published course's main details
  UPDATE public.courses
  SET
      title = draft.title,
      subtitle = draft.subtitle,
      description = draft.description,
      category_id = draft.category_id,
      language_id = draft.language_id,
      level_id = draft.level_id,
      image_url = draft.image_url,
      duration = draft.duration,
      requirements = draft.requirements,
      learning_outcomes = draft.learning_outcomes,
      updated_at = now()
  FROM public.courses AS draft
  WHERE
      courses.id = published_id_in AND draft.id = draft_id_in;

  -- Loop through draft's sections, lessons, content items, and quizzes to copy them
  FOR rec_section IN SELECT * FROM public.course_sections WHERE course_id = draft_id_in ORDER BY position LOOP
    INSERT INTO public.course_sections (course_id, title, overview, position)
    VALUES (published_id_in, rec_section.title, rec_section.overview, rec_section.position)
    RETURNING id INTO new_section_id;

    FOR rec_lesson IN SELECT * FROM public.course_lessons WHERE section_id = rec_section.id ORDER BY position LOOP
      INSERT INTO public.course_lessons (section_id, title, overview, due_date, "position", duration_text)
      VALUES (new_section_id, rec_lesson.title, rec_lesson.overview, rec_lesson.due_date, rec_lesson.position, rec_lesson.duration_text)
      RETURNING id INTO new_lesson_id;

      FOR rec_content_item IN SELECT * FROM public.course_lesson_content WHERE lesson_id = rec_lesson.id ORDER BY position LOOP
        INSERT INTO public.course_lesson_content (lesson_id, title, content_type, content_path, position)
        VALUES (new_lesson_id, rec_content_item.title, rec_content_item.content_type, rec_content_item.content_path, rec_content_item.position)
        RETURNING id INTO new_content_item_id;

        IF rec_content_item.content_type = 'quiz' THEN
          FOR rec_question IN SELECT * FROM public.quiz_questions WHERE lesson_content_id = rec_content_item.id ORDER BY position LOOP
            INSERT INTO public.quiz_questions (lesson_content_id, question_text, position)
            VALUES (new_content_item_id, rec_question.question_text, rec_question.position)
            RETURNING id INTO new_question_id;

            FOR rec_option IN SELECT * FROM public.question_options WHERE question_id = rec_question.id ORDER BY position LOOP
              INSERT INTO public.question_options (question_id, option_text, is_correct, position)
              VALUES (new_question_id, rec_option.option_text, rec_option.is_correct, rec_option.position);
            END LOOP; -- options
          END LOOP; -- questions
        END IF; -- quiz check
      END LOOP; -- content items
    END LOOP; -- lessons
  END LOOP; -- sections

  -- Copy members
  INSERT INTO public.course_members (course_id, user_id, role)
  SELECT published_id_in, user_id, role
  FROM public.course_members
  WHERE course_id = draft_id_in;

  -- Delete draft course
  DELETE FROM public.courses WHERE id = draft_id_in;
END;
$$;