-- SSH KPI Platform - Segment yönetimi tablosu (Prompt 6 eki)
-- Additive, idempotent. 0001 yardımcı fonksiyonlarına dayanır.

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null default '#64748b',
  sort_order int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.segments is 'Yönetilebilir segment tanımları. Marka formundaki segment seçenekleri buradan beslenir.';

drop trigger if exists segments_set_updated_at on public.segments;
create trigger segments_set_updated_at
before update on public.segments
for each row execute function public.set_updated_at();

alter table public.segments enable row level security;

drop policy if exists "segments_select_active" on public.segments;
create policy "segments_select_active" on public.segments
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "segments_write_superadmin" on public.segments;
create policy "segments_write_superadmin" on public.segments
  for all to authenticated
  using (public.current_user_is_superadmin())
  with check (public.current_user_is_superadmin());

-- Mevcut segmentleri seed et (idempotent).
insert into public.segments (code, name, color, sort_order) values
  ('Premium', 'Premium', '#8b5cf6', 1),
  ('Mass',    'Mass',    '#3b82f6', 2),
  ('EV',      'EV',      '#10b981', 3)
on conflict (code) do nothing;
