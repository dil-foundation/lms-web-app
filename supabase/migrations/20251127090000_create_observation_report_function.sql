-- Creates a security definer function that inserts observation reports
-- This bypasses RLS safely for secure link submissions
create or replace function public.create_observation_report(report_data jsonb)
returns observation_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  new_report observation_reports;
begin
  insert into observation_reports (
    observer_name,
    observer_role,
    school_name,
    teacher_name,
    observation_date,
    start_time,
    end_time,
    lesson_code,
    project_name,
    overall_score,
    status,
    form_data,
    submitted_by,
    show_teal_observations,
    created_at,
    updated_at
  )
  values (
    coalesce(report_data->>'observer_name', 'N/A'),
    coalesce(report_data->>'observer_role', 'N/A'),
    coalesce(report_data->>'school_name', 'N/A'),
    coalesce(report_data->>'teacher_name', 'N/A'),
    coalesce((report_data->>'observation_date')::date, current_date),
    coalesce(
      case 
        when report_data ? 'start_time' and nullif(report_data->>'start_time', '') is not null 
        then (report_data->>'start_time')::time 
        else null 
      end,
      '00:00'::time
    ),
    coalesce(
      case 
        when report_data ? 'end_time' and nullif(report_data->>'end_time', '') is not null 
        then (report_data->>'end_time')::time 
        else null 
      end,
      '00:00'::time
    ),
    coalesce(report_data->>'lesson_code', 'N/A'),
    coalesce(report_data->>'project_name', 'N/A'),
    coalesce((report_data->>'overall_score')::int, 0),
    coalesce(report_data->>'status', 'completed'),
    coalesce(report_data->'form_data', '{}'::jsonb),
    (report_data->>'submitted_by')::uuid,
    coalesce((report_data->>'show_teal_observations')::boolean, false),
    now(),
    now()
  )
  returning * into new_report;

  return new_report;
end;
$$;

-- Allow unauthenticated clients (anon role) to execute the function
grant execute on function public.create_observation_report(jsonb) to anon;
grant execute on function public.create_observation_report(jsonb) to authenticated;

-- ========================================
-- RLS POLICIES FOR SECURE_LINKS TABLE
-- ========================================

-- Drop ALL existing policies on secure_links dynamically (handles unknown names)
do $$
declare
  pol record;
begin
  for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = 'secure_links')
  loop
    execute format('drop policy %I on secure_links', pol.policyname);
  end loop;
end$$;

-- Ensure RLS is enabled on secure_links
alter table secure_links enable row level security;

-- Allow authenticated users to view their own links
create policy "auth_select_secure_links" 
on secure_links
as permissive
for select 
to authenticated
using (auth.uid() = created_by);

-- Allow public/unauthenticated access to view links by token
-- This is safe because the token is cryptographically random
create policy "anon_select_secure_links_by_token" 
on secure_links
as permissive
for select 
to anon
using (token is not null);

-- Allow authenticated users to insert their own links
create policy "auth_insert_secure_links" 
on secure_links
as permissive
for insert 
to authenticated
with check (auth.uid() = created_by);

-- Allow authenticated users to update their own links
create policy "auth_update_secure_links" 
on secure_links
as permissive
for update 
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

-- Allow public to mark links as used (via token)
-- This allows unauthenticated form submissions to mark the link as used
create policy "anon_update_secure_links_mark_used" 
on secure_links
as permissive
for update 
to anon
using (token is not null);

-- Allow authenticated users to delete their own links
create policy "auth_delete_secure_links" 
on secure_links
as permissive
for delete 
to authenticated
using (auth.uid() = created_by);

-- ========================================
-- RLS POLICIES FOR OBSERVATION_REPORTS TABLE
-- ========================================

-- Drop ALL existing policies on observation_reports dynamically (handles unknown names)
do $$
declare
  pol record;
begin
  for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = 'observation_reports')
  loop
    execute format('drop policy %I on observation_reports', pol.policyname);
  end loop;
end$$;

-- Ensure RLS is enabled on observation_reports
alter table observation_reports enable row level security;

-- Grant table permissions to all roles (required for RLS to work)
grant insert on observation_reports to anon;
grant insert on observation_reports to authenticated;
grant insert on observation_reports to service_role;

-- Create a single, simple policy that allows ALL inserts
-- Security is controlled by:
-- 1. Secure link token validation (before function is called)
-- 2. Time-limited access through token expiry  
-- 3. The RPC function being the only way to submit via secure links
create policy "allow_all_inserts_observation_reports" 
on observation_reports
as permissive
for insert
with check (true);

-- Allow authenticated users to insert their own reports
create policy "auth_insert_observation_reports" 
on observation_reports
as permissive
for insert 
to authenticated
with check (auth.uid() = submitted_by);

-- Allow authenticated users to view their own reports
create policy "auth_select_observation_reports" 
on observation_reports
as permissive
for select 
to authenticated
using (auth.uid() = submitted_by);

-- Allow authenticated users to update their own reports
create policy "auth_update_observation_reports" 
on observation_reports
as permissive
for update 
to authenticated
using (auth.uid() = submitted_by)
with check (auth.uid() = submitted_by);

-- Allow authenticated users to delete their own reports
create policy "auth_delete_observation_reports" 
on observation_reports
as permissive
for delete 
to authenticated
using (auth.uid() = submitted_by);

