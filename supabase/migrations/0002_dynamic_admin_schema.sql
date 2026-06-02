-- SSH KPI Platform - Dynamic admin/management schema (Prompt 2)
-- -----------------------------------------------------------------------------
-- IMPORTANT / ÖNEMLİ:
-- Bu migration ADDITIVE'tir. Mevcut `profiles` ve varsa `brands` tablolarını
-- KIRMAZ. Tüm tablolar `create table if not exists`, tüm policy'ler
-- `drop policy if exists` + `create policy` ile idempotent yazılmıştır.
-- 0001_profiles_rls_example.sql içindeki yardımcı fonksiyonlara dayanır:
--   public.current_user_is_active()
--   public.current_user_is_admin_or_superadmin()
--   public.current_user_is_superadmin()
--   public.set_updated_at()
-- Production'a uygulamadan önce mevcut Supabase şemasıyla karşılaştırın.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 1) kpi_categories
-- =============================================================================
create table if not exists public.kpi_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  short_name text,
  description text,
  color text not null default '#64748b',
  sort_order int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint kpi_categories_key_check check (key in ('musteri','ticari','operasyonel','bayi','kapsam'))
);

comment on table public.kpi_categories is 'Super Admin yönetimli KPI kategori tanımları. Yoksa app config.ts fallback kullanır.';

-- =============================================================================
-- 2) kpi_definitions
-- =============================================================================
create table if not exists public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  no int not null unique,
  name text not null,
  short_name text,
  description text,
  category_key text not null references public.kpi_categories(key) on update cascade,
  is_active boolean not null default true,
  direction text not null default 'higher_is_better',
  data_type text not null default 'index',
  coverage_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint kpi_definitions_direction_check check (direction in ('higher_is_better','lower_is_better')),
  constraint kpi_definitions_data_type_check check (data_type in ('index','ratio','currency','duration','count'))
);

comment on table public.kpi_definitions is 'Super Admin yönetimli KPI tanımları. Silme yerine is_active=false kullanılır.';

-- =============================================================================
-- 3) kpi_methodology_versions
-- =============================================================================
create table if not exists public.kpi_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  effective_date date not null default current_date,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kpi_methodology_versions is 'Skor metodolojisi versiyonları. Aktif tek versiyon dashboard skorlarını belirler.';

-- =============================================================================
-- 4) kpi_category_weights
-- =============================================================================
create table if not exists public.kpi_category_weights (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.kpi_methodology_versions(id) on delete cascade,
  category_key text not null references public.kpi_categories(key) on update cascade,
  weight numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint kpi_category_weights_range_check check (weight >= 0 and weight <= 100),
  constraint kpi_category_weights_unique unique (methodology_version_id, category_key)
);

comment on table public.kpi_category_weights is 'Versiyon başına kategori ağırlıkları (yüzde). Bir versiyonun toplamı 100 olmalıdır (app katmanında doğrulanır).';

-- =============================================================================
-- 5) brands  (additive: tablo zaten varsa sadece eksik kolonlar eklenir)
-- =============================================================================
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  segment text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.brands add column if not exists is_hidden boolean not null default false;
alter table public.brands add column if not exists data_source text not null default 'fallback';
alter table public.brands add column if not exists updated_at timestamptz not null default now();

comment on column public.brands.is_hidden is 'Gizlilik kuralı: 1-3 marka görünürken maskeleme uygulanır.';
comment on column public.brands.data_source is 'fallback | import — marka skorunun kaynağı.';

-- =============================================================================
-- 6) user_data_permissions
-- =============================================================================
create table if not exists public.user_data_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  allowed_segments text[] not null default '{}',
  allowed_brand_ids uuid[] not null default '{}',
  allowed_regions text[] not null default '{}',
  can_download_reports boolean not null default true,
  can_import_data boolean not null default false,
  can_access_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_data_permissions is 'Kullanıcı bazlı segment/marka/bölge görünürlük kısıtları. Boş dizi = rol bazlı varsayılan davranış.';

