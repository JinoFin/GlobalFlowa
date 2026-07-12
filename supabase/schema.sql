create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'team', 'customer')),
  email text,
  phone text,
  job_title text,
  preferred_language text,
  timezone text
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
  customer_access_enabled boolean not null default true,
  lifecycle_stage text not null default 'received' check (lifecycle_stage in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed','archived')),
  lifecycle_stage_updated_at timestamptz,
  lifecycle_stage_updated_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  completion_summary text,
  customer_completion_note text,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  archived_from_stage text check (archived_from_stage is null or archived_from_stage in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed'))
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
  title text,
  description text,
  file_category text not null default 'internal_document' check (file_category in ('customer_upload','internal_document','final_deliverable','authority_document','certificate','report','agreement','invoice','correspondence','other')),
  customer_visible boolean not null default false,
  is_final_deliverable boolean not null default false,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  constraint request_files_publication_state_check check ((customer_visible = false and published_at is null and published_by is null) or (customer_visible = true and is_final_deliverable = true and published_at is not null and published_by is not null and deleted_at is null)),
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

create table if not exists public.customer_account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null check (event in ('customer_signed_up', 'customer_email_verified', 'customer_account_linked', 'customer_personal_profile_updated', 'customer_company_profile_updated')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  legal_name text,
  trading_name text,
  registration_number text,
  vat_number text,
  country_code text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postal_code text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  constraint customer_companies_owner_user_id_key unique (owner_user_id)
);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'team', 'customer'));
alter table public.profiles alter column role set default 'customer';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists preferred_language text;
alter table public.profiles add column if not exists timezone text;

