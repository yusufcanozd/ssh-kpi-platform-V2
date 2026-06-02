-- Prompt 2 / Prompt 4 hazırlığı: Super Admin dinamik yönetim şeması
-- Additive migration: mevcut production tablolarını değiştirmez.

create table if not exists public.kpi_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  short_name text not null,
  description text,
  color text not null default '#64748b',
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  kpi_no integer not null unique check (kpi_no > 0),
  name text not null,
  short_name text not null,
  description text,
  category_key text references public.kpi_categories(key),
  is_active boolean not null default true,
  direction text not null default 'higher_is_better' check (direction in ('higher_is_better', 'lower_is_better')),
  data_type text not null default 'index' check (data_type in ('index', 'ratio', 'currency', 'duration', 'count', 'percentage')),
  coverage_rule text not null default 'included' check (coverage_rule in ('included', 'excluded_zero_variance', 'optional', 'required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  effective_from date not null,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.kpi_category_weights (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid references public.kpi_methodology_versions(id),
  category_key text references public.kpi_categories(key),
  weight_percent numeric(5,2) not null check (weight_percent >= 0 and weight_percent <= 100),
  created_at timestamptz not null default now(),
  unique (methodology_version_id, category_key)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  segment text not null,
  is_confidential boolean not null default false,
  is_active boolean not null default true,
  data_source_status text not null default 'fallback',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_data_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  allowed_segments text[] not null default '{}',
  allowed_brand_ids uuid[] not null default '{}',
  allowed_regions text[] not null default '{}',
  can_download_reports boolean not null default false,
  can_import_data boolean not null default false,
  can_access_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.data_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_type text not null check (file_type in ('xlsx', 'csv', 'json')),
  status text not null default 'draft' check (status in ('draft', 'validated', 'imported', 'failed', 'archived')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  warning_count integer not null default 0,
  imported_by uuid references public.profiles(id),
  imported_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.kpi_fact_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.data_import_batches(id) on delete cascade,
  segment text,
  region text,
  age_group text,
  period text,
  brand_id uuid references public.brands(id),
  brand_name text,
  kpi_values jsonb not null default '{}'::jsonb,
  work_order_count numeric,
  service_count numeric,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id text,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.kpi_categories enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.kpi_methodology_versions enable row level security;
alter table public.kpi_category_weights enable row level security;
alter table public.brands enable row level security;
alter table public.user_data_permissions enable row level security;
alter table public.data_import_batches enable row level security;
alter table public.kpi_fact_rows enable row level security;
alter table public.audit_logs enable row level security;

-- RLS notu:
-- Superadmin yönetim tablolarında tam yetkili olmalıdır.
-- Analyst/viewer yalnızca izin verilen segment/marka/bölge verilerini okuyabilmelidir.
-- Uygulamaya özel helper fonksiyonları production Supabase projesinde doğrulandıktan sonra policy'ler aktif edilmelidir.
