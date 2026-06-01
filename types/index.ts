// ── Kullanıcı & Auth ─────────────────────────────────────────
export type UserRole = 'superadmin' | 'admin' | 'analyst' | 'viewer'

export interface Profile {
  id: string
  email?: string | null
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

// ── KPI V5 Tipleri: 12 KPI / 5 Kategori ─────────────────────
export type VehicleAgeGroup = '0-3' | '3-7' | '7+' | 'Tümü' | 'ALL'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export type KpiCategoryKey = 'musteri' | 'ticari' | 'operasyonel' | 'bayi' | 'kapsam'

export type KpiDirection = 'higher_is_better' | 'lower_is_better'

export interface KpiMeta {
  no: number
  ad: string
  kat: string
  fmt: string
  is_lower_better: boolean
}

export interface KpiCategoryDefinition {
  key: KpiCategoryKey
  ad: string
  agirlik: number
  /** 0-bazlı KPI index listesi */
  kpis: readonly number[]
}

export interface SegmentScore {
  genel: number
  musteri: number
  ticari: number
  operasyonel: number
  bayi: number
  kapsam: number
}

export type CategoryScores = Pick<SegmentScore, KpiCategoryKey>

export interface KpiScoreDetail {
  /** Normalize skor: 0-200. Geriye dönük uyumda eksik veri 100 dönebilir. */
  value: number
  /** Eksik/geçersiz veri nedeniyle nötr 100 kullanıldı mı? */
  isDefault: boolean
  rawVal: number | null
  refVal: number | null
}

export interface KpiScoreDetailFull {
  /** 0-bazlı KPI index */
  kpiIdx: number
  /** 1-bazlı KPI numarası */
  kpiNo: number
  /** Normalize skor: 0-200 */
  score: number
  rawValue: number | null
  referenceValue: number | null
  isMissing: boolean
  isReferenceMissing: boolean
  isLowerBetter: boolean
  isCapped: boolean
  /** Kategori/genel skor ortalamasına dahil edildi mi? */
  coverageIncluded: boolean
}

export interface KatScoreDetail {
  key: KpiCategoryKey
  ad: string
  agirlik: number
  score: number
  validKpiCount: number
  totalKpiCount: number
  /** Eksik KPI'ların 0-bazlı index listesi */
  missingKpiIdxs: number[]
}

export interface SegmentScoreDetailed extends SegmentScore {
  coverageRatio: number
  availableKpiCount: number
  totalKpiCount: number
  /** Eksik KPI'ların 0-bazlı index listesi */
  missingKpis: number[]
  detailedKpis: KpiScoreDetailFull[]
  categories: KatScoreDetail[]
}

export interface MarkaScore {
  marka: string
  segment: string
  score: number
}

// ── Ham KPI kayıtları / Submission ───────────────────────────
export interface KpiSubmission {
  id: string
  brand_id: string
  service_center_id: string | null
  period_id: string
  vehicle_age_group: VehicleAgeGroup

  /** KPI 1 - Aktif Müşteri Bazı Endeksi */
  active_customer_base: number | null
  /** KPI 2 - Müşteri Tutundurma Endeksi */
  customer_retention: number | null
  /** KPI 3 - Servis Kullanım Endeksi */
  service_usage: number | null
  /** KPI 4 - İE Başına İşçilik Saati; düşük daha iyi */
  labor_hours_per_wo: number | null
  /** KPI 5 - İE Başına İşçilik Tutarı */
  labor_revenue_per_wo?: number | null
  /** KPI 6 - İE Başına Parça Tutarı */
  parts_revenue_per_wo?: number | null
  /** KPI 7 - İş Emri Süresi Endeksi; düşük daha iyi */
  work_order_duration: number | null
  /** KPI 8 - İş Emri Hacim Endeksi */
  work_order_volume: number | null
  /** KPI 9 - Servis Başına İş Emri */
  wo_per_service: number | null
  /** KPI 10 - Servis Başına Aktif Müşteri */
  customer_per_service: number | null
  /** KPI 11 - Garanti Kapsam Endeksi */
  warranty_coverage: number | null
  /** KPI 12 - Periyodik Bakım Endeksi */
  periodic_maintenance: number | null

  status: SubmissionStatus
  submitted_by: string | null
  approved_by: string | null
  submitted_at: string
  approved_at: string | null
  notes: string | null
  brands?: Brand
  periods?: Period
  service_centers?: ServiceCenter

  /** @deprecated Eski 11 KPI yapısından kalma alan. Yeni kodda parts_revenue_per_wo kullanılmalı. */
  parts_revenue_per_cust?: number | null
}

export interface KpiScore {
  id: string
  brand_id: string
  period_id: string
  region_id: string | null
  vehicle_age_group: VehicleAgeGroup
  segment: string

  // 12 KPI normalize skor alanları
  idx_active_customer_base: number | null
  idx_customer_retention: number | null
  idx_service_usage: number | null
  idx_labor_hours_per_wo: number | null
  idx_labor_revenue_per_wo?: number | null
  idx_parts_revenue_per_wo?: number | null
  idx_work_order_duration: number | null
  idx_work_order_volume: number | null
  idx_wo_per_service: number | null
  idx_customer_per_service: number | null
  idx_warranty_coverage: number | null
  idx_periodic_maintenance: number | null

