-- P17 — Özet rapor / AI yorum önbelleği
-- Aynı kullanıcı + aynı rapor parametreleri + aynı veri/metodoloji/kısıt imzası için
-- Claude API çağrısını tekrar etmeden kayıtlı sonucu döndürmek için kullanılır.

create table if not exists public.report_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null unique,
  params jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_cache_user_created
  on public.report_cache(user_id, created_at desc);

create index if not exists idx_report_cache_params_gin
  on public.report_cache using gin(params);

alter table public.report_cache enable row level security;

drop policy if exists "report_cache_select_own" on public.report_cache;
create policy "report_cache_select_own"
  on public.report_cache
  for select
  using (auth.uid() = user_id);

drop policy if exists "report_cache_insert_own" on public.report_cache;
create policy "report_cache_insert_own"
  on public.report_cache
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "report_cache_update_own" on public.report_cache;
create policy "report_cache_update_own"
  on public.report_cache
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "report_cache_delete_own" on public.report_cache;
create policy "report_cache_delete_own"
  on public.report_cache
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_report_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_report_cache_updated_at on public.report_cache;
create trigger trg_report_cache_updated_at
  before update on public.report_cache
  for each row
  execute function public.set_report_cache_updated_at();
