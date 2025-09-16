-- Add function to get all attempts for a specific quiz (for admin/teacher view)
-- This is different from get_user_quiz_attempts which gets attempts for a specific user

CREATE OR REPLACE FUNCTION public.get_quiz_attempts(input_quiz_id uuid)
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_name text,
  user_email text
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
    sqa.created_at,
    sqa.updated_at,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
    COALESCE(p.email, 'No email') as user_email
  FROM public.standalone_quiz_attempts sqa
  LEFT JOIN public.profiles p ON p.id = sqa.user_id
  WHERE sqa.quiz_id = input_quiz_id
  ORDER BY sqa.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_quiz_attempts(uuid) IS 'Gets all attempts for a specific quiz with user information';