-- =============================================================================
-- 7) data_import_batches
-- =============================================================================
create table if not exists public.data_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_type text not null default 'csv',
  status text not null default 'pending',
  total_rows int not null default 0,
  valid_rows int not null default 0,
  error_rows int not null default 0,
  warning_count int not null default 0,
  is_active boolean not null default false,
  imported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  imported_at timestamptz,

  constraint data_import_batches_status_check check (status in ('pending','validated','imported','failed')),
  constraint data_import_batches_file_type_check check (file_type in ('csv','xlsx','json'))
);

comment on table public.data_import_batches is 'Her import işleminin kaydı. is_active=true olan batch dashboard verisini besler.';

-- =============================================================================
-- 8) kpi_fact_rows  (import edilen ham veri — dinamik KPI motorunun kaynağı)
-- =============================================================================
create table if not exists public.kpi_fact_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.data_import_batches(id) on delete cascade,
  segment text,
  region text,
  age_group text,
  period text,
  brand_id uuid references public.brands(id) on delete set null,
  kpi_no int,
  kpi_value numeric,
  work_order_count numeric,
  service_count numeric,
  created_at timestamptz not null default now()
);

create index if not exists kpi_fact_rows_batch_idx on public.kpi_fact_rows(batch_id);
create index if not exists kpi_fact_rows_lookup_idx on public.kpi_fact_rows(period, segment, region, kpi_no);

comment on table public.kpi_fact_rows is 'Import edilen satır bazlı KPI verisi. Aktif batch yoksa app lib/kpi_data.json fallback kullanır.';

-- =============================================================================
-- 9) audit_logs
-- =============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  summary text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

comment on table public.audit_logs is 'Super Admin işlemlerinin denetim kaydı.';

-- =============================================================================
-- updated_at trigger'ları (0001 içindeki set_updated_at fonksiyonunu kullanır)
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'kpi_categories','kpi_definitions','kpi_methodology_versions',
    'kpi_category_weights','brands','user_data_permissions','data_import_batches'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.kpi_categories          enable row level security;
alter table public.kpi_definitions          enable row level security;
alter table public.kpi_methodology_versions enable row level security;
alter table public.kpi_category_weights     enable row level security;
alter table public.brands                   enable row level security;
alter table public.user_data_permissions    enable row level security;
alter table public.data_import_batches      enable row level security;
alter table public.kpi_fact_rows            enable row level security;
alter table public.audit_logs               enable row level security;

-- --- Okuma: kimlik doğrulanmış aktif kullanıcılar referans tablolarını okuyabilir
-- (dashboard'un kategori/KPI/marka adlarını göstermesi için gereklidir).
drop policy if exists "kpi_categories_select_active" on public.kpi_categories;
create policy "kpi_categories_select_active" on public.kpi_categories
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "kpi_definitions_select_active" on public.kpi_definitions;
create policy "kpi_definitions_select_active" on public.kpi_definitions
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "brands_select_active" on public.brands;
create policy "brands_select_active" on public.brands
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "weights_select_active" on public.kpi_category_weights;
create policy "weights_select_active" on public.kpi_category_weights
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "methodology_select_active" on public.kpi_methodology_versions;
create policy "methodology_select_active" on public.kpi_methodology_versions
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "fact_rows_select_active" on public.kpi_fact_rows;
create policy "fact_rows_select_active" on public.kpi_fact_rows
  for select to authenticated using (public.current_user_is_active() = true);

drop policy if exists "import_batches_select_active" on public.data_import_batches;
create policy "import_batches_select_active" on public.data_import_batches
  for select to authenticated using (public.current_user_is_active() = true);

-- --- Yazma (management tabloları): yalnızca aktif superadmin
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'kpi_categories','kpi_definitions','kpi_methodology_versions',
    'kpi_category_weights','brands','data_import_batches','kpi_fact_rows'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_write_superadmin', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_user_is_superadmin()) with check (public.current_user_is_superadmin())',
      tbl || '_write_superadmin', tbl
    );
  end loop;
end $$;

-- --- user_data_permissions: kullanıcı kendi kaydını okur; superadmin tümünü yönetir
drop policy if exists "user_permissions_select_own" on public.user_data_permissions;
create policy "user_permissions_select_own" on public.user_data_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_is_superadmin());

