-- Phase 5: internal operations management.
-- Apply this migration manually to the existing live Phase 4 database.
-- Do not run supabase/schema.sql on the live project.

alter table public.service_requests
  add column if not exists due_at timestamptz,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid;

update public.service_requests
set priority = case lower(trim(coalesce(priority, '')))
  when 'low' then 'low'
  when 'high' then 'high'
  when 'urgent' then 'urgent'
  else 'normal'
end;

alter table public.service_requests
  alter column priority set default 'normal',
  alter column priority set not null;

alter table public.service_requests
  drop constraint if exists service_requests_priority_check;

alter table public.service_requests
  add constraint service_requests_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.service_requests
  drop constraint if exists service_requests_assigned_to_fkey;

alter table public.service_requests
  add constraint service_requests_assigned_to_fkey
  foreign key (assigned_to) references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'service_requests_assigned_by_fkey'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_assigned_by_fkey
      foreign key (assigned_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists idx_service_requests_assigned_to on public.service_requests(assigned_to);
create index if not exists idx_service_requests_priority on public.service_requests(priority);
create index if not exists idx_service_requests_due_at on public.service_requests(due_at);
create index if not exists idx_service_requests_status on public.service_requests(status);
drop policy if exists "Admin and team can read staff profiles" on public.profiles;
create policy "Admin and team can read staff profiles"
on public.profiles for select
to authenticated
using (public.is_admin_or_team() and role in ('admin', 'team'));

create table if not exists public.internal_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_internal_tasks_request_id on public.internal_tasks(request_id);
create index if not exists idx_internal_tasks_assigned_to on public.internal_tasks(assigned_to);
create index if not exists idx_internal_tasks_status on public.internal_tasks(status);
create index if not exists idx_internal_tasks_due_at on public.internal_tasks(due_at);

alter table public.internal_tasks enable row level security;

revoke all on public.internal_tasks from anon, authenticated;
grant select, insert, update, delete on public.internal_tasks to authenticated;

drop policy if exists "Admins can manage internal tasks" on public.internal_tasks;
create policy "Admins can manage internal tasks"
on public.internal_tasks for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());
