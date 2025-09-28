-- Create integrations table
create table if not exists public.integrations (
  id uuid not null default gen_random_uuid (),
  name text not null,
  type text not null,
  status text not null default 'disabled'::text,
  settings jsonb null default '{}'::jsonb,
  is_configured boolean null default false,
  last_sync timestamp with time zone null,
  version text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint integrations_pkey primary key (id),
  constraint integrations_name_key unique (name),
  constraint integrations_status_check check (
    (
      status = any (
        array['enabled'::text, 'disabled'::text, 'error'::text]
      )
    )
  ),
  constraint integrations_type_check check (
    (
      type = any (
        array[
          'communication'::text,
          'payment'::text,
          'productivity'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes
create index if not exists idx_integrations_name on public.integrations using btree (name) TABLESPACE pg_default;
create index if not exists idx_integrations_status on public.integrations using btree (status) TABLESPACE pg_default;

-- Create trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_integrations_updated_at on integrations;
create trigger update_integrations_updated_at 
  before update on integrations 
  for each row 
  execute function update_updated_at_column();