alter table public.service_requests add column if not exists customer_user_id uuid references auth.users(id);
alter table public.service_requests add column if not exists customer_email text;
alter table public.service_requests add column if not exists customer_access_enabled boolean not null default true;
alter table public.service_requests add column if not exists lifecycle_stage text not null default 'received';
alter table public.service_requests add column if not exists lifecycle_stage_updated_at timestamptz;
alter table public.service_requests add column if not exists lifecycle_stage_updated_by uuid references public.profiles(id) on delete set null;
alter table public.service_requests add column if not exists completed_at timestamptz;
alter table public.service_requests add column if not exists completed_by uuid references public.profiles(id) on delete set null;
alter table public.service_requests add column if not exists completion_summary text;
alter table public.service_requests add column if not exists customer_completion_note text;
alter table public.service_requests add column if not exists reopened_at timestamptz;
alter table public.service_requests add column if not exists reopened_by uuid references public.profiles(id) on delete set null;
alter table public.service_requests add column if not exists archived_at timestamptz;
alter table public.service_requests add column if not exists archived_by uuid references public.profiles(id) on delete set null;
alter table public.service_requests add column if not exists archived_from_stage text;
alter table public.service_requests drop constraint if exists service_requests_archived_from_stage_check;
alter table public.service_requests add constraint service_requests_archived_from_stage_check check (archived_from_stage is null or archived_from_stage in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed'));
update public.service_requests set lifecycle_stage = case status when 'New' then 'received' when 'In Review' then 'initial_review' when 'Missing Documents' then 'waiting_for_documents' when 'Waiting for Customer' then 'waiting_for_documents' when 'Submitted to Authority' then 'external_processing' when 'In Progress' then 'processing' when 'Completed' then 'completed' else 'received' end where lifecycle_stage = 'received' and lifecycle_stage_updated_at is null;
alter table public.service_requests drop constraint if exists service_requests_lifecycle_stage_check;
alter table public.service_requests add constraint service_requests_lifecycle_stage_check check (lifecycle_stage in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed','archived'));
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
alter table public.request_files add column if not exists title text;
alter table public.request_files add column if not exists description text;
alter table public.request_files add column if not exists file_category text;
alter table public.request_files add column if not exists customer_visible boolean not null default false;
alter table public.request_files add column if not exists is_final_deliverable boolean not null default false;
alter table public.request_files add column if not exists published_at timestamptz;
alter table public.request_files add column if not exists published_by uuid references public.profiles(id) on delete set null;
alter table public.request_files add column if not exists deleted_at timestamptz;
alter table public.request_files add column if not exists deleted_by uuid references public.profiles(id) on delete set null;
update public.request_files set file_category = case when uploaded_by_role = 'customer' then 'customer_upload' else 'internal_document' end where file_category is null;
alter table public.request_files alter column file_category set default 'internal_document';
alter table public.request_files alter column file_category set not null;
alter table public.request_files drop constraint if exists request_files_uploaded_by_role_check;
alter table public.request_files add constraint request_files_uploaded_by_role_check check (uploaded_by_role in ('customer', 'admin', 'system'));
alter table public.request_files drop constraint if exists request_files_file_category_check;
alter table public.request_files add constraint request_files_file_category_check check (file_category in ('customer_upload','internal_document','final_deliverable','authority_document','certificate','report','agreement','invoice','correspondence','other'));
alter table public.request_files drop constraint if exists request_files_publication_state_check;
alter table public.request_files add constraint request_files_publication_state_check check ((customer_visible = false and published_at is null and published_by is null) or (customer_visible = true and is_final_deliverable = true and published_at is not null and published_by is not null and deleted_at is null));

create or replace function public.enforce_customer_upload_active_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare request_stage text;
begin
  if new.uploaded_by_role <> 'customer' then return new; end if;
  select requests.lifecycle_stage into request_stage
  from public.service_requests as requests
  where requests.id = new.request_id
  for update;
  if request_stage in ('completed', 'archived') then
    raise exception 'request is not accepting customer uploads' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_customer_upload_active_request() from public, anon, authenticated;
drop trigger if exists enforce_customer_upload_active_request on public.request_files;
create trigger enforce_customer_upload_active_request before insert on public.request_files
for each row execute function public.enforce_customer_upload_active_request();

alter table public.request_document_checklist add column if not exists customer_visible boolean not null default true;
alter table public.request_document_checklist add column if not exists admin_note_customer_visible boolean not null default false;

create or replace view public.customer_request_checklist
with (security_invoker = true)
as
select
  checklist.id,
  checklist.request_id,
  checklist.document_key,
  checklist.title,
  checklist.description,
  checklist.category,
  checklist.status,
  case when checklist.admin_note_customer_visible then checklist.admin_note else null end as admin_note,
  checklist.admin_note_customer_visible,
  checklist.customer_note,
  checklist.linked_file_id,
  checklist.required,
  checklist.sort_order
from public.request_document_checklist as checklist
where checklist.customer_visible = true;

revoke all on public.customer_request_checklist from public, anon;
grant select on public.customer_request_checklist to authenticated;

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
create index if not exists idx_service_requests_lifecycle_stage on public.service_requests(lifecycle_stage);
create index if not exists idx_service_requests_lifecycle_updated_at on public.service_requests(lifecycle_stage_updated_at);
create index if not exists idx_service_requests_completed_at on public.service_requests(completed_at desc);
create index if not exists idx_service_requests_archived_at on public.service_requests(archived_at desc);
create index if not exists idx_service_requests_lifecycle_updated on public.service_requests(lifecycle_stage, lifecycle_stage_updated_at desc);
create index if not exists idx_request_services_request_id on public.request_services(request_id);
create index if not exists idx_request_answers_request_id on public.request_answers(request_id);
create index if not exists idx_request_files_request_id on public.request_files(request_id);
create index if not exists idx_request_files_linked_checklist_item_id on public.request_files(linked_checklist_item_id);
create index if not exists idx_request_files_published_deliverables on public.request_files(request_id, published_at desc) where is_final_deliverable = true and customer_visible = true and published_at is not null and deleted_at is null;
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
create index if not exists idx_customer_companies_owner_user_id on public.customer_companies(owner_user_id);

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
alter table public.customer_account_activity enable row level security;
alter table public.customer_companies enable row level security;

grant select on public.services to anon, authenticated;
grant select on public.service_questions to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
revoke all on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, job_title, preferred_language, timezone, updated_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.service_requests to authenticated;
revoke all on public.service_requests from anon;
grant select, insert, update, delete on public.request_services to authenticated;
revoke all on public.request_services from anon;
grant select, insert, update, delete on public.request_answers to authenticated;
revoke all on public.request_answers from anon;
grant select, insert, update, delete on public.request_files to authenticated;
revoke all on public.request_files from anon;
grant select, insert, update, delete on public.document_templates to authenticated;
grant select, insert, update, delete on public.request_document_checklist to authenticated;
revoke all on public.request_document_checklist from anon;
grant select, insert, update, delete on public.recommendation_sessions to authenticated;
grant select, insert, update, delete on public.recommendation_answers to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
revoke all on public.admin_notes from anon;
revoke all on public.customer_messages from anon, authenticated;
grant select, insert, update on public.customer_messages to authenticated;
grant select, insert, update, delete on public.request_activity_log to authenticated;
revoke all on public.request_activity_log from anon;
revoke all on public.customer_account_activity from anon, authenticated;
grant select on public.customer_account_activity to authenticated;
revoke all on public.customer_companies from anon, authenticated;
grant select, insert, update on public.customer_companies to authenticated;
revoke all on public.internal_tasks from anon, authenticated;
grant select, insert, update, delete on public.internal_tasks to authenticated;
revoke all on public.internal_tasks from anon;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.role::text from public.profiles as profiles
  where profiles.id = auth.uid() limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles as profiles where profiles.id = auth.uid() and profiles.role = 'admin');
$$;

create or replace function public.current_user_is_admin_or_team()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles as profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'team'));
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
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
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
    and role in ('admin', 'team')
  );
