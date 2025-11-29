-- Add user role to discussion replies function
-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_discussion_replies(uuid);

CREATE OR REPLACE FUNCTION public.get_discussion_replies(p_discussion_id uuid)
RETURNS TABLE(
    id uuid,
    created_at timestamp with time zone,
    content text,
    user_id uuid,
    user_first_name text,
    user_last_name text,
    user_role text,
    likes_count bigint,
    is_liked_by_user boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.id,
        dr.created_at,
        dr.content,
        dr.user_id,
        p.first_name AS user_first_name,
        p.last_name AS user_last_name,
        p.role::text AS user_role,
        (SELECT COUNT(*) FROM public.discussion_likes dl WHERE dl.reply_id = dr.id) AS likes_count,
        EXISTS(SELECT 1 FROM public.discussion_likes dl WHERE dl.reply_id = dr.id AND dl.user_id = auth.uid()) AS is_liked_by_user
    FROM public.discussion_replies dr
    JOIN public.profiles p ON dr.user_id = p.id
    WHERE dr.discussion_id = p_discussion_id
    ORDER BY dr.created_at ASC;
END;
$$;