  // 5 kategori + genel skor
  score_overall: number | null
  score_musteri: number | null
  score_ticari: number | null
  score_operasyonel: number | null
  score_bayi: number | null
  score_kapsam: number | null

  coverage_ratio?: number | null
  available_kpi_count?: number | null
  total_kpi_count?: number | null
  participant_count: number | null
  is_masked: boolean
  computed_at: string
  brands?: Brand
  regions?: Region
  periods?: Period

  /** @deprecated Eski kategori adı. Yeni kodda score_operasyonel kullanılmalı. */
  score_operational?: number | null
  /** @deprecated Eski kategori adı. Yeni kodda score_musteri kullanılmalı. */
  score_customer?: number | null
  /** @deprecated Eski kategori adı. Yeni kodda score_bayi kullanılmalı. */
  score_service_capacity?: number | null
  /** @deprecated Eski kategori adı. Yeni kodda score_kapsam kullanılmalı. */
  score_coverage?: number | null
  /** @deprecated Eski KPI alanı. Yeni kodda idx_parts_revenue_per_wo kullanılmalı. */
  idx_parts_revenue_per_cust?: number | null
}

// ── KPI Konfigürasyonu ───────────────────────────────────────
export type KpiCompliance = 'no_ranking' | null

export interface KpiConfig {
  key: string
  name: string
  category: KpiCategoryKey
  weight: number
  compliance: KpiCompliance
  is_lower_better: boolean
}

export const KPI_CONFIG: KpiConfig[] = [
  { key: 'idx_active_customer_base',   name: 'Aktif Müşteri Bazı Endeksi', category: 'musteri',     weight: 1 / 3, compliance: null, is_lower_better: false },
  { key: 'idx_customer_retention',     name: 'Müşteri Tutundurma Endeksi', category: 'musteri',     weight: 1 / 3, compliance: null, is_lower_better: false },
  { key: 'idx_service_usage',          name: 'Servis Kullanım Endeksi',    category: 'musteri',     weight: 1 / 3, compliance: null, is_lower_better: false },
  { key: 'idx_labor_hours_per_wo',     name: 'İE Başına İşçilik Saati',    category: 'ticari',      weight: 1 / 3, compliance: null, is_lower_better: true  },
  { key: 'idx_labor_revenue_per_wo',   name: 'İE Başına İşçilik Tutarı',   category: 'ticari',      weight: 1 / 3, compliance: null, is_lower_better: false },
  { key: 'idx_parts_revenue_per_wo',   name: 'İE Başına Parça Tutarı',     category: 'ticari',      weight: 1 / 3, compliance: null, is_lower_better: false },
  { key: 'idx_work_order_duration',    name: 'İş Emri Süresi Endeksi',     category: 'operasyonel', weight: 1 / 2, compliance: null, is_lower_better: true  },
  { key: 'idx_work_order_volume',      name: 'İş Emri Hacim Endeksi',      category: 'operasyonel', weight: 1 / 2, compliance: null, is_lower_better: false },
  { key: 'idx_wo_per_service',         name: 'Servis Başına İş Emri',      category: 'bayi',        weight: 1 / 2, compliance: null, is_lower_better: false },
  { key: 'idx_customer_per_service',   name: 'Servis Başına Aktif Müşteri', category: 'bayi',       weight: 1 / 2, compliance: null, is_lower_better: false },
  { key: 'idx_warranty_coverage',      name: 'Garanti Kapsam Endeksi',     category: 'kapsam',      weight: 1 / 2, compliance: null, is_lower_better: false },
  { key: 'idx_periodic_maintenance',   name: 'Periyodik Bakım Endeksi',    category: 'kapsam',      weight: 1 / 2, compliance: null, is_lower_better: false },
]

export const CAT_WEIGHTS: Record<KpiCategoryKey, number> = {
  musteri: 0.25,
  ticari: 0.25,
  operasyonel: 0.25,
  bayi: 0.15,
  kapsam: 0.10,
}

export const CAT_LABELS: Record<KpiCategoryKey, string> = {
  musteri: 'Müşteri Sadakati ve Deneyimi',
  ticari: 'Finansal Verimlilik ve Rasyo Analizi',
  operasyonel: 'Süreç ve Operasyonel Akış',
  bayi: 'Bayi Ağı Kapasite Yönetimi',
  kapsam: 'Stratejik Kapsam Dağılımı',
}

/**
 * @deprecated Eski 4 kategori yapısı. Yeni kodda KpiCategoryKey, CAT_WEIGHTS ve CAT_LABELS kullanılmalı.
 */
export type LegacyKpiCategoryKey = 'operational' | 'customer' | 'service' | 'coverage'

/**
 * @deprecated Eski kategori ağırlıkları. Yeni kodda CAT_WEIGHTS kullanılmalı.
 */
export const LEGACY_CAT_WEIGHTS: Record<LegacyKpiCategoryKey, number> = {
  operational: 0.35,
  customer: 0.30,
  service: 0.20,
  coverage: 0.15,
}

/**
 * @deprecated Eski kategori etiketleri. Yeni kodda CAT_LABELS kullanılmalı.
 */
export const LEGACY_CAT_LABELS: Record<LegacyKpiCategoryKey, string> = {
  operational: 'Operasyonel Verimlilik',
  customer: 'Müşteri Kalitesi',
  service: 'Servis Kapasitesi',
  coverage: 'Kapsam & Değer',
}

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