$$;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.current_user_is_admin_or_team() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_admin_or_team() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_admin_or_team() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_or_team() to authenticated;

create or replace function public.is_verified_customer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users
    join public.profiles on profiles.id = users.id
    where users.id = auth.uid()
      and users.email_confirmed_at is not null
      and profiles.role = 'customer'
  );
$$;

revoke all on function public.is_verified_customer() from public, anon;
grant execute on function public.is_verified_customer() to authenticated;

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
drop policy if exists "Customers can update own personal profile" on public.profiles;
drop policy if exists "Admin and team can read customer profiles" on public.profiles;
drop policy if exists "Customers can read own company" on public.customer_companies;
drop policy if exists "Customers can insert own company" on public.customer_companies;
drop policy if exists "Customers can update own company" on public.customer_companies;
drop policy if exists "Admin and team can read customer companies" on public.customer_companies;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Customers can update own personal profile"
on public.profiles for update
to authenticated
using ((select public.is_verified_customer()) and id = (select auth.uid()))
with check ((select public.is_verified_customer()) and id = (select auth.uid()));

create policy "Admin and team can read customer profiles"
on public.profiles for select
to authenticated
using ((select public.is_admin_or_team()) and role = 'customer');

create policy "Customers can read own company"
on public.customer_companies for select
to authenticated
using ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()));

create policy "Customers can insert own company"
on public.customer_companies for insert
to authenticated
with check ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()));

create policy "Customers can update own company"
on public.customer_companies for update
to authenticated
using ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()))
with check ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()));

