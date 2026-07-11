create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'team', 'customer')),
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
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
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
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  assigned_at timestamptz,
  assigned_by uuid references public.profiles(id) on delete set null,
  internal_notes text,
  customer_user_id uuid references auth.users(id),
  customer_email text,
  customer_access_enabled boolean not null default true
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
  file_size bigint,
  file_type text,
  storage_bucket text not null,
  storage_path text not null,
  uploaded_by_user_id uuid references auth.users(id),
  uploaded_by_role text not null default 'customer' check (uploaded_by_role in ('customer', 'admin', 'system')),
  linked_checklist_item_id uuid,
  customer_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  service_slug text not null references public.services(slug) on delete cascade,
  title text not null,
  description text not null,
  document_key text not null,
  category text not null check (category in ('Company Documents', 'Product Documents', 'Compliance Documents', 'Marketplace Documents', 'Warehouse Documents', 'Tax / VAT Documents', 'Other')),
  required_by_default boolean not null default true,
  conditional_rule jsonb,
  accepted_file_types text[],
  example_description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (service_slug, document_key)
);

create table if not exists public.request_document_checklist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  document_template_id uuid references public.document_templates(id) on delete set null,
  document_key text not null,
  title text not null,
  description text not null,
  category text not null check (category in ('Company Documents', 'Product Documents', 'Compliance Documents', 'Marketplace Documents', 'Warehouse Documents', 'Tax / VAT Documents', 'Other')),
  status text not null default 'required' check (status in ('required', 'uploaded', 'under_review', 'accepted', 'missing', 'incorrect', 'expired', 'not_applicable')),
  admin_note text,
  customer_note text,
  linked_file_id uuid references public.request_files(id) on delete set null,
  required boolean not null default true,
  sort_order int not null default 0,
  customer_visible boolean not null default true,
  admin_note_customer_visible boolean not null default false,
  unique (request_id, document_key)
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
  customer_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  author_id uuid references public.profiles(id),
  subject text not null,
  message text not null,
  checklist_item_ids uuid[] not null default '{}',
  sent_to_email text not null,
  sent_at timestamptz,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  customer_visible boolean not null default true
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

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'team', 'customer'));
alter table public.profiles alter column role set default 'customer';

alter table public.service_requests add column if not exists customer_user_id uuid references auth.users(id);
alter table public.service_requests add column if not exists customer_email text;
alter table public.service_requests add column if not exists customer_access_enabled boolean not null default true;
alter table public.service_requests add column if not exists due_at timestamptz;
alter table public.service_requests add column if not exists assigned_at timestamptz;
alter table public.service_requests add column if not exists assigned_by uuid;
update public.service_requests set customer_email = email where customer_email is null;
update public.service_requests
set priority = case lower(trim(coalesce(priority, '')))
  when 'low' then 'low'
  when 'high' then 'high'
  when 'urgent' then 'urgent'
  else 'normal'
end;
alter table public.service_requests alter column priority set default 'normal';
alter table public.service_requests alter column priority set not null;
alter table public.service_requests drop constraint if exists service_requests_priority_check;
alter table public.service_requests add constraint service_requests_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));
alter table public.service_requests drop constraint if exists service_requests_assigned_to_fkey;
alter table public.service_requests add constraint service_requests_assigned_to_fkey foreign key (assigned_to) references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'service_requests_assigned_by_fkey'
    and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_assigned_by_fkey
      foreign key (assigned_by) references public.profiles(id)
      on delete set null;
  end if;
end $$;

alter table public.request_files add column if not exists uploaded_by_user_id uuid references auth.users(id);
alter table public.request_files add column if not exists uploaded_by_role text not null default 'customer';
alter table public.request_files add column if not exists linked_checklist_item_id uuid;
alter table public.request_files add column if not exists customer_note text;
alter table public.request_files add column if not exists file_size bigint;
alter table public.request_files add column if not exists file_type text;
alter table public.request_files drop constraint if exists request_files_uploaded_by_role_check;
alter table public.request_files add constraint request_files_uploaded_by_role_check check (uploaded_by_role in ('customer', 'admin', 'system'));

alter table public.request_document_checklist add column if not exists customer_visible boolean not null default true;
alter table public.request_document_checklist add column if not exists admin_note_customer_visible boolean not null default false;

