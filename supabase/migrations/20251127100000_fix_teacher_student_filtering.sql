-- Fix get_students_for_teacher function to fetch students from classes, not just courses
-- This ensures teachers see ALL students from their assigned classes, regardless of course enrollment

CREATE OR REPLACE FUNCTION "public"."get_students_for_teacher"(
  "p_teacher_id" "uuid", 
  "p_page" integer, 
  "p_rows_per_page" integer, 
  "p_search_term" "text", 
  "p_course_filter" "text", 
  "p_status_filter" "text"
) 
RETURNS TABLE(
  "id" "uuid", 
  "first_name" "text", 
  "last_name" "text", 
  "email" "text", 
  "avatar_url" "text", 
  "enrolled_at" timestamp with time zone, 
  "last_active" timestamp with time zone, 
  "status" "text", 
  "course_id" "uuid", 
  "course_title" "text", 
  "grade" "text"
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
begin
  -- Validate that the calling user is the teacher themselves or an admin
  if not (
    auth.uid() = p_teacher_id or
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  return query
  with student_base as (
    -- Get students from classes that the teacher teaches
    select distinct
      p.id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      cs.created_at as enrolled_at,
      u.last_sign_in_at as last_active,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      -- Get the most recent course they're enrolled in (if any)
      (
        select cm.course_id 
        from public.course_members cm 
        where cm.user_id = p.id 
        and cm.role = 'student'
        order by cm.created_at desc 
        limit 1
      ) as course_id,
      (
        select c.title 
        from public.course_members cm 
        join public.courses c on cm.course_id = c.id
        where cm.user_id = p.id 
        and cm.role = 'student'
        order by cm.created_at desc 
        limit 1
      ) as course_title,
      p.grade,
      -- Use class enrollment date for ordering
      cs.created_at as class_enrolled_at
    from
      public.class_teachers ct
    join public.class_students cs on ct.class_id = cs.class_id
    join public.profiles p on cs.student_id = p.id
    join auth.users u on p.id = u.id
    where
      ct.teacher_id = p_teacher_id
      and p.role = 'student'
  )
  select
    student_base.id,
    student_base.first_name,
    student_base.last_name,
    student_base.email,
    student_base.avatar_url,
    student_base.enrolled_at,
    student_base.last_active,
    student_base.status,
    student_base.course_id,
    student_base.course_title,
    student_base.grade
  from student_base
  where
      (
          p_search_term = '' or
          concat_ws(' ', student_base.first_name, student_base.last_name) ilike '%' || p_search_term || '%' or
          student_base.email ilike '%' || p_search_term || '%'
      )
      and (
          p_course_filter = 'all' or
          student_base.course_title = p_course_filter
      )
      and (
          p_status_filter = 'all' or
          student_base.status = p_status_filter
      )
  order by student_base.class_enrolled_at desc
  limit p_rows_per_page
  offset (p_page - 1) * p_rows_per_page;
end;
$$;

-- Fix get_students_for_teacher_count function to count students from classes
CREATE OR REPLACE FUNCTION "public"."get_students_for_teacher_count"(
  "p_teacher_id" "uuid", 
  "p_search_term" "text" DEFAULT ''::"text", 
  "p_course_filter" "text" DEFAULT 'all'::"text", 
  "p_status_filter" "text" DEFAULT 'all'::"text"
) 
RETURNS integer
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
declare
  total_rows int;
begin
  -- Validate user
  if not (
    auth.uid() = p_teacher_id or 
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  with student_base as (
    -- Get students from classes that the teacher teaches
    select distinct
      p.id,
      p.first_name,
      p.last_name,
      u.email::text as email,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      -- Get the most recent course title they're enrolled in (if any)
      (
        select c.title 
        from public.course_members cm 
        join public.courses c on cm.course_id = c.id
        where cm.user_id = p.id 
        and cm.role = 'student'
        order by cm.created_at desc 
        limit 1
      ) as course_title
    from
      public.class_teachers ct
    join public.class_students cs on ct.class_id = cs.class_id
    join public.profiles p on cs.student_id = p.id
    join auth.users u on p.id = u.id
    where
      ct.teacher_id = p_teacher_id
      and p.role = 'student'
  )
  select count(distinct id)
  into total_rows
  from student_base
  where
      (
          p_search_term = '' or
          concat_ws(' ', student_base.first_name, student_base.last_name) ilike '%' || p_search_term || '%' or
          student_base.email ilike '%' || p_search_term || '%'
      )
      and (
          p_course_filter = 'all' or
          student_base.course_title = p_course_filter
      )
      and (
          p_status_filter = 'all' or
          student_base.status = p_status_filter
      );

  return total_rows;
end;
$$;

-- Fix get_students_data function to fetch students from classes with course progress data
CREATE OR REPLACE FUNCTION "public"."get_students_data"(
  "p_teacher_id" "uuid", 
  "search_term" "text", 
  "course_filter" "text", 
  "status_filter" "text", 
  "sort_by" "text", 
  "sort_order" "text", 
  "page_number" integer, 
  "page_size" integer
) 
RETURNS TABLE(
  "student_id" "uuid", 
  "student_name" "text", 
  "student_email" "text", 
  "student_avatar" "text", 
  "avatar_url" "text", 
  "enrolled_date" timestamp with time zone, 
  "course_title" "text", 
  "progress_percentage" integer, 
  "status" "text", 
  "last_active" "text", 
  "total_count" bigint
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH teacher_students AS (
        -- Get all students from classes the teacher teaches
        SELECT DISTINCT
            p.id as user_id,
            p.first_name,
            p.last_name,
            p.email,
            p.avatar_url,
            cs.created_at AS class_enrolled_date
        FROM public.class_teachers ct
        JOIN public.class_students cs ON ct.class_id = cs.class_id
        JOIN public.profiles p ON cs.student_id = p.id
        WHERE ct.teacher_id = p_teacher_id
          AND p.role = 'student'
    ),
    student_enrollments AS (
        -- Get course enrollments for those students
        SELECT
            ts.user_id,
            cm.course_id,
            ts.first_name,
            ts.last_name,
            ts.email,
            ts.avatar_url,
            COALESCE(cm.created_at, ts.class_enrolled_date) AS enrolled_date,
            COALESCE(c.title, 'Not Enrolled') AS course_title
        FROM teacher_students ts
        LEFT JOIN public.course_members cm ON ts.user_id = cm.user_id AND cm.role = 'student'
        LEFT JOIN public.courses c ON cm.course_id = c.id AND c.status = 'Published'
    ),
    student_progress AS (
        SELECT
            ucip.user_id,
            ucip.course_id,
            COUNT(DISTINCT CASE WHEN lower(ucip.status) = 'completed' THEN ucip.lesson_content_id END) AS completed_items,
            COUNT(DISTINCT ucip.lesson_content_id) AS progressed_items,
            MAX(ucip.updated_at) AS last_activity
        FROM public.user_content_item_progress ucip
        GROUP BY ucip.user_id, ucip.course_id
    ),
    course_totals AS (
        SELECT
            c.id AS course_id,
            COUNT(clc.id) AS total_items
        FROM public.courses c
        JOIN public.course_sections cs ON c.id = cs.course_id
        JOIN public.course_lessons cl ON cs.id = cl.section_id
        JOIN public.course_lesson_content clc ON cl.id = clc.lesson_id
        GROUP BY c.id
    ),
    final_data AS (
        SELECT DISTINCT ON (se.user_id, se.course_id)
            se.user_id AS student_id,
            (se.first_name || ' ' || se.last_name) AS student_name,
            se.email AS student_email,
            (SUBSTRING(se.first_name, 1, 1) || SUBSTRING(se.last_name, 1, 1)) AS student_avatar,
            se.avatar_url,
            se.enrolled_date,
            se.course_title,
            CASE
                WHEN se.course_id IS NULL THEN 0
                WHEN COALESCE(ct.total_items, 0) > 0 THEN
                    (COALESCE(sp.completed_items, 0) * 100.0 / ct.total_items)::integer
                ELSE 0
            END AS progress_percentage,
            CASE
                WHEN se.course_id IS NULL THEN 'Not Enrolled'
                WHEN COALESCE(ct.total_items, 0) > 0 AND (COALESCE(sp.completed_items, 0) * 100.0 / ct.total_items)::integer >= 100 THEN 'Completed'
                WHEN COALESCE(sp.progressed_items, 0) > 0 THEN 'In Progress'
                ELSE 'Not Started'
            END AS status,
            to_char(sp.last_activity, 'YYYY-MM-DD') AS last_active
        FROM student_enrollments se
        LEFT JOIN student_progress sp ON se.user_id = sp.user_id AND se.course_id = sp.course_id
        LEFT JOIN course_totals ct ON se.course_id = ct.course_id
        WHERE (search_term = '' OR (se.first_name || ' ' || se.last_name) ILIKE '%' || search_term || '%' OR se.email ILIKE '%' || search_term || '%')
          AND (course_filter = '' OR se.course_id::text = course_filter OR (course_filter <> '' AND se.course_id IS NULL))
    ),
    filtered_data AS (
        SELECT *
        FROM final_data
        WHERE (status_filter = '' OR final_data.status = status_filter)
    )
    SELECT
        fd.student_id,
        fd.student_name,
        fd.student_email,
        fd.student_avatar,
        fd.avatar_url,
        fd.enrolled_date,
        fd.course_title,
        fd.progress_percentage,
        fd.status,
        fd.last_active,
        (SELECT COUNT(*) FROM filtered_data) AS total_count
    FROM filtered_data fd
    ORDER BY
        CASE WHEN sort_by = 'name' AND sort_order = 'asc' THEN fd.student_name END ASC,
        CASE WHEN sort_by = 'name' AND sort_order = 'desc' THEN fd.student_name END DESC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'asc' THEN fd.progress_percentage END ASC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'desc' THEN fd.progress_percentage END DESC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'asc' THEN fd.enrolled_date END ASC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'desc' THEN fd.enrolled_date END DESC
    LIMIT page_size
    OFFSET (page_number - 1) * page_size;
END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) TO "service_role";

