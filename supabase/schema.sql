create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'team')),
  email text
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  category text not null,
  short_description text not null,
  who_needs_it text not null,
  required_information jsonb not null default '[]',
  required_documents jsonb not null default '[]',
  process_steps jsonb not null default '[]',
  display_order int not null default 0,
  active boolean not null default true
);

create table if not exists public.service_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  service_slug text not null references public.services(slug) on delete cascade,
  question_key text not null,
  label text not null,
  question_type text not null check (question_type in ('text', 'textarea', 'select', 'multiselect', 'number', 'date', 'yes_no', 'file', 'email', 'phone')),
  options jsonb not null default '[]',
  conditional_logic jsonb not null default '{}',
  required boolean not null default false,
  display_order int not null default 0,
  help_text text,
  unique (service_slug, question_key)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'New' check (status in ('New', 'In Review', 'Missing Documents', 'Waiting for Customer', 'Submitted to Authority', 'In Progress', 'Completed', 'Cancelled')),
  priority text,
  company_name text not null,
  contact_person text not null,
  email text not null,
  phone text,
  whatsapp text,
  wechat text,
  country text not null,
  preferred_language text,
  main_service text,
  urgency text,
  deadline date,
  message text,
  source text default 'website',
  assigned_to uuid references public.profiles(id),
  internal_notes text
);

create table if not exists public.request_services (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  service_slug text not null,
  service_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.request_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  scope text not null check (scope in ('customer', 'product', 'service', 'checker')),
  service_slug text,
  question_key text not null,
  answer jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  field_key text not null,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_country text,
  recommended_services jsonb not null default '[]',
  converted_request_id uuid references public.service_requests(id)
);

create table if not exists public.recommendation_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.recommendation_sessions(id) on delete cascade,
  question_key text not null,
  answer jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  author_id uuid references public.profiles(id),
  note text not null,
  missing_documents jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.request_activity_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  actor_type text not null default 'system',
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_urgency on public.service_requests(urgency);
create index if not exists idx_service_requests_country on public.service_requests(country);
create index if not exists idx_request_services_request_id on public.request_services(request_id);
create index if not exists idx_request_answers_request_id on public.request_answers(request_id);
create index if not exists idx_request_files_request_id on public.request_files(request_id);

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_questions enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_services enable row level security;
alter table public.request_answers enable row level security;
alter table public.request_files enable row level security;
alter table public.recommendation_sessions enable row level security;
alter table public.recommendation_answers enable row level security;
alter table public.admin_notes enable row level security;
alter table public.request_activity_log enable row level security;

grant select on public.services to anon, authenticated;
grant select on public.service_questions to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.service_requests to authenticated;
grant select, insert, update, delete on public.request_services to authenticated;
grant select, insert, update, delete on public.request_answers to authenticated;
grant select, insert, update, delete on public.request_files to authenticated;
grant select, insert, update, delete on public.recommendation_sessions to authenticated;
grant select, insert, update, delete on public.recommendation_answers to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
grant select, insert, update, delete on public.request_activity_log to authenticated;

create policy "Public can read active services"
on public.services for select
to anon, authenticated
using (active = true);

create policy "Public can read active service questions"
on public.service_questions for select
to anon, authenticated
using (
  exists (
    select 1 from public.services
    where services.slug = service_questions.service_slug
    and services.active = true
  )
);

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using ((select auth.uid()) = id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check ((select auth.uid()) = id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Admins can manage service catalog"
on public.services for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Admins can manage service questions"
on public.service_questions for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Admins can manage requests"
on public.service_requests for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage request services"
on public.request_services for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage request answers"
on public.request_answers for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage request files"
on public.request_files for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage recommendation sessions"
on public.recommendation_sessions for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage recommendation answers"
on public.recommendation_answers for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage notes"
on public.admin_notes for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

create policy "Admins can manage activity"
on public.request_activity_log for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team')));

insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', false)
on conflict (id) do nothing;

create policy "Admins can read request documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-documents'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'team'))
);
