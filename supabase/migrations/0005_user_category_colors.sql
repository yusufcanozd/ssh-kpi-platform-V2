-- P12: Kullanıcı bazında kategori renk override'ları
create table if not exists public.user_category_colors (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category_key)
);

alter table public.user_category_colors enable row level security;

create policy "Users can read their own category colors"
  on public.user_category_colors
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own category colors"
  on public.user_category_colors
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own category colors"
  on public.user_category_colors
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own category colors"
  on public.user_category_colors
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_category_colors_updated_at on public.user_category_colors;
create trigger set_user_category_colors_updated_at
before update on public.user_category_colors
for each row
execute function public.set_updated_at();
