// ── Kullanıcı & Auth ─────────────────────────────────────────
export type UserRole = 'superadmin' | 'admin' | 'analyst' | 'viewer'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  brand_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  brands?: Brand
}

// ── Marka ────────────────────────────────────────────────────
export type Segment = 'Premium' | 'Mass' | 'EV'

export interface Brand {
  id: string
  code: string
  name: string
  segment: Segment
  is_active: boolean
  created_at: string
}

// ── Coğrafi ──────────────────────────────────────────────────
export interface Region {
  id: string
  name: string
}

export interface Province {
  id: string
  name: string
  region_id: string
  regions?: Region
}

// ── Servis ───────────────────────────────────────────────────
export interface ServiceCenter {
  id: string
  brand_id: string
  province_id: string
  code: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  brands?: Brand
  provinces?: Province
}

// ── Dönem ────────────────────────────────────────────────────
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface Period {
  id: string
  year: number
  quarter: Quarter
  start_date: string
  end_date: string
  is_locked: boolean
}

// ── KPI ──────────────────────────────────────────────────────
export type VehicleAgeGroup = '0-3' | '3-7' | '7+' | 'ALL'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface KpiSubmission {
  id: string
  brand_id: string
  service_center_id: string | null
  period_id: string
  vehicle_age_group: VehicleAgeGroup
  work_order_duration: number | null
  work_order_volume: number | null
  active_customer_base: number | null
  labor_hours_per_wo: number | null
  customer_retention: number | null
  service_usage: number | null
  periodic_maintenance: number | null
  wo_per_service: number | null
  customer_per_service: number | null
  parts_revenue_per_cust: number | null
  warranty_coverage: number | null
  status: SubmissionStatus
  submitted_by: string | null
  approved_by: string | null
  submitted_at: string
  approved_at: string | null
  notes: string | null
  brands?: Brand
  periods?: Period
  service_centers?: ServiceCenter
}

export interface KpiScore {
  id: string
  brand_id: string
  period_id: string
  region_id: string | null
  vehicle_age_group: VehicleAgeGroup
  segment: string
  idx_work_order_duration: number | null
  idx_work_order_volume: number | null
  idx_active_customer_base: number | null
  idx_labor_hours_per_wo: number | null
  idx_customer_retention: number | null   // ⚠ Kısıtlı
  idx_service_usage: number | null
  idx_periodic_maintenance: number | null
  idx_wo_per_service: number | null
  idx_customer_per_service: number | null
  idx_parts_revenue_per_cust: number | null // ⚠ Kısıtlı
  idx_warranty_coverage: number | null      // ⚠ Kısıtlı
  score_operational: number | null
  score_customer: number | null
  score_service_capacity: number | null
  score_coverage: number | null
  score_overall: number | null
  participant_count: number | null
  is_masked: boolean
  computed_at: string
  brands?: Brand
  regions?: Region
  periods?: Period
}

// ── KPI Konfigürasyonu ────────────────────────────────────────
export type KpiCompliance = 'no_ranking' | null

export interface KpiConfig {
  key: string
  name: string
  category: 'operational' | 'customer' | 'service' | 'coverage'
  weight: number
  compliance: KpiCompliance
}

export const KPI_CONFIG: KpiConfig[] = [
  { key: 'idx_work_order_duration',    name: 'İş Emri Süresi',        category: 'operational', weight: 0.105, compliance: null },
  { key: 'idx_work_order_volume',      name: 'İş Emri Hacim',          category: 'operational', weight: 0.105, compliance: null },
  { key: 'idx_active_customer_base',   name: 'Aktif Müşteri Bazı',     category: 'operational', weight: 0.140, compliance: null },
  { key: 'idx_labor_hours_per_wo',     name: 'İşçilik Saati/İE',       category: 'customer',    weight: 0.105, compliance: null },
  { key: 'idx_customer_retention',     name: 'Müşteri Tutundurma',     category: 'customer',    weight: 0.105, compliance: 'no_ranking' },
  { key: 'idx_service_usage',          name: 'Servis Kullanım',        category: 'customer',    weight: 0.090, compliance: null },
  { key: 'idx_periodic_maintenance',   name: 'Periyodik Bakım',        category: 'service',     weight: 0.080, compliance: null },
  { key: 'idx_wo_per_service',         name: 'Servis Başına İE',       category: 'service',     weight: 0.070, compliance: null },
  { key: 'idx_customer_per_service',   name: 'Servis Başına Müşteri',  category: 'service',     weight: 0.050, compliance: null },
  { key: 'idx_parts_revenue_per_cust', name: 'Müşteri Başına Parça',   category: 'coverage',    weight: 0.075, compliance: 'no_ranking' },
  { key: 'idx_warranty_coverage',      name: 'Garanti Kapsam',         category: 'coverage',    weight: 0.075, compliance: 'no_ranking' },
]

export const CAT_WEIGHTS = {
  operational: 0.35,
  customer:    0.30,
  service:     0.20,
  coverage:    0.15,
} as const

export const CAT_LABELS = {
  operational: 'Operasyonel Verimlilik',
  customer:    'Müşteri Kalitesi',
  service:     'Servis Kapasitesi',
  coverage:    'Kapsam & Değer',
} as const

// ── Filtreler ─────────────────────────────────────────────────
export interface DashboardFilters {
  region_id: string
  segment: string
  year: string
  quarter: string
}

// ── Admin İstatistikleri ──────────────────────────────────────
export interface AdminStats {
  total_brands: number
  total_services: number
  pending_submissions: number
  total_users: number
}