alter table public.admin_notes add column if not exists customer_visible boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'request_files_linked_checklist_item_id_fkey'
    and conrelid = 'public.request_files'::regclass
  ) then
    alter table public.request_files
      add constraint request_files_linked_checklist_item_id_fkey
      foreign key (linked_checklist_item_id)
      references public.request_document_checklist(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_urgency on public.service_requests(urgency);
create index if not exists idx_service_requests_country on public.service_requests(country);
create index if not exists idx_service_requests_customer_user_id on public.service_requests(customer_user_id);
create index if not exists idx_service_requests_customer_email on public.service_requests ((lower(coalesce(customer_email, email))));
create index if not exists idx_service_requests_assigned_to on public.service_requests(assigned_to);
create index if not exists idx_service_requests_priority on public.service_requests(priority);
create index if not exists idx_service_requests_due_at on public.service_requests(due_at);
create index if not exists idx_request_services_request_id on public.request_services(request_id);
create index if not exists idx_request_answers_request_id on public.request_answers(request_id);
create index if not exists idx_request_files_request_id on public.request_files(request_id);
create index if not exists idx_request_files_linked_checklist_item_id on public.request_files(linked_checklist_item_id);
create index if not exists idx_document_templates_service_slug on public.document_templates(service_slug);
create index if not exists idx_request_document_checklist_request_id on public.request_document_checklist(request_id);
create index if not exists idx_request_document_checklist_status on public.request_document_checklist(status);
create index if not exists idx_customer_messages_request_id on public.customer_messages(request_id);
create index if not exists idx_customer_messages_sent_to_email on public.customer_messages(sent_to_email);
create index if not exists idx_customer_messages_created_at on public.customer_messages(created_at);
create index if not exists idx_internal_tasks_request_id on public.internal_tasks(request_id);
create index if not exists idx_internal_tasks_assigned_to on public.internal_tasks(assigned_to);
create index if not exists idx_internal_tasks_status on public.internal_tasks(status);
create index if not exists idx_internal_tasks_due_at on public.internal_tasks(due_at);

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_questions enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_services enable row level security;
alter table public.request_answers enable row level security;
alter table public.request_files enable row level security;
alter table public.document_templates enable row level security;
alter table public.request_document_checklist enable row level security;
alter table public.recommendation_sessions enable row level security;
alter table public.recommendation_answers enable row level security;
alter table public.admin_notes enable row level security;
alter table public.customer_messages enable row level security;
alter table public.request_activity_log enable row level security;
alter table public.internal_tasks enable row level security;

grant select on public.services to anon, authenticated;
grant select on public.service_questions to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.service_requests to authenticated;
grant select, insert, update, delete on public.request_services to authenticated;
grant select, insert, update, delete on public.request_answers to authenticated;
grant select, insert, update, delete on public.request_files to authenticated;
grant select, insert, update, delete on public.document_templates to authenticated;
grant select, insert, update, delete on public.request_document_checklist to authenticated;
grant select, insert, update, delete on public.recommendation_sessions to authenticated;
grant select, insert, update, delete on public.recommendation_answers to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
revoke all on public.customer_messages from anon, authenticated;
grant select, insert, update on public.customer_messages to authenticated;
grant select, insert, update, delete on public.request_activity_log to authenticated;
revoke all on public.internal_tasks from anon, authenticated;
grant select, insert, update, delete on public.internal_tasks to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
    and role = 'admin'
  );
$$;

create or replace function public.is_admin_or_team()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
    and role in ('admin', 'team')
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin_or_team() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_or_team() to authenticated;

drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Public can read active service questions" on public.service_questions;
drop policy if exists "Admins can manage service catalog" on public.services;
drop policy if exists "Admins can manage service questions" on public.service_questions;
drop policy if exists "Admins can manage requests" on public.service_requests;
drop policy if exists "Admins can manage request services" on public.request_services;
drop policy if exists "Admins can manage request answers" on public.request_answers;
drop policy if exists "Admins can manage request files" on public.request_files;
drop policy if exists "Admins can manage document templates" on public.document_templates;
drop policy if exists "Admins can manage request document checklist" on public.request_document_checklist;
drop policy if exists "Admins can manage recommendation sessions" on public.recommendation_sessions;
drop policy if exists "Admins can manage recommendation answers" on public.recommendation_answers;
drop policy if exists "Admins can manage notes" on public.admin_notes;
drop policy if exists "Admins can read customer messages" on public.customer_messages;
drop policy if exists "Admins can insert customer messages" on public.customer_messages;
drop policy if exists "Admins can update customer messages" on public.customer_messages;
drop policy if exists "Customers can read own visible messages" on public.customer_messages;
drop policy if exists "Admins can manage activity" on public.request_activity_log;
drop policy if exists "Admins can read request documents" on storage.objects;
drop policy if exists "Admin and team can read staff profiles" on public.profiles;
drop policy if exists "Admins can manage internal tasks" on public.internal_tasks;

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

drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admin and team can read staff profiles"
on public.profiles for select
to authenticated
using (public.is_admin_or_team() and role in ('admin', 'team'));

create policy "Admins can manage service catalog"
on public.services for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage service questions"
on public.service_questions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage requests"
on public.service_requests for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

drop policy if exists "Customers can read own requests" on public.service_requests;

create policy "Customers can read own requests"
on public.service_requests for select
to authenticated
using (
  customer_access_enabled = true
  and (
    customer_user_id = (select auth.uid())
    or lower(coalesce(customer_email, email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
);

create policy "Admins can manage request services"
on public.request_services for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

drop policy if exists "Customers can read own request services" on public.request_services;

create policy "Customers can read own request services"
on public.request_services for select
to authenticated
using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_services.request_id
    and sr.customer_access_enabled = true
    and (
      sr.customer_user_id = (select auth.uid())
      or lower(coalesce(sr.customer_email, sr.email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "Admins can manage request answers"
on public.request_answers for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

drop policy if exists "Customers can read own request answers" on public.request_answers;

create policy "Customers can read own request answers"
on public.request_answers for select
to authenticated
using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_answers.request_id
    and sr.customer_access_enabled = true
    and (
      sr.customer_user_id = (select auth.uid())
      or lower(coalesce(sr.customer_email, sr.email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "Admins can manage request files"
on public.request_files for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

drop policy if exists "Customers can read own request files" on public.request_files;

create policy "Customers can read own request files"
on public.request_files for select
to authenticated
using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_files.request_id
    and sr.customer_access_enabled = true
    and (
      sr.customer_user_id = (select auth.uid())
      or lower(coalesce(sr.customer_email, sr.email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "Admins can manage document templates"
on public.document_templates for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

create policy "Admins can manage request document checklist"
on public.request_document_checklist for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

drop policy if exists "Customers can read own visible checklist" on public.request_document_checklist;

create policy "Customers can read own visible checklist"
on public.request_document_checklist for select
to authenticated
using (
  customer_visible = true
  and exists (
    select 1 from public.service_requests sr
    where sr.id = request_document_checklist.request_id
    and sr.customer_access_enabled = true
    and (
      sr.customer_user_id = (select auth.uid())
      or lower(coalesce(sr.customer_email, sr.email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "Admins can manage recommendation sessions"
on public.recommendation_sessions for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

create policy "Admins can manage recommendation answers"
on public.recommendation_answers for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

create policy "Admins can manage notes"
on public.admin_notes for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

drop policy if exists "Customers can read visible notes" on public.admin_notes;

create policy "Customers can read visible notes"
on public.admin_notes for select
to authenticated
using (
  customer_visible = true
  and exists (
    select 1 from public.service_requests sr
    where sr.id = admin_notes.request_id
    and sr.customer_access_enabled = true
    and (
      sr.customer_user_id = (select auth.uid())
      or lower(coalesce(sr.customer_email, sr.email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "Admins can read customer messages"
on public.customer_messages for select
to authenticated
using (public.is_admin_or_team());

create policy "Admins can insert customer messages"
on public.customer_messages for insert
to authenticated
with check (public.is_admin_or_team());

create policy "Admins can update customer messages"
on public.customer_messages for update
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

create policy "Customers can read own visible messages"
on public.customer_messages for select
to authenticated
using (
  customer_visible = true
  and exists (
    select 1 from public.service_requests sr
    where sr.id = customer_messages.request_id
    and sr.customer_access_enabled = true
    and (
      sr.customer_user_id = (select auth.uid())
      or lower(coalesce(sr.customer_email, sr.email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "Admins can manage activity"
on public.request_activity_log for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());

create policy "Admins can manage internal tasks"
on public.internal_tasks for all
to authenticated
using (public.is_admin_or_team())
with check (public.is_admin_or_team());


insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', false)
on conflict (id) do nothing;

create policy "Admins can read request documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-documents'
  and public.is_admin_or_team()
);
