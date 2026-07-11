-- Phase 6A-6E: customer lifecycle, verified access, profiles, request linking,
-- lifecycle progress, and secure final customer deliverables.
-- This migration is additive/idempotent and does not change existing admin or team roles.

create table if not exists public.customer_account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null check (event in ('customer_signed_up', 'customer_email_verified', 'customer_account_linked', 'customer_personal_profile_updated', 'customer_company_profile_updated')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_account_activity enable row level security;
revoke all on public.customer_account_activity from anon, authenticated;
grant select on public.customer_account_activity to authenticated;

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists preferred_language text;
alter table public.profiles add column if not exists timezone text;

alter table public.service_requests add column if not exists lifecycle_stage text not null default 'received';
alter table public.service_requests add column if not exists lifecycle_stage_updated_at timestamptz;
alter table public.service_requests add column if not exists lifecycle_stage_updated_by uuid references public.profiles(id) on delete set null;

alter table public.request_files add column if not exists title text;
alter table public.request_files add column if not exists description text;
alter table public.request_files add column if not exists file_category text;
alter table public.request_files add column if not exists customer_visible boolean not null default false;
alter table public.request_files add column if not exists is_final_deliverable boolean not null default false;
alter table public.request_files add column if not exists published_at timestamptz;
alter table public.request_files add column if not exists published_by uuid references public.profiles(id) on delete set null;
alter table public.request_files add column if not exists deleted_at timestamptz;
alter table public.request_files add column if not exists deleted_by uuid references public.profiles(id) on delete set null;
update public.request_files
set file_category = case when uploaded_by_role = 'customer' then 'customer_upload' else 'internal_document' end
where file_category is null;
alter table public.request_files alter column file_category set default 'internal_document';
alter table public.request_files alter column file_category set not null;
alter table public.request_files drop constraint if exists request_files_file_category_check;
alter table public.request_files add constraint request_files_file_category_check check (file_category in ('customer_upload','internal_document','final_deliverable','authority_document','certificate','report','agreement','invoice','correspondence','other'));
alter table public.request_files drop constraint if exists request_files_publication_state_check;
alter table public.request_files add constraint request_files_publication_state_check check (
  (customer_visible = false and published_at is null and published_by is null)
  or (customer_visible = true and is_final_deliverable = true and published_at is not null and published_by is not null and deleted_at is null)
);
create index if not exists idx_request_files_published_deliverables
on public.request_files(request_id, published_at desc)
where is_final_deliverable = true and customer_visible = true and published_at is not null and deleted_at is null;
update public.service_requests set lifecycle_stage = case status
  when 'New' then 'received' when 'In Review' then 'initial_review'
  when 'Missing Documents' then 'waiting_for_documents' when 'Waiting for Customer' then 'waiting_for_documents'
  when 'Submitted to Authority' then 'external_processing' when 'In Progress' then 'processing'
  when 'Completed' then 'completed' else 'received' end
where lifecycle_stage = 'received' and lifecycle_stage_updated_at is null;
alter table public.service_requests drop constraint if exists service_requests_lifecycle_stage_check;
alter table public.service_requests add constraint service_requests_lifecycle_stage_check check (lifecycle_stage in ('received','initial_review','waiting_for_documents','document_review','processing','external_processing','final_review','completed','archived'));
create index if not exists idx_service_requests_lifecycle_stage on public.service_requests(lifecycle_stage);
create index if not exists idx_service_requests_lifecycle_updated_at on public.service_requests(lifecycle_stage_updated_at);

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

create index if not exists idx_customer_companies_owner_user_id on public.customer_companies(owner_user_id);
alter table public.customer_companies enable row level security;
revoke all on public.customer_companies from anon, authenticated;
grant select, insert, update on public.customer_companies to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name, phone, job_title, preferred_language, timezone, updated_at) on public.profiles to authenticated;

create or replace function public.is_verified_customer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    join public.profiles on profiles.id = users.id
    where users.id = auth.uid()
      and users.email_confirmed_at is not null
      and profiles.role = 'customer'
  );
$$;

revoke all on function public.is_verified_customer() from public, anon;
grant execute on function public.is_verified_customer() to authenticated;

drop policy if exists "Customers can update own personal profile" on public.profiles;
create policy "Customers can update own personal profile"
on public.profiles for update
to authenticated
using ((select public.is_verified_customer()) and id = (select auth.uid()))
with check ((select public.is_verified_customer()) and id = (select auth.uid()));

drop policy if exists "Admin and team can read customer profiles" on public.profiles;
create policy "Admin and team can read customer profiles"
on public.profiles for select
to authenticated
using ((select public.is_admin_or_team()) and role = 'customer');

drop policy if exists "Customers can read own company" on public.customer_companies;
create policy "Customers can read own company"
on public.customer_companies for select
to authenticated
using ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()));

drop policy if exists "Customers can insert own company" on public.customer_companies;
create policy "Customers can insert own company"
on public.customer_companies for insert
to authenticated
with check ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()));

drop policy if exists "Customers can update own company" on public.customer_companies;
create policy "Customers can update own company"
on public.customer_companies for update
to authenticated
using ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()))
with check ((select public.is_verified_customer()) and owner_user_id = (select auth.uid()));

drop policy if exists "Admin and team can read customer companies" on public.customer_companies;
create policy "Admin and team can read customer companies"
on public.customer_companies for select
to authenticated
using ((select public.is_admin_or_team()));

create or replace function public.log_customer_personal_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_fields text[] := array[]::text[];
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
create trigger on_customer_personal_profile_updated
after update of full_name, phone, job_title, preferred_language, timezone on public.profiles
for each row execute function public.log_customer_personal_profile_update();

