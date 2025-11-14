-- Migration: Fix discussion participants to include super_user access
-- Issue: Existing discussions with 'admin' participants don't include 'super_user'
-- Date: 2025-10-30

-- ============================================
-- 1. Add super_user participants to existing discussions that have admin participants
-- ============================================

-- For all discussions that have 'admin' participants, also add 'super_user' participants
-- This ensures super_users can see existing discussions created with "Admins" selected
INSERT INTO public.discussion_participants (discussion_id, role)
SELECT DISTINCT dp.discussion_id, 'super_user'::public.app_role
FROM public.discussion_participants dp
WHERE dp.role = 'admin'::public.app_role
AND NOT EXISTS (
  -- Don't insert if super_user participant already exists for this discussion
  SELECT 1 FROM public.discussion_participants dp2 
  WHERE dp2.discussion_id = dp.discussion_id 
  AND dp2.role = 'super_user'::public.app_role
);

-- ============================================
-- 2. Update get_discussions_for_user function to handle super_user properly
-- ============================================

-- Update the function to treat super_user same as admin for participant matching
CREATE OR REPLACE FUNCTION "public"."get_discussions_for_user"(
  "p_search_term" "text", 
  "p_course_filter" "text", 
  "p_type_filter" "text", 
  "p_page" integer, 
  "p_rows_per_page" integer
) 
RETURNS TABLE(
  "id" "uuid", 
  "title" "text", 
  "content" "text", 
  "created_at" timestamp with time zone, 
  "creator_id" "uuid", 
  "course_id" "uuid", 
  "creator_first_name" "text", 
  "creator_last_name" "text", 
  "course_title" "text", 
  "discussion_type" "text", 
  "replies_count" bigint, 
  "likes_count" bigint
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.app_role;
    v_offset INT := (p_page - 1) * p_rows_per_page;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE public.profiles.id = v_user_id;

    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.created_at,
        d.creator_id,
        d.course_id,
        p.first_name AS creator_first_name,
        p.last_name AS creator_last_name,
        c.title AS course_title,
        d.type AS discussion_type,
        (SELECT count(*) FROM public.discussion_replies dr WHERE dr.discussion_id = d.id) AS replies_count,
        (SELECT count(*) FROM public.discussion_likes dl WHERE dl.discussion_id = d.id) AS likes_count
    FROM
        public.discussions d
    LEFT JOIN
        public.profiles p ON d.creator_id = p.id
    LEFT JOIN
        public.courses c ON d.course_id = c.id
    WHERE
        (
            -- Allow admins and super_users to see all discussions
            v_user_role IN ('admin'::public.app_role, 'super_user'::public.app_role)
            OR
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = v_user_id
            ))
            OR
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id 
                AND (
                  dp.role = v_user_role 
                  OR 
                  -- Allow super_user to access discussions with admin participants
                  (v_user_role = 'super_user'::public.app_role AND dp.role = 'admin'::public.app_role)
                  OR
                  -- Allow admin to access discussions with super_user participants (future-proof)
                  (v_user_role = 'admin'::public.app_role AND dp.role = 'super_user'::public.app_role)
                )
            ))
        )
        AND
        (
            p_search_term = '' OR p_search_term IS NULL
            OR
            d.title ILIKE '%' || p_search_term || '%'
            OR
            d.content ILIKE '%' || p_search_term || '%'
        )
        AND
        (
            p_course_filter = 'all'
            OR
            (p_course_filter = 'general' AND d.course_id IS NULL)
            OR
            d.course_id::text = p_course_filter
        )
        AND
        (
            p_type_filter = 'all'
            OR
            d.type ILIKE p_type_filter
        )
    ORDER BY
        d.created_at DESC
    LIMIT p_rows_per_page
    OFFSET v_offset;
END;
$$;

-- Update the count function as well
CREATE OR REPLACE FUNCTION "public"."get_discussions_for_user_count"(
  "p_search_term" "text", 
  "p_course_filter" "text", 
  "p_type_filter" "text"
) 
RETURNS integer
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.app_role;
    v_count INT;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE public.profiles.id = v_user_id;

    SELECT COUNT(d.id) INTO v_count
    FROM
        public.discussions d
    LEFT JOIN
        public.profiles p ON d.creator_id = p.id
    LEFT JOIN
        public.courses c ON d.course_id = c.id
    WHERE
        (
            -- Allow admins and super_users to see all discussions
            v_user_role IN ('admin'::public.app_role, 'super_user'::public.app_role)
            OR
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = v_user_id
            ))
            OR
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id 
                AND (
                  dp.role = v_user_role 
                  OR 
                  -- Allow super_user to access discussions with admin participants
                  (v_user_role = 'super_user'::public.app_role AND dp.role = 'admin'::public.app_role)
                  OR
                  -- Allow admin to access discussions with super_user participants (future-proof)
                  (v_user_role = 'admin'::public.app_role AND dp.role = 'super_user'::public.app_role)
                )
            ))
        )
        AND
        (
            p_search_term = '' OR p_search_term IS NULL
            OR
            d.title ILIKE '%' || p_search_term || '%'
            OR
            d.content ILIKE '%' || p_search_term || '%'
        )
        AND
        (
            p_course_filter = 'all'
            OR
            (p_course_filter = 'general' AND d.course_id IS NULL)
            OR
            d.course_id::text = p_course_filter
        )
        AND
        (
            p_type_filter = 'all'
            OR
            d.type ILIKE p_type_filter
        );
    
    RETURN v_count;
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.get_discussions_for_user(text, text, text, integer, integer) IS 
'Get discussions for user with pagination. Updated to handle super_user access to admin discussions.';

COMMENT ON FUNCTION public.get_discussions_for_user_count(text, text, text) IS 
'Get count of discussions for user. Updated to handle super_user access to admin discussions.';

-- Log the changes made
INSERT INTO access_logs (user_email, action, status, metadata) 
VALUES (
  'system', 
  'Migration: Fix Discussion Participants Super User Access',
  'success',
  jsonb_build_object(
    'migration', '20251030000004_fix_discussion_participants_super_user',
    'description', 'Added super_user participants to existing admin discussions and updated functions',
    'timestamp', now()::text
  )
);
