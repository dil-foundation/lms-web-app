-- Migration: Add avatar support to get_students_for_teacher functions
-- Description: Updates all three overloads of get_students_for_teacher to include avatar_url in their return types and queries

-- Drop existing functions first (required when changing return types)
DROP FUNCTION IF EXISTS get_students_for_teacher(uuid);
DROP FUNCTION IF EXISTS get_students_for_teacher(uuid, text, text, text);
DROP FUNCTION IF EXISTS get_students_for_teacher(uuid, integer, integer, text, text, text);

-- Create the first function overload (basic version)
CREATE FUNCTION get_students_for_teacher(p_teacher_id uuid)
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    email text,
    avatar_url text,
    email_confirmed_at timestamp with time zone,
    enrolled_at timestamp with time zone,
    course_id uuid,
    course_title text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
begin
  -- First, validate that the calling user is the teacher themselves or an admin
  if not (
    auth.uid() = p_teacher_id or
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  return query
  select
      u.id as id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      u.email_confirmed_at,
      cm.created_at as enrolled_at,
      c.id as course_id,
      c.title as course_title
  from
      public.course_members as teacher_cm
  join
      public.course_members as cm on teacher_cm.course_id = cm.course_id
  join
      auth.users as u on cm.user_id = u.id
  left join
      public.profiles as p on cm.user_id = p.id
  left join
      public.courses as c on cm.course_id = c.id
  where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student';
end;
$$;

-- Create the second function overload (with search and filters)
CREATE FUNCTION get_students_for_teacher(
    p_teacher_id uuid,
    p_search_term text,
    p_course_filter text,
    p_status_filter text
)
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    email text,
    avatar_url text,
    enrolled_at timestamp with time zone,
    last_active timestamp with time zone,
    status text,
    course_id uuid,
    course_title text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
begin
  -- First, validate that the calling user is the teacher themselves or an admin
  if not (
    auth.uid() = p_teacher_id or
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  return query
  with student_base as (
    select
      u.id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      cm.created_at as enrolled_at,
      u.last_sign_in_at as last_active,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      c.id as course_id,
      c.title as course_title,
      row_number() over(partition by u.id order by cm.created_at desc) as rn
    from
      public.course_members as teacher_cm
    join public.course_members as cm on teacher_cm.course_id = cm.course_id
    join auth.users as u on cm.user_id = u.id
    left join public.profiles as p on cm.user_id = p.id
    left join public.courses as c on cm.course_id = c.id
    where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student'
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
    student_base.course_title
  from student_base
  where
      (p_course_filter <> 'all' or student_base.rn = 1)
      and (
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
end;
$$;

-- Create the third function overload (with pagination)
CREATE FUNCTION get_students_for_teacher(
    p_teacher_id uuid,
    p_page integer,
    p_rows_per_page integer,
    p_search_term text,
    p_course_filter text,
    p_status_filter text
)
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    email text,
    avatar_url text,
    enrolled_at timestamp with time zone,
    last_active timestamp with time zone,
    status text,
    course_id uuid,
    course_title text,
    grade text
) 
LANGUAGE plpgsql
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
    select
      u.id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      cm.created_at as enrolled_at,
      u.last_sign_in_at as last_active,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      c.id as course_id,
      c.title as course_title,
      p.grade,
      row_number() over(partition by u.id order by cm.created_at desc) as rn
    from
      public.course_members as teacher_cm
    join public.course_members as cm on teacher_cm.course_id = cm.course_id
    join auth.users as u on cm.user_id = u.id
    left join public.profiles as p on cm.user_id = p.id
    left join public.courses as c on cm.course_id = c.id
    where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student'
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
      (p_course_filter <> 'all' or student_base.rn = 1)
      and (
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
  order by student_base.enrolled_at desc
  limit p_rows_per_page
  offset (p_page - 1) * p_rows_per_page;
end;
$$;