create or replace function public.log_customer_company_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_account_activity (user_id, event, details)
  values (
    new.owner_user_id,
    'customer_company_profile_updated',
    jsonb_build_object('operation', lower(tg_op))
  );
  return new;
end;
$$;

revoke all on function public.log_customer_company_profile_update() from public, anon, authenticated;
drop trigger if exists on_customer_company_profile_updated on public.customer_companies;
create trigger on_customer_company_profile_updated
after insert or update on public.customer_companies
for each row execute function public.log_customer_company_profile_update();

drop policy if exists "Admin and team can read customer account activity" on public.customer_account_activity;
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
  set email = excluded.email, role = 'customer', updated_at = now();

  insert into public.customer_account_activity (user_id, event, details)
  values (new.id, 'customer_signed_up', jsonb_build_object('email', new.email));
  return new;
end;
$$;

revoke all on function public.handle_customer_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile
after insert on auth.users
for each row execute function public.handle_customer_auth_user();

insert into public.profiles (id, email, role, created_at, updated_at)
select users.id, users.email, 'customer', coalesce(users.created_at, now()), now()
from auth.users as users
where not exists (select 1 from public.profiles where profiles.id = users.id);

create or replace function public.log_customer_email_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.customer_account_activity (user_id, event, details)
    values (new.id, 'customer_email_verified', '{}'::jsonb);
  end if;
  return new;
end;
$$;

revoke all on function public.log_customer_email_verification() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_verified on auth.users;
create trigger on_auth_user_email_verified
after update of email_confirmed_at on auth.users
for each row execute function public.log_customer_email_verification();

create or replace function public.log_customer_account_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_log boolean := false;
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
create trigger on_service_request_customer_linked
after insert or update of customer_user_id on public.service_requests
for each row execute function public.log_customer_account_link();

create or replace function public.claim_requests_for_current_customer()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_email text;
  claimed_count integer := 0;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select lower(btrim(users.email))
  into normalized_email
  from auth.users as users
  join public.profiles as profiles on profiles.id = users.id
  where users.id = caller_id
    and users.email_confirmed_at is not null
    and profiles.role = 'customer';

  if normalized_email is null or normalized_email = '' then
    raise exception 'verified customer email required' using errcode = '42501';
  end if;

  with claimed as (
    update public.service_requests as requests
    set customer_user_id = caller_id,
        updated_at = now()
    where requests.customer_user_id is null
      and lower(btrim(requests.customer_email)) = normalized_email
    returning requests.id
  ), logged as (
    insert into public.request_activity_log (request_id, actor_id, actor_type, action, details)
    select claimed.id, caller_id, 'customer', 'customer_account_linked',
      jsonb_build_object('linking_method', 'verified_email', 'linked_at', now())
    from claimed
    returning 1
  )
  select count(*)::integer into claimed_count from claimed;

  return claimed_count;
end;
$$;

revoke all on function public.claim_requests_for_current_customer() from public, anon;
grant execute on function public.claim_requests_for_current_customer() to authenticated;

drop policy if exists "Customers can read own requests" on public.service_requests;
create policy "Customers can read own requests" on public.service_requests for select to authenticated
using (public.is_verified_customer() and customer_access_enabled = true and customer_user_id = (select auth.uid()));

drop policy if exists "Customers can read own request services" on public.request_services;
create policy "Customers can read own request services" on public.request_services for select to authenticated
using (public.is_verified_customer() and exists (select 1 from public.service_requests sr where sr.id = request_services.request_id and sr.customer_access_enabled = true and sr.customer_user_id = (select auth.uid())));

drop policy if exists "Customers can read own request answers" on public.request_answers;
create policy "Customers can read own request answers" on public.request_answers for select to authenticated
using (public.is_verified_customer() and exists (select 1 from public.service_requests sr where sr.id = request_answers.request_id and sr.customer_access_enabled = true and sr.customer_user_id = (select auth.uid())));

drop policy if exists "Customers can read own request files" on public.request_files;
create policy "Customers can read own request files" on public.request_files for select to authenticated
using (
  public.is_verified_customer()
  and deleted_at is null
  and (
    (uploaded_by_role = 'customer' and is_final_deliverable = false)
    or (is_final_deliverable = true and customer_visible = true and published_at is not null)
  )
  and exists (
    select 1 from public.service_requests sr
    where sr.id = request_files.request_id
      and sr.customer_access_enabled = true
      and sr.customer_user_id = (select auth.uid())
  )
);

drop policy if exists "Customers can read own visible checklist" on public.request_document_checklist;
create policy "Customers can read own visible checklist" on public.request_document_checklist for select to authenticated
using (public.is_verified_customer() and customer_visible = true and exists (select 1 from public.service_requests sr where sr.id = request_document_checklist.request_id and sr.customer_access_enabled = true and sr.customer_user_id = (select auth.uid())));

drop policy if exists "Customers can read visible notes" on public.admin_notes;
create policy "Customers can read visible notes" on public.admin_notes for select to authenticated
using (public.is_verified_customer() and customer_visible = true and exists (select 1 from public.service_requests sr where sr.id = admin_notes.request_id and sr.customer_access_enabled = true and sr.customer_user_id = (select auth.uid())));

drop policy if exists "Customers can read own visible messages" on public.customer_messages;
create policy "Customers can read own visible messages" on public.customer_messages for select to authenticated
using (public.is_verified_customer() and customer_visible = true and exists (select 1 from public.service_requests sr where sr.id = customer_messages.request_id and sr.customer_access_enabled = true and sr.customer_user_id = (select auth.uid())));

notify pgrst, 'reload schema';