create policy "Admin and team can read customer companies"
on public.customer_companies for select
to authenticated
using ((select public.is_admin_or_team()));

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
  public.is_verified_customer()
  and customer_access_enabled = true
  and customer_user_id = (select auth.uid())
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
  public.is_verified_customer()
  and
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_services.request_id
    and sr.customer_access_enabled = true
    and sr.customer_user_id = (select auth.uid())
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
  public.is_verified_customer()
  and
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_answers.request_id
    and sr.customer_access_enabled = true
    and sr.customer_user_id = (select auth.uid())
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
  public.is_verified_customer()
  and deleted_at is null
  and (
    (uploaded_by_role = 'customer' and is_final_deliverable = false)
    or (is_final_deliverable = true and customer_visible = true and published_at is not null)
  )
  and
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_files.request_id
    and sr.customer_access_enabled = true
    and sr.customer_user_id = (select auth.uid())
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
  public.is_verified_customer()
  and
  customer_visible = true
  and exists (
    select 1 from public.service_requests sr
    where sr.id = request_document_checklist.request_id
    and sr.customer_access_enabled = true
    and sr.customer_user_id = (select auth.uid())
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
  public.is_verified_customer()
  and
  customer_visible = true
  and exists (
    select 1 from public.service_requests sr
    where sr.id = admin_notes.request_id
    and sr.customer_access_enabled = true
    and sr.customer_user_id = (select auth.uid())
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
  public.is_verified_customer()
  and
  customer_visible = true
  and exists (
    select 1 from public.service_requests sr
    where sr.id = customer_messages.request_id
    and sr.customer_access_enabled = true
    and sr.customer_user_id = (select auth.uid())
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

create policy "Admin and team can read customer account activity"
on public.customer_account_activity for select
to authenticated
using (public.is_admin_or_team());

create or replace function public.handle_customer_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, created_at, updated_at)
  values (new.id, new.email, 'customer', now(), now())
  on conflict (id) do update
  set email = excluded.email, updated_at = now();
  insert into public.customer_account_activity (user_id, event, details)
  values (new.id, 'customer_signed_up', '{}'::jsonb);
  return new;
end;
$$;

revoke all on function public.handle_customer_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile after insert on auth.users
for each row execute function public.handle_customer_auth_user();

insert into public.profiles (id, email, role, created_at, updated_at)
select users.id, users.email, 'customer', coalesce(users.created_at, now()), now()
from auth.users as users
where not exists (select 1 from public.profiles where profiles.id = users.id);

create or replace function public.log_customer_email_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null
     and new.email_confirmed_at is not null
     and exists (select 1 from public.profiles as profiles where profiles.id = new.id and profiles.role = 'customer') then
    insert into public.customer_account_activity (user_id, event) values (new.id, 'customer_email_verified');
  end if;
  return new;
end;
$$;

revoke all on function public.log_customer_email_verification() from public, anon, authenticated;
drop trigger if exists on_auth_user_email_verified on auth.users;
create trigger on_auth_user_email_verified after update of email_confirmed_at on auth.users
for each row execute function public.log_customer_email_verification();

create or replace function public.log_customer_account_link()
returns trigger language plpgsql security definer set search_path = '' as $$
declare should_log boolean := false;
begin
  if tg_op = 'INSERT' then
    should_log := new.customer_user_id is not null;
  else
    should_log := new.customer_user_id is not null and new.customer_user_id is distinct from old.customer_user_id;
  end if;
  if should_log then
    insert into public.customer_account_activity (user_id, event, details)
    values (new.customer_user_id, 'customer_account_linked', jsonb_build_object('request_id', new.id));
  end if;
  return new;
end;
$$;

revoke all on function public.log_customer_account_link() from public, anon, authenticated;
drop trigger if exists on_service_request_customer_linked on public.service_requests;
create trigger on_service_request_customer_linked after insert or update of customer_user_id on public.service_requests
for each row execute function public.log_customer_account_link();

create or replace function public.claim_requests_for_current_customer()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  normalized_email text;
  claimed_count integer := 0;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select lower(btrim(users.email)) into normalized_email
  from auth.users as users
  join public.profiles as profiles on profiles.id = users.id
  where users.id = caller_id and users.email_confirmed_at is not null and profiles.role = 'customer';
  if normalized_email is null or normalized_email = '' then
    raise exception 'verified customer email required' using errcode = '42501';
  end if;
  with claimed as (
    update public.service_requests as requests
    set customer_user_id = caller_id, updated_at = now()
    where requests.customer_user_id is null
      and requests.lifecycle_stage <> 'archived'
      and lower(btrim(requests.customer_email)) = normalized_email
    returning requests.id
  ), logged as (
    insert into public.request_activity_log (request_id, actor_id, actor_type, action, details)
    select claimed.id, caller_id, 'customer', 'customer_account_linked', jsonb_build_object('linking_method', 'verified_email', 'linked_at', now())
    from claimed returning 1
  )
  select count(*)::integer into claimed_count from claimed;
  return claimed_count;
end;
$$;

revoke all on function public.claim_requests_for_current_customer() from public, anon;
grant execute on function public.claim_requests_for_current_customer() to authenticated;

create or replace function public.update_request_lifecycle_stage(p_request_id uuid, p_lifecycle_stage text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); request_row public.service_requests%rowtype; changed_at timestamptz := now();
begin
  if actor_id is null or not exists (select 1 from public.profiles as profiles where profiles.id=actor_id and profiles.role in ('admin','team')) then raise exception 'staff authorization required' using errcode='42501'; end if;
  if p_lifecycle_stage not in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review') then raise exception 'invalid lifecycle stage' using errcode='22023'; end if;
  select * into request_row from public.service_requests where id=p_request_id for update;
  if not found then raise exception 'request not found' using errcode='P0002'; end if;
  if request_row.lifecycle_stage in ('completed','archived') then raise exception 'terminal lifecycle requires a dedicated action' using errcode='22023'; end if;
  if request_row.lifecycle_stage=p_lifecycle_stage then return jsonb_build_object('ok',true,'unchanged',true,'stage',request_row.lifecycle_stage); end if;
  update public.service_requests set lifecycle_stage=p_lifecycle_stage,lifecycle_stage_updated_at=changed_at,lifecycle_stage_updated_by=actor_id,updated_at=changed_at where id=p_request_id;
  insert into public.request_activity_log(request_id,actor_id,actor_type,action,details) values(p_request_id,actor_id,'admin','lifecycle_stage_changed',jsonb_build_object('previous_stage',request_row.lifecycle_stage,'new_stage',p_lifecycle_stage,'changed_at',changed_at));
  return jsonb_build_object('ok',true,'stage',p_lifecycle_stage,'updated_at',changed_at);
end; $$;
revoke all on function public.update_request_lifecycle_stage(uuid,text) from public,anon;
grant execute on function public.update_request_lifecycle_stage(uuid,text) to authenticated;

create or replace function public.perform_request_lifecycle_action(
  p_request_id uuid, p_action text, p_customer_completion_note text default null,
  p_completion_summary text default null, p_target_stage text default null,
  p_confirm_warnings boolean default false
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); request_row public.service_requests%rowtype; warnings jsonb := '[]'::jsonb; target_stage text; changed_at timestamptz := now();
begin
  if actor_id is null or not exists (select 1 from public.profiles where id=actor_id and role in ('admin','team')) then raise exception 'staff authorization required' using errcode='42501'; end if;
  select * into request_row from public.service_requests where id=p_request_id for update;
  if not found then raise exception 'request not found' using errcode='P0002'; end if;
  if p_action not in ('complete','reopen','archive','restore') then raise exception 'invalid lifecycle action' using errcode='22023'; end if;
  if p_action='complete' then
    if request_row.lifecycle_stage='archived' then raise exception 'archived request cannot be completed' using errcode='22023'; end if;
    if request_row.lifecycle_stage='completed' then return jsonb_build_object('ok',true,'unchanged',true,'stage','completed'); end if;
    if nullif(btrim(p_customer_completion_note),'') is null then raise exception 'customer completion note required' using errcode='22023'; end if;
    if exists(select 1 from public.request_document_checklist where request_id=p_request_id and required=true and status in ('required','missing')) then warnings:=warnings||jsonb_build_array('missing_required_documents'); end if;
    if exists(select 1 from public.request_document_checklist where request_id=p_request_id and required=true and status in ('incorrect','expired')) then warnings:=warnings||jsonb_build_array('rejected_or_expired_documents'); end if;
    if exists(select 1 from public.request_document_checklist where request_id=p_request_id and status in ('uploaded','under_review')) then warnings:=warnings||jsonb_build_array('documents_waiting_for_review'); end if;
    if exists(select 1 from public.internal_tasks where request_id=p_request_id and status not in ('completed','cancelled')) then warnings:=warnings||jsonb_build_array('open_internal_tasks'); end if;
    if request_row.lifecycle_stage='waiting_for_documents' or exists(select 1 from public.customer_messages where request_id=p_request_id and customer_visible=true and cardinality(checklist_item_ids)>0) then warnings:=warnings||jsonb_build_array('outstanding_customer_action'); end if;
    if not exists(select 1 from public.request_files where request_id=p_request_id and is_final_deliverable=true and customer_visible=true and published_at is not null and deleted_at is null) then warnings:=warnings||jsonb_build_array('no_published_final_deliverables'); end if;
    if request_row.lifecycle_stage<>'final_review' then warnings:=warnings||jsonb_build_array('not_in_final_review'); end if;
    if jsonb_array_length(warnings)>0 and not p_confirm_warnings then return jsonb_build_object('ok',false,'requires_confirmation',true,'warnings',warnings,'stage',request_row.lifecycle_stage); end if;
    update public.service_requests set lifecycle_stage='completed',lifecycle_stage_updated_at=changed_at,lifecycle_stage_updated_by=actor_id,completed_at=changed_at,completed_by=actor_id,customer_completion_note=btrim(p_customer_completion_note),completion_summary=nullif(btrim(p_completion_summary),''),archived_at=null,archived_by=null,archived_from_stage=null,status='Completed',updated_at=changed_at where id=p_request_id;
    insert into public.request_activity_log(request_id,actor_id,actor_type,action,details) values(p_request_id,actor_id,'admin','request_completed',jsonb_build_object('previous_stage',request_row.lifecycle_stage,'new_stage','completed','warnings_confirmed',p_confirm_warnings,'warning_categories',warnings,'has_customer_note',true,'changed_at',changed_at));
    return jsonb_build_object('ok',true,'stage','completed','warnings',warnings);
  elsif p_action='archive' then
    if not p_confirm_warnings then raise exception 'archive confirmation required' using errcode='22023'; end if;
    if request_row.lifecycle_stage='archived' then return jsonb_build_object('ok',true,'unchanged',true,'stage','archived'); end if;
    update public.service_requests set archived_from_stage=request_row.lifecycle_stage,lifecycle_stage='archived',lifecycle_stage_updated_at=changed_at,lifecycle_stage_updated_by=actor_id,archived_at=changed_at,archived_by=actor_id,updated_at=changed_at where id=p_request_id;
    insert into public.request_activity_log(request_id,actor_id,actor_type,action,details) values(p_request_id,actor_id,'admin','request_archived',jsonb_build_object('previous_stage',request_row.lifecycle_stage,'new_stage','archived','changed_at',changed_at)); return jsonb_build_object('ok',true,'stage','archived');
  elsif p_action='reopen' then
    if not(request_row.lifecycle_stage='completed' or(request_row.lifecycle_stage='archived' and request_row.completed_at is not null)) then raise exception 'request is not completed' using errcode='22023'; end if;
    target_stage:=coalesce(p_target_stage,'processing'); if target_stage not in ('initial_review','waiting_for_documents','document_review','processing','external_processing','final_review') then raise exception 'invalid reopen target' using errcode='22023'; end if;
    update public.service_requests set lifecycle_stage=target_stage,lifecycle_stage_updated_at=changed_at,lifecycle_stage_updated_by=actor_id,reopened_at=changed_at,reopened_by=actor_id,archived_at=null,archived_by=null,archived_from_stage=null,status='In Progress',updated_at=changed_at where id=p_request_id;
    insert into public.request_activity_log(request_id,actor_id,actor_type,action,details) values(p_request_id,actor_id,'admin','request_reopened',jsonb_build_object('previous_stage',request_row.lifecycle_stage,'new_stage',target_stage,'changed_at',changed_at)); return jsonb_build_object('ok',true,'stage',target_stage);
  else
    if request_row.lifecycle_stage<>'archived' then raise exception 'request is not archived' using errcode='22023'; end if;
    target_stage:=coalesce(p_target_stage,case when request_row.archived_from_stage in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed') then request_row.archived_from_stage when request_row.completed_at is not null then 'completed' else 'processing' end);
    if target_stage not in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed') then raise exception 'invalid restore target' using errcode='22023'; end if;
    update public.service_requests set lifecycle_stage=target_stage,lifecycle_stage_updated_at=changed_at,lifecycle_stage_updated_by=actor_id,archived_at=null,archived_by=null,archived_from_stage=null,status=case when target_stage='completed' then 'Completed' when request_row.status='Completed' then 'In Progress' else request_row.status end,updated_at=changed_at where id=p_request_id;
    insert into public.request_activity_log(request_id,actor_id,actor_type,action,details) values(p_request_id,actor_id,'admin','request_restored',jsonb_build_object('previous_stage','archived','new_stage',target_stage,'restoration_stage',target_stage,'changed_at',changed_at)); return jsonb_build_object('ok',true,'stage',target_stage);
  end if;
end; $$;
revoke all on function public.perform_request_lifecycle_action(uuid,text,text,text,text,boolean) from public,anon;
grant execute on function public.perform_request_lifecycle_action(uuid,text,text,text,text,boolean) to authenticated;

create or replace function public.log_customer_personal_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare changed_fields text[] := array[]::text[];
begin
  if new.full_name is distinct from old.full_name then changed_fields := array_append(changed_fields, 'full_name'); end if;
  if new.phone is distinct from old.phone then changed_fields := array_append(changed_fields, 'phone'); end if;
  if new.job_title is distinct from old.job_title then changed_fields := array_append(changed_fields, 'job_title'); end if;
  if new.preferred_language is distinct from old.preferred_language then changed_fields := array_append(changed_fields, 'preferred_language'); end if;
  if new.timezone is distinct from old.timezone then changed_fields := array_append(changed_fields, 'timezone'); end if;
  if cardinality(changed_fields) > 0 and new.role = 'customer' then
    insert into public.customer_account_activity (user_id, event, details)
    values (new.id, 'customer_personal_profile_updated', jsonb_build_object('changed_fields', changed_fields));
  end if;
  return new;
end;
$$;

revoke all on function public.log_customer_personal_profile_update() from public, anon, authenticated;
drop trigger if exists on_customer_personal_profile_updated on public.profiles;
create trigger on_customer_personal_profile_updated after update of full_name, phone, job_title, preferred_language, timezone on public.profiles
for each row execute function public.log_customer_personal_profile_update();

create or replace function public.log_customer_company_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.customer_account_activity (user_id, event, details)
  values (new.owner_user_id, 'customer_company_profile_updated', jsonb_build_object('operation', lower(tg_op)));
  return new;
end;
$$;

revoke all on function public.log_customer_company_profile_update() from public, anon, authenticated;
drop trigger if exists on_customer_company_profile_updated on public.customer_companies;
create trigger on_customer_company_profile_updated after insert or update on public.customer_companies
for each row execute function public.log_customer_company_profile_update();

insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', false)
on conflict (id) do nothing;

drop policy if exists "Admins can read request documents" on storage.objects;
create policy "Admins can read request documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-documents'
  and public.is_admin_or_team()
);
