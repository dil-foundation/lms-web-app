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

