-- Phase 6A-6B: customer lifecycle, verified access, and personal/company profiles.
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
begin
  if new.customer_user_id is not null and new.customer_user_id is distinct from old.customer_user_id then
    insert into public.customer_account_activity (user_id, event, details)
    values (new.customer_user_id, 'customer_account_linked', jsonb_build_object('request_id', new.id));
  end if;
  return new;
end;
$$;

revoke all on function public.log_customer_account_link() from public, anon, authenticated;

drop trigger if exists on_service_request_customer_linked on public.service_requests;
create trigger on_service_request_customer_linked
after update of customer_user_id on public.service_requests
for each row execute function public.log_customer_account_link();

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
using (public.is_verified_customer() and exists (select 1 from public.service_requests sr where sr.id = request_files.request_id and sr.customer_access_enabled = true and sr.customer_user_id = (select auth.uid())));

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
