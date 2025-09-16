-- Fix get_user_accessible_quizzes function to return all quiz fields
-- This should fix the missing passing_score and other fields in quiz cards

DROP FUNCTION IF EXISTS public.get_user_accessible_quizzes(uuid);

CREATE OR REPLACE FUNCTION public.get_user_accessible_quizzes(input_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  instructions text,
  time_limit_minutes integer,
  max_attempts integer,
  passing_score numeric(5,2),
  shuffle_questions boolean,
  shuffle_options boolean,
  show_correct_answers boolean,
  show_results_immediately boolean,
  allow_retake boolean,
  retry_settings jsonb,
  status text,
  visibility text,
  tags text[],
  difficulty_level text,
  estimated_duration_minutes integer,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  role text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.instructions,
    sq.time_limit_minutes,
    sq.max_attempts,
    sq.passing_score,
    sq.shuffle_questions,
    sq.shuffle_options,
    sq.show_correct_answers,
    sq.show_results_immediately,
    sq.allow_retake,
    sq.retry_settings,
    sq.status,
    sq.visibility,
    sq.tags,
    sq.difficulty_level,
    sq.estimated_duration_minutes,
    sq.author_id,
    sq.created_at,
    sq.updated_at,
    sq.published_at,
    COALESCE(qm.role, 'author'::text) as role
  FROM public.standalone_quizzes sq
  LEFT JOIN public.quiz_members qm ON qm.quiz_id = sq.id AND qm.user_id = input_user_id
  WHERE 
    -- User is the author
    sq.author_id = input_user_id
    OR
    -- User is a member of the quiz
    qm.user_id IS NOT NULL
    OR
    -- User is admin or teacher (can see all published quizzes)
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = input_user_id AND p.role IN ('admin', 'teacher')
    )
  ORDER BY sq.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_user_accessible_quizzes(uuid) IS 'Gets all quizzes accessible to a user with complete quiz data';