drop policy if exists "user_permissions_write_superadmin" on public.user_data_permissions;
create policy "user_permissions_write_superadmin" on public.user_data_permissions
  for all to authenticated
  using (public.current_user_is_superadmin())
  with check (public.current_user_is_superadmin());

-- --- audit_logs: superadmin okur; aktif admin/superadmin yazabilir
drop policy if exists "audit_logs_select_superadmin" on public.audit_logs;
create policy "audit_logs_select_superadmin" on public.audit_logs
  for select to authenticated using (public.current_user_is_superadmin());

drop policy if exists "audit_logs_insert_admin" on public.audit_logs;
create policy "audit_logs_insert_admin" on public.audit_logs
  for insert to authenticated with check (public.current_user_is_admin_or_superadmin());

-- =============================================================================
-- SEED (idempotent) — mevcut config.ts değerlerini DB'ye taşır.
-- Böylece yönetim ekranları "Config fallback" yerine "Supabase kaynaklı" olur.
-- =============================================================================

-- Kategoriler
insert into public.kpi_categories (key, name, short_name, color, sort_order) values
  ('musteri',     'Müşteri Sadakati ve Deneyimi',           'Müşteri',           '#10b981', 1),
  ('ticari',      'Finansal Verimlilik ve Rasyo Analizi',   'Ticari',            '#3b82f6', 2),
  ('operasyonel', 'Süreç ve Operasyonel Akış',              'Operasyonel',       '#f59e0b', 3),
  ('bayi',        'Bayi Ağı Kapasite Yönetimi',             'Bayi Ağı',          '#8b5cf6', 4),
  ('kapsam',      'Stratejik Kapsam Dağılımı',              'Stratejik Kapsam',  '#ef4444', 5)
on conflict (key) do nothing;

-- KPI tanımları (1-12)
insert into public.kpi_definitions (no, name, short_name, category_key, direction, data_type) values
  (1,  'Aktif Müşteri Bazı Endeksi',    'KPI 1',  'musteri',     'higher_is_better', 'index'),
  (2,  'Müşteri Tutundurma Endeksi',    'KPI 2',  'musteri',     'higher_is_better', 'index'),
  (3,  'Servis Kullanım Endeksi',       'KPI 3',  'musteri',     'higher_is_better', 'index'),
  (4,  'İş Emri Başına İşçilik Saati',  'KPI 4',  'ticari',      'lower_is_better',  'duration'),
  (5,  'İş Emri Başına İşçilik Tutarı', 'KPI 5',  'ticari',      'higher_is_better', 'currency'),
  (6,  'İş Emri Başına Parça Tutarı',   'KPI 6',  'ticari',      'higher_is_better', 'currency'),
  (7,  'İş Emri Süresi Endeksi',        'KPI 7',  'operasyonel', 'lower_is_better',  'index'),
  (8,  'İş Emri Hacim Endeksi',         'KPI 8',  'operasyonel', 'higher_is_better', 'index'),
  (9,  'Servis Başına İş Emri',         'KPI 9',  'bayi',        'higher_is_better', 'index'),
  (10, 'Servis Başına Aktif Müşteri',   'KPI 10', 'bayi',        'higher_is_better', 'index'),
  (11, 'Garanti Kapsam Endeksi',        'KPI 11', 'kapsam',      'higher_is_better', 'index'),
  (12, 'Periyodik Bakım Endeksi',       'KPI 12', 'kapsam',      'higher_is_better', 'index')
on conflict (no) do nothing;

-- Başlangıç metodoloji versiyonu + ağırlıkları (toplam = 100)
do $$
declare
  v_id uuid;
begin
  select id into v_id from public.kpi_methodology_versions where name = 'v1 — Baseline' limit 1;

  if v_id is null then
    insert into public.kpi_methodology_versions (name, description, is_active)
    values ('v1 — Baseline', 'config.ts üzerinden taşınan başlangıç ağırlıkları.', true)
    returning id into v_id;

    insert into public.kpi_category_weights (methodology_version_id, category_key, weight) values
      (v_id, 'musteri',     25),
      (v_id, 'ticari',      25),
      (v_id, 'operasyonel', 25),
      (v_id, 'bayi',        15),
      (v_id, 'kapsam',      10)
    on conflict (methodology_version_id, category_key) do nothing;
  end if;
end $$;
