-- Phase 3A live database fix for existing Globalflowa Supabase projects.
-- Use this after Phase 2C schema has already been applied.
-- It adds the customer portal columns before indexes/policies and replaces recursive admin RLS checks with SECURITY DEFINER helpers.

create extension if not exists "pgcrypto";

-- 1) Customer ownership and portal access fields
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'team', 'customer'));
alter table public.profiles alter column role set default 'customer';

alter table public.service_requests add column if not exists customer_user_id uuid references auth.users(id);
alter table public.service_requests add column if not exists customer_email text;
alter table public.service_requests add column if not exists customer_access_enabled boolean not null default true;
update public.service_requests set customer_email = lower(email) where customer_email is null and email is not null;

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

-- 2) Indexes that need the new columns
create index if not exists idx_service_requests_customer_user_id on public.service_requests(customer_user_id);
create index if not exists idx_service_requests_customer_email on public.service_requests ((lower(coalesce(customer_email, email))));
create index if not exists idx_request_files_linked_checklist_item_id on public.request_files(linked_checklist_item_id);

-- 3) SECURITY DEFINER helpers to avoid infinite recursion in profiles policies
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_user_is_admin_or_team()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'team')
  );
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_admin_or_team() to authenticated;

-- 4) Enable RLS and grants
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
alter table public.request_activity_log enable row level security;

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
grant select, insert, update, delete on public.request_activity_log to authenticated;

-- 5) Replace policies safely
-- Public catalog policies
drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Public can read active service questions" on public.service_questions;

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

-- Profiles policies
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Admins can read all profiles"
on public.profiles for select
to authenticated
using (public.current_user_is_admin());

create policy "Admins can insert profiles"
on public.profiles for insert
to authenticated
with check (public.current_user_is_admin());

create policy "Admins can update all profiles"
on public.profiles for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can delete profiles"
on public.profiles for delete
to authenticated
using (public.current_user_is_admin());

-- Admin/team policies
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
drop policy if exists "Admins can manage activity" on public.request_activity_log;

create policy "Admins can manage service catalog"
on public.services for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can manage service questions"
on public.service_questions for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can manage requests"
on public.service_requests for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage request services"
on public.request_services for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage request answers"
on public.request_answers for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage request files"
on public.request_files for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage document templates"
on public.document_templates for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage request document checklist"
on public.request_document_checklist for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage recommendation sessions"
on public.recommendation_sessions for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage recommendation answers"
on public.recommendation_answers for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage notes"
on public.admin_notes for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

create policy "Admins can manage activity"
on public.request_activity_log for all
to authenticated
using (public.current_user_is_admin_or_team())
with check (public.current_user_is_admin_or_team());

-- Customer read policies
drop policy if exists "Customers can read own requests" on public.service_requests;
drop policy if exists "Customers can read own request services" on public.request_services;
drop policy if exists "Customers can read own request answers" on public.request_answers;
drop policy if exists "Customers can read own request files" on public.request_files;
drop policy if exists "Customers can read own visible checklist" on public.request_document_checklist;
drop policy if exists "Customers can read visible notes" on public.admin_notes;

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

-- 6) Private storage read policy for admins/team
insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', false)
on conflict (id) do nothing;

drop policy if exists "Admins can read request documents" on storage.objects;

create policy "Admins can read request documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-documents'
  and public.current_user_is_admin_or_team()
);

notify pgrst, 'reload schema';
