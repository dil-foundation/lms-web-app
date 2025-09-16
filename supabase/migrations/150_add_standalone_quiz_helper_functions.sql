-- Migration: Add Standalone Quiz Helper Functions and Views
-- This migration adds additional helper functions and views for the standalone quiz system

-- 1. Create view for quiz summary with statistics
CREATE OR REPLACE VIEW public.standalone_quiz_summary AS
SELECT 
  sq.id,
  sq.title,
  sq.description,
  sq.status,
  sq.visibility,
  sq.difficulty_level,
  sq.estimated_duration_minutes,
  sq.max_attempts,
  sq.passing_score,
  sq.author_id,
  p.first_name || ' ' || p.last_name as author_name,
  p.email as author_email,
  COUNT(DISTINCT sqq.id) as total_questions,
  COUNT(DISTINCT sqa.id) as total_attempts,
  COUNT(DISTINCT sqa.user_id) as unique_users,
  ROUND(AVG(sqa.score), 2) as average_score,
  ROUND(
    (COUNT(*) FILTER (WHERE sqa.score >= sq.passing_score)::numeric / 
     NULLIF(COUNT(sqa.id), 0)::numeric) * 100, 
    2
  ) as pass_rate,
  sq.created_at,
  sq.updated_at,
  sq.published_at
FROM public.standalone_quizzes sq
LEFT JOIN public.profiles p ON p.id = sq.author_id
LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
LEFT JOIN public.standalone_quiz_attempts sqa ON sq.id = sqa.quiz_id
GROUP BY sq.id, sq.title, sq.description, sq.status, sq.visibility, 
         sq.difficulty_level, sq.estimated_duration_minutes, sq.max_attempts,
         sq.passing_score, sq.author_id, p.first_name, p.last_name, p.email,
         sq.created_at, sq.updated_at, sq.published_at;

-- 2. Create function to get quiz performance analytics
DROP FUNCTION IF EXISTS public.get_quiz_performance_analytics(uuid);
CREATE OR REPLACE FUNCTION public.get_quiz_performance_analytics(input_quiz_id uuid)
RETURNS TABLE (
  metric_name text,
  metric_value numeric,
  metric_description text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH quiz_stats AS (
    SELECT 
      COUNT(*) as total_attempts,
      COUNT(DISTINCT user_id) as unique_users,
      AVG(score) as avg_score,
      MIN(score) as min_score,
      MAX(score) as max_score,
      STDDEV(score) as score_stddev,
      COUNT(*) FILTER (WHERE score >= sq.passing_score) as passed_attempts,
      COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) as completed_attempts,
      AVG(time_taken_minutes) as avg_time_taken
    FROM public.standalone_quiz_attempts sqa
    JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
    WHERE sqa.quiz_id = input_quiz_id
  )
  SELECT 'total_attempts'::text, total_attempts::numeric, 'Total number of quiz attempts'::text FROM quiz_stats
  UNION ALL
  SELECT 'unique_users'::text, unique_users::numeric, 'Number of unique users who attempted the quiz'::text FROM quiz_stats
  UNION ALL
  SELECT 'average_score'::text, ROUND(avg_score, 2), 'Average score across all attempts'::text FROM quiz_stats
  UNION ALL
  SELECT 'min_score'::text, min_score, 'Lowest score achieved'::text FROM quiz_stats
  UNION ALL
  SELECT 'max_score'::text, max_score, 'Highest score achieved'::text FROM quiz_stats
  UNION ALL
  SELECT 'score_stddev'::text, ROUND(score_stddev, 2), 'Standard deviation of scores'::text FROM quiz_stats
  UNION ALL
  SELECT 'pass_rate'::text, ROUND((passed_attempts::numeric / NULLIF(total_attempts, 0)::numeric) * 100, 2), 'Percentage of attempts that passed'::text FROM quiz_stats
  UNION ALL
  SELECT 'completion_rate'::text, ROUND((completed_attempts::numeric / NULLIF(total_attempts, 0)::numeric) * 100, 2), 'Percentage of attempts that were completed'::text FROM quiz_stats
  UNION ALL
  SELECT 'avg_time_taken'::text, ROUND(avg_time_taken, 2), 'Average time taken to complete the quiz (minutes)'::text FROM quiz_stats;
