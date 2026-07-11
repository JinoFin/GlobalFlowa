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
