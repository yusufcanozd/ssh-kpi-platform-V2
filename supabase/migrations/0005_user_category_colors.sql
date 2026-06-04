-- 0005 — Kullanıcı bazlı kategori rengi override (kişisel tercih).
-- Her kullanıcı yalnızca kendi satırlarını görür/yazar (RLS). set_updated_at() 0001'den gelir.

create table if not exists public.user_category_colors (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category_key)
);

comment on table public.user_category_colors is 'Kullanıcı bazlı kategori rengi override; yoksa varsayılan kategori rengi kullanılır.';

alter table public.user_category_colors enable row level security;

drop policy if exists "ucc_select_own" on public.user_category_colors;
create policy "ucc_select_own" on public.user_category_colors
  for select using (auth.uid() = user_id);

drop policy if exists "ucc_insert_own" on public.user_category_colors;
create policy "ucc_insert_own" on public.user_category_colors
  for insert with check (auth.uid() = user_id);

drop policy if exists "ucc_update_own" on public.user_category_colors;
create policy "ucc_update_own" on public.user_category_colors
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ucc_delete_own" on public.user_category_colors;
create policy "ucc_delete_own" on public.user_category_colors
  for delete using (auth.uid() = user_id);

drop trigger if exists user_category_colors_set_updated_at on public.user_category_colors;
create trigger user_category_colors_set_updated_at
  before update on public.user_category_colors
  for each row execute function public.set_updated_at();