END;
$$;

-- 3. Create function to get question performance analytics
DROP FUNCTION IF EXISTS public.get_question_performance_analytics(uuid);
CREATE OR REPLACE FUNCTION public.get_question_performance_analytics(input_quiz_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  question_type text,
  "position" integer,
  total_attempts bigint,
  correct_attempts bigint,
  accuracy_rate numeric,
  average_time_seconds numeric
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqq.id,
    sqq.question_text,
    sqq.question_type,
    sqq.position,
    COUNT(sqa.id) as total_attempts,
    COUNT(*) FILTER (WHERE 
      CASE 
        WHEN sqq.question_type = 'single_choice' THEN
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(sqa.answers) as answer
            WHERE answer->>'question_id' = sqq.id::text
              AND answer->>'selected_option' = (
                SELECT sqo.id::text FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                LIMIT 1
              )
          )
        WHEN sqq.question_type = 'multiple_choice' THEN
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(sqa.answers) as answer
            WHERE answer->>'question_id' = sqq.id::text
              AND (
                SELECT COUNT(*) FROM jsonb_array_elements_text(answer->'selected_options') as selected
                JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
              ) = (
                SELECT COUNT(*) FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
              )
          )
        WHEN sqq.question_type = 'text_answer' THEN
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(sqa.answers) as answer
            WHERE answer->>'question_id' = sqq.id::text
              AND answer->>'text_answer' IS NOT NULL
              AND answer->>'text_answer' != ''
          )
        WHEN sqq.question_type = 'math_expression' THEN
          EXISTS (
            SELECT 1 FROM public.standalone_quiz_math_answers sqma
            WHERE sqma.question_id = sqq.id 
              AND sqma.user_id = sqa.user_id
              AND sqma.is_correct = true
          )
        ELSE false
      END
    ) as correct_attempts,
    ROUND(
      (COUNT(*) FILTER (WHERE 
        CASE 
          WHEN sqq.question_type = 'single_choice' THEN
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(sqa.answers) as answer
              WHERE answer->>'question_id' = sqq.id::text
                AND answer->>'selected_option' = (
                  SELECT sqo.id::text FROM public.standalone_question_options sqo
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                  LIMIT 1
                )
            )
          WHEN sqq.question_type = 'multiple_choice' THEN
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(sqa.answers) as answer
              WHERE answer->>'question_id' = sqq.id::text
                AND (
                  SELECT COUNT(*) FROM jsonb_array_elements_text(answer->'selected_options') as selected
                  JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                ) = (
                  SELECT COUNT(*) FROM public.standalone_question_options sqo
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                )
            )
          WHEN sqq.question_type = 'text_answer' THEN
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(sqa.answers) as answer
              WHERE answer->>'question_id' = sqq.id::text
                AND answer->>'text_answer' IS NOT NULL
                AND answer->>'text_answer' != ''
            )
          WHEN sqq.question_type = 'math_expression' THEN
            EXISTS (
              SELECT 1 FROM public.standalone_quiz_math_answers sqma
              WHERE sqma.question_id = sqq.id 
                AND sqma.user_id = sqa.user_id
                AND sqma.is_correct = true
            )
          ELSE false
        END
      )::numeric / NULLIF(COUNT(sqa.id), 0)::numeric) * 100, 
      2
    ) as accuracy_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (sqa.submitted_at - sqa.created_at))), 2) as average_time_seconds
  FROM public.standalone_quiz_questions sqq
  LEFT JOIN public.standalone_quiz_attempts sqa ON sqq.quiz_id = sqa.quiz_id
  WHERE sqq.quiz_id = input_quiz_id
  GROUP BY sqq.id, sqq.question_text, sqq.question_type, sqq.position
  ORDER BY sqq.position;
