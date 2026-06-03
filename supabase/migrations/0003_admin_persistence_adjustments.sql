-- SSH KPI Platform - Admin persistence adjustments (Prompt 4 persistence)
-- -----------------------------------------------------------------------------
-- Additive/uyum düzeltmeleri. 0002 sonrası çalıştırılır. Idempotent.
-- Amaç: yönetim ekranlarının (KPI/kategori ekleme-çıkarma) DB'ye yazabilmesi.
-- -----------------------------------------------------------------------------

-- 1) Uygulama kodu kpi_no bekliyor; 0002 kolonu "no" olarak oluşturmuştu. Hizala.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kpi_definitions' and column_name = 'no'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kpi_definitions' and column_name = 'kpi_no'
  ) then
    alter table public.kpi_definitions rename column "no" to kpi_no;
  end if;
end $$;

-- 2) Yeni kategori eklenebilsin diye sabit-5-anahtar kısıtını kaldır.
alter table public.kpi_categories drop constraint if exists kpi_categories_key_check;

-- 3) 'percentage' veri tipine izin ver (UI'da seçenek olarak var).
alter table public.kpi_definitions drop constraint if exists kpi_definitions_data_type_check;
alter table public.kpi_definitions add constraint kpi_definitions_data_type_check
  check (data_type in ('index','ratio','currency','duration','count','percentage'));
