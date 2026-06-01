-- SSH KPI Platform - Profiles table and RLS policy examples
-- -----------------------------------------------------------------------------
-- IMPORTANT:
-- This migration is intended as a controlled example/template.
-- Review it against your existing Supabase schema before running in production.
-- If a profiles table already exists, adapt the ALTER TABLE statements instead
-- of applying this file blindly.
-- -----------------------------------------------------------------------------

-- Optional helper extension for updated_at trigger support if needed elsewhere.
-- create extension if not exists moddatetime schema extensions;

-- 1) profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_role_check check (role in ('viewer', 'analyst', 'admin', 'superadmin'))
);

comment on table public.profiles is 'Application user profile and authorization metadata for SSH KPI Platform.';
comment on column public.profiles.role is 'Allowed values: viewer, analyst, admin, superadmin.';
comment on column public.profiles.is_active is 'Inactive users are blocked from protected application operations.';

-- 2) updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 3) helper functions for RLS checks
-- These functions avoid repeating subqueries inside policies.
-- SECURITY DEFINER is used so policy checks can read profiles safely.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_active, false)
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_is_admin_or_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'superadmin')
     and public.current_user_is_active() = true;
$$;

create or replace function public.current_user_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'superadmin'
     and public.current_user_is_active() = true;
$$;

-- 4) enable RLS
alter table public.profiles enable row level security;

-- 5) policies
-- Users can read their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Admin and superadmin users can read all profiles.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.current_user_is_admin_or_superadmin());

-- Users can update their own non-privileged fields only if they are active.
-- Note: This policy alone does not prevent changing role/is_active if the client
-- sends those columns. Prefer using dedicated server-side APIs for profile updates.
-- In production, consider column-level privileges or RPCs for stricter control.
drop policy if exists "profiles_update_own_basic" on public.profiles;
create policy "profiles_update_own_basic"
on public.profiles
for update
to authenticated
using (id = auth.uid() and public.current_user_is_active() = true)
with check (id = auth.uid() and public.current_user_is_active() = true);

-- Only active superadmin users can update any profile, including role/is_active.
drop policy if exists "profiles_update_superadmin" on public.profiles;
create policy "profiles_update_superadmin"
on public.profiles
for update
to authenticated
using (public.current_user_is_superadmin())
with check (public.current_user_is_superadmin());

-- Optional: only superadmin can insert profiles manually.
-- If profiles are created automatically by a trigger on auth.users, adapt this.
drop policy if exists "profiles_insert_superadmin" on public.profiles;
create policy "profiles_insert_superadmin"
on public.profiles
for insert
to authenticated
with check (public.current_user_is_superadmin());

-- Optional: only superadmin can delete profiles.
drop policy if exists "profiles_delete_superadmin" on public.profiles;
create policy "profiles_delete_superadmin"
on public.profiles
for delete
to authenticated
using (public.current_user_is_superadmin());

-- 6) optional profile creation trigger for new auth users
-- Review before enabling. If your app creates profiles manually, leave disabled.
/*
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'viewer',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
*/
