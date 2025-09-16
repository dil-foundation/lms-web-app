-- Fix get_user_accessible_quizzes function to handle edge cases
-- This should resolve the PGRST116 error

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

-- Also fix get_user_quiz_attempts function to handle edge cases
DROP FUNCTION IF EXISTS public.get_user_quiz_attempts(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_user_quiz_attempts(input_user_id uuid, input_quiz_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  user_id uuid,
  attempt_number integer,
  answers jsonb,
  results jsonb,
  score numeric(5,2),
  time_taken_minutes integer,
  submitted_at timestamp with time zone,
  retry_reason text,
  teacher_approval_required boolean,
  teacher_approved boolean,
  teacher_approved_by uuid,
  teacher_approved_at timestamp with time zone,
  teacher_approval_notes text,
  study_materials_completed boolean,
  study_materials_completed_at timestamp with time zone,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  started_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id,
    sqa.quiz_id,
    sqa.user_id,
    sqa.attempt_number,
    sqa.answers,
    sqa.results,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    sqa.retry_reason,
    sqa.teacher_approval_required,
    sqa.teacher_approved,
    sqa.teacher_approved_by,
    sqa.teacher_approved_at,
    sqa.teacher_approval_notes,
    sqa.study_materials_completed,
    sqa.study_materials_completed_at,
    sqa.ip_address,
    sqa.user_agent,
    sqa.created_at,
    sqa.updated_at,
    sqa.created_at as started_at
  FROM public.standalone_quiz_attempts sqa
  WHERE 
    sqa.user_id = input_user_id
    AND (input_quiz_id IS NULL OR sqa.quiz_id = input_quiz_id)
  ORDER BY sqa.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_user_accessible_quizzes(uuid) IS 'Gets all quizzes accessible to a user - fixed to handle edge cases';
COMMENT ON FUNCTION public.get_user_quiz_attempts(uuid, uuid) IS 'Gets user quiz attempts - fixed to handle edge cases';
