-- Phase 3B customer messaging for existing Globalflowa Phase 3A projects.
-- Apply this migration by itself to the live database. Do not re-run schema.sql on live.

create extension if not exists "pgcrypto";

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

create index if not exists idx_customer_messages_request_id on public.customer_messages(request_id);
create index if not exists idx_customer_messages_sent_to_email on public.customer_messages(sent_to_email);
create index if not exists idx_customer_messages_created_at on public.customer_messages(created_at);

alter table public.customer_messages enable row level security;

revoke all on public.customer_messages from anon, authenticated;
grant select, insert, update on public.customer_messages to authenticated;

-- Keep the Phase 3B policy self-contained for Phase 3A databases whose merged
-- migration may still contain the older current_user_* helper names.
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

drop policy if exists "Admins can read customer messages" on public.customer_messages;
drop policy if exists "Admins can insert customer messages" on public.customer_messages;
drop policy if exists "Admins can update customer messages" on public.customer_messages;
drop policy if exists "Customers can read own visible messages" on public.customer_messages;

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

notify pgrst, 'reload schema';
