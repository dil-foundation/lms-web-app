-- Fix ambiguous column reference in get_user_accessible_quizzes function
-- The issue is in the EXISTS subquery where 'id' is ambiguous

DROP FUNCTION IF EXISTS public.get_user_accessible_quizzes(uuid);

CREATE OR REPLACE FUNCTION public.get_user_accessible_quizzes(input_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
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
    sq.status,
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

COMMENT ON FUNCTION public.get_user_accessible_quizzes(uuid) IS 'Gets all quizzes accessible to a user - fixed ambiguous column reference';