END;
$$;

-- 4. Create function to get user's quiz history
DROP FUNCTION IF EXISTS public.get_user_quiz_history(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_user_quiz_history(input_user_id uuid, limit_count integer DEFAULT 50)
RETURNS TABLE (
  quiz_id uuid,
  quiz_title text,
  quiz_status text,
  quiz_visibility text,
  attempt_id uuid,
  attempt_number integer,
  score numeric,
  time_taken_minutes integer,
  submitted_at timestamp with time zone,
  can_retake boolean,
  author_name text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.status,
    sq.visibility,
    sqa.id,
    sqa.attempt_number,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    CASE 
      WHEN sq.allow_retake = true AND sqa.attempt_number < sq.max_attempts THEN true
      ELSE false
    END as can_retake,
    p.first_name || ' ' || p.last_name as author_name
  FROM public.standalone_quiz_attempts sqa
  JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
  JOIN public.profiles p ON p.id = sq.author_id
  WHERE sqa.user_id = input_user_id
  ORDER BY sqa.submitted_at DESC
  LIMIT limit_count;
END;
$$;

-- 5. Create function to get quiz leaderboard
DROP FUNCTION IF EXISTS public.get_quiz_leaderboard(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(input_quiz_id uuid, limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_email text,
  best_score numeric,
  best_attempt_id uuid,
  total_attempts bigint,
  first_attempt_at timestamp with time zone,
  last_attempt_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_best_scores AS (
    SELECT 
      sqa.user_id,
      MAX(sqa.score) as best_score,
      (SELECT id FROM public.standalone_quiz_attempts sqa2 
       WHERE sqa2.user_id = sqa.user_id AND sqa2.quiz_id = sqa.quiz_id 
       ORDER BY sqa2.score DESC, sqa2.submitted_at ASC LIMIT 1) as best_attempt_id,
      COUNT(*) as total_attempts,
      MIN(sqa.submitted_at) as first_attempt_at,
      MAX(sqa.submitted_at) as last_attempt_at
    FROM public.standalone_quiz_attempts sqa
    WHERE sqa.quiz_id = input_quiz_id
    GROUP BY sqa.user_id
  )
  SELECT 
    ubs.user_id,
    p.first_name || ' ' || p.last_name as user_name,
    p.email as user_email,
    ubs.best_score,
    ubs.best_attempt_id,
    ubs.total_attempts,
    ubs.first_attempt_at,
    ubs.last_attempt_at
  FROM user_best_scores ubs
  JOIN public.profiles p ON p.id = ubs.user_id
  ORDER BY ubs.best_score DESC, ubs.first_attempt_at ASC
  LIMIT limit_count;
END;
$$;

-- 6. Create function to get quiz completion status for a user
DROP FUNCTION IF EXISTS public.get_user_quiz_completion_status(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_user_quiz_completion_status(input_user_id uuid, input_quiz_id uuid)
RETURNS TABLE (
  quiz_id uuid,
  user_id uuid,
  has_attempted boolean,
  total_attempts bigint,
  best_score numeric,
  passed boolean,
  can_retake boolean,
  next_attempt_number integer,
  last_attempt_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    input_user_id,
    (COUNT(sqa.id) > 0) as has_attempted,
    COUNT(sqa.id) as total_attempts,
    MAX(sqa.score) as best_score,
    (MAX(sqa.score) >= sq.passing_score) as passed,
    CASE 
      WHEN sq.allow_retake = true AND COUNT(sqa.id) < sq.max_attempts THEN true
      ELSE false
    END as can_retake,
    (COUNT(sqa.id) + 1) as next_attempt_number,
    MAX(sqa.submitted_at) as last_attempt_at
  FROM public.standalone_quizzes sq
  LEFT JOIN public.standalone_quiz_attempts sqa ON sq.id = sqa.quiz_id 
    AND sqa.user_id = input_user_id
  WHERE sq.id = input_quiz_id
  GROUP BY sq.id, sq.passing_score, sq.allow_retake, sq.max_attempts;
END;
$$;

-- 7. Create function to get quizzes linked to a course
DROP FUNCTION IF EXISTS public.get_course_linked_quizzes(uuid);
CREATE OR REPLACE FUNCTION public.get_course_linked_quizzes(course_id uuid)
RETURNS TABLE (
  quiz_id uuid,
  quiz_title text,
  quiz_description text,
  link_type text,
  "position" integer,
  is_required boolean,
  due_date timestamp with time zone,
  lesson_content_id uuid,
  lesson_title text,
  section_title text,
  quiz_status text,
  quiz_visibility text,
  total_questions bigint,
  author_name text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    qcl.link_type,
    qcl.position,
    qcl.is_required,
    qcl.due_date,
    qcl.lesson_content_id,
    clc.title as lesson_title,
    cs.title as section_title,
    sq.status,
    sq.visibility,
    COUNT(DISTINCT sqq.id) as total_questions,
    p.first_name || ' ' || p.last_name as author_name
  FROM public.quiz_course_links qcl
  JOIN public.standalone_quizzes sq ON sq.id = qcl.quiz_id
  JOIN public.profiles p ON p.id = sq.author_id
  LEFT JOIN public.course_lesson_content clc ON clc.id = qcl.lesson_content_id
  LEFT JOIN public.course_lessons cl ON cl.id = clc.lesson_id
  LEFT JOIN public.course_sections cs ON cs.id = cl.section_id
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  WHERE qcl.course_id = get_course_linked_quizzes.course_id
  GROUP BY sq.id, sq.title, sq.description, qcl.link_type, qcl.position, 
           qcl.is_required, qcl.due_date, qcl.lesson_content_id, clc.title, 
           cs.title, sq.status, sq.visibility, p.first_name, p.last_name
  ORDER BY qcl.position;
END;
$$;

-- 8. Create function to get available quizzes for course linking
DROP FUNCTION IF EXISTS public.get_available_quizzes_for_course(uuid, uuid, text, text, integer);
CREATE OR REPLACE FUNCTION public.get_available_quizzes_for_course(
  course_id uuid, 
  author_id uuid DEFAULT NULL,
  search_term text DEFAULT '',
  difficulty_filter text DEFAULT '',
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  quiz_id uuid,
  quiz_title text,
  quiz_description text,
  difficulty_level text,
  estimated_duration_minutes integer,
  total_questions bigint,
  author_name text,
  is_already_linked boolean,
  created_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.difficulty_level,
    sq.estimated_duration_minutes,
    COUNT(DISTINCT sqq.id) as total_questions,
    p.first_name || ' ' || p.last_name as author_name,
    EXISTS (
      SELECT 1 FROM public.quiz_course_links qcl 
      WHERE qcl.quiz_id = sq.id AND qcl.course_id = get_available_quizzes_for_course.course_id
    ) as is_already_linked,
    sq.created_at
  FROM public.standalone_quizzes sq
  JOIN public.profiles p ON p.id = sq.author_id
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  WHERE 
    sq.status = 'published'
    AND sq.visibility IN ('public', 'restricted')
    AND (author_id IS NULL OR sq.author_id = author_id)
    AND (search_term = '' OR sq.title ILIKE '%' || search_term || '%' OR sq.description ILIKE '%' || search_term || '%')
    AND (difficulty_filter = '' OR sq.difficulty_level = difficulty_filter)
  GROUP BY sq.id, sq.title, sq.description, sq.difficulty_level, 
           sq.estimated_duration_minutes, p.first_name, p.last_name, sq.created_at
  ORDER BY sq.created_at DESC
  LIMIT limit_count;
END;
$$;

-- 9. Create function to bulk link quizzes to course
DROP FUNCTION IF EXISTS public.bulk_link_quizzes_to_course(uuid, uuid[], text, boolean);
CREATE OR REPLACE FUNCTION public.bulk_link_quizzes_to_course(
  course_id uuid,
  quiz_ids uuid[],
  link_type text DEFAULT 'standalone',
  is_required boolean DEFAULT true
)
RETURNS TABLE (
  quiz_id uuid,
  success boolean,
  message text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  quiz_id uuid;
  link_count integer;
BEGIN
  FOREACH quiz_id IN ARRAY quiz_ids
  LOOP
    BEGIN
      -- Check if quiz exists and is published
      IF NOT EXISTS (
        SELECT 1 FROM public.standalone_quizzes 
        WHERE id = quiz_id AND status = 'published'
      ) THEN
        RETURN QUERY SELECT quiz_id, false, 'Quiz not found or not published'::text;
        CONTINUE;
      END IF;
      
      -- Check if already linked
      IF EXISTS (
        SELECT 1 FROM public.quiz_course_links 
        WHERE quiz_id = bulk_link_quizzes_to_course.quiz_id AND course_id = bulk_link_quizzes_to_course.course_id
      ) THEN
        RETURN QUERY SELECT quiz_id, false, 'Quiz already linked to this course'::text;
        CONTINUE;
      END IF;
      
      -- Get next position
      SELECT COALESCE(MAX(position), 0) + 1 INTO link_count
      FROM public.quiz_course_links 
      WHERE course_id = bulk_link_quizzes_to_course.course_id;
      
      -- Insert link
      INSERT INTO public.quiz_course_links (quiz_id, course_id, link_type, position, is_required)
      VALUES (quiz_id, bulk_link_quizzes_to_course.course_id, link_type, link_count, is_required);
      
      RETURN QUERY SELECT quiz_id, true, 'Successfully linked'::text;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT quiz_id, false, 'Error: ' || SQLERRM::text;
    END;
  END LOOP;
END;
$$;

-- 10. Create function to unlink quiz from course
DROP FUNCTION IF EXISTS public.unlink_quiz_from_course(uuid, uuid);
CREATE OR REPLACE FUNCTION public.unlink_quiz_from_course(input_quiz_id uuid, input_course_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.quiz_course_links 
  WHERE quiz_course_links.quiz_id = input_quiz_id 
    AND quiz_course_links.course_id = input_course_id;
  
  RETURN FOUND;
END;
$$;

-- 11. Add comments for documentation
COMMENT ON VIEW public.standalone_quiz_summary IS 'Summary view of standalone quizzes with statistics';
COMMENT ON FUNCTION public.get_quiz_performance_analytics(uuid) IS 'Gets detailed performance analytics for a quiz';
COMMENT ON FUNCTION public.get_question_performance_analytics(uuid) IS 'Gets performance analytics for each question in a quiz';
COMMENT ON FUNCTION public.get_user_quiz_history(uuid, integer) IS 'Gets quiz history for a user';
COMMENT ON FUNCTION public.get_quiz_leaderboard(uuid, integer) IS 'Gets leaderboard for a quiz';
COMMENT ON FUNCTION public.get_user_quiz_completion_status(uuid, uuid) IS 'Gets completion status of a quiz for a user';
COMMENT ON FUNCTION public.get_course_linked_quizzes(uuid) IS 'Gets all quizzes linked to a course';
COMMENT ON FUNCTION public.get_available_quizzes_for_course(uuid, uuid, text, text, integer) IS 'Gets available quizzes that can be linked to a course';
COMMENT ON FUNCTION public.bulk_link_quizzes_to_course(uuid, uuid[], text, boolean) IS 'Bulk links multiple quizzes to a course';
COMMENT ON FUNCTION public.unlink_quiz_from_course(uuid, uuid) IS 'Unlinks a quiz from a course';
