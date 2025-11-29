-- Update discussion functions to support specific user participants

-- Update get_discussions_for_user function to check for specific users
CREATE OR REPLACE FUNCTION public.get_discussions_for_user(
    p_search_term text,
    p_course_filter text,
    p_type_filter text,
    p_page integer,
    p_rows_per_page integer
)
RETURNS TABLE(
    id uuid,
    title text,
    content text,
    created_at timestamp with time zone,
    creator_id uuid,
    course_id uuid,
    creator_first_name text,
    creator_last_name text,
    course_title text,
    discussion_type text,
    replies_count bigint,
    likes_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_user_role public.app_role;
    v_offset int := (p_page - 1) * p_rows_per_page;
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
            -- Admin/super_user can see all discussions
            v_user_role IN ('admin', 'super_user')
            OR
            -- Course-specific discussions: user must be a course member
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = v_user_id
            ))
            OR
            -- General discussions: check participants table
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id
                AND (
                    -- Role-based access (user_id is NULL means all users of that role)
                    (dp.user_id IS NULL AND (
                        dp.role = v_user_role
                        OR (v_user_role = 'super_user' AND dp.role = 'admin')
                        OR (v_user_role = 'admin' AND dp.role = 'super_user')
                    ))
                    OR
                    -- Specific user access
                    dp.user_id = v_user_id
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
    ORDER BY d.created_at DESC
    LIMIT p_rows_per_page
    OFFSET v_offset;
END;
$$;

-- Update get_discussions_for_user_count function
CREATE OR REPLACE FUNCTION public.get_discussions_for_user_count(
    p_search_term text,
    p_course_filter text,
    p_type_filter text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_user_role public.app_role;
    v_count int;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE public.profiles.id = v_user_id;

    SELECT COUNT(d.id) INTO v_count
    FROM
        public.discussions d
    WHERE
        (
            -- Admin/super_user can see all discussions
            v_user_role IN ('admin', 'super_user')
            OR
            -- Course-specific discussions: user must be a course member
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = v_user_id
            ))
            OR
            -- General discussions: check participants table
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id
                AND (
                    -- Role-based access (user_id is NULL means all users of that role)
                    (dp.user_id IS NULL AND (
                        dp.role = v_user_role
                        OR (v_user_role = 'super_user' AND dp.role = 'admin')
                        OR (v_user_role = 'admin' AND dp.role = 'super_user')
                    ))
                    OR
                    -- Specific user access
                    dp.user_id = v_user_id
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
