// lib/kpi/config.ts
// KPI metadata, kategori yapısı ve renk konfigürasyonu.
// Strict mode hazırlığı: JSON importları `any` yerine daraltılmış raw tiplerle okunur.

import RAW from '../kpi_data.json'

// ─────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────
export interface KpiMeta {
  no: number
  ad: string
  kat: string
  fmt: string
  is_lower_better?: boolean
}

export type CategoryKey = 'musteri' | 'ticari' | 'operasyonel' | 'bayi' | 'kapsam'

export interface SegmentScore {
  genel: number
  musteri: number
  ticari: number
  operasyonel: number
  bayi: number
  kapsam: number
}

export interface MarkaScore {
  marka: string
  segment: string
  score: number
}

export interface KpiScoreDetail {
  value: number
  isDefault: boolean
  rawVal: number | null
  refVal: number | null
}

export interface KpiScoreDetailFull {
  kpiIdx: number
  kpiNo: number
  score: number
  rawValue: number | null
  referenceValue: number | null
  isMissing: boolean
  isReferenceMissing: boolean
  isLowerBetter: boolean
  isCapped: boolean
  coverageIncluded: boolean
}

export interface KatScoreDetail {
  key: CategoryKey | string
  ad: string
  agirlik: number
  score: number
  validKpiCount: number
  totalKpiCount: number
  missingKpiIdxs: number[]
}

export interface SegmentScoreDetailed extends SegmentScore {
  coverageRatio: number
  availableKpiCount: number
  totalKpiCount: number
  missingKpis: number[]
  detailedKpis: KpiScoreDetailFull[]
  categories: KatScoreDetail[]
}

export interface CategoryConfig {
  key: CategoryKey
  ad: string
  agirlik: number
  kpis: readonly number[]
}

type KpiRawData = {
  kpi_meta?: KpiMeta[]
  bolgeler?: string[]
  segmentler?: string[]
  yas_gruplari?: string[]
  donemler?: string[]
  yas_stats?: Record<string, number>
  total_io?: number
  total_servis?: number
}

const rawData = RAW as unknown as KpiRawData

// ─────────────────────────────────────────────────────────────
// KPI ve Boyut Metadata
// ─────────────────────────────────────────────────────────────
export const KPI_META: KpiMeta[] = rawData.kpi_meta ?? []
export const BOLGELER: string[] = rawData.bolgeler ?? []
export const SEGMENTLER: string[] = rawData.segmentler ?? []
export const YAS_GRUPLARI: string[] = rawData.yas_gruplari ?? []
export const DONEMLER: string[] = rawData.donemler ?? []
export const YAS_STATS: Record<string, number> = rawData.yas_stats ?? {}
export const TOTAL_IO: number = rawData.total_io ?? 0
export const TOTAL_SERVIS: number = rawData.total_servis ?? 0

// ─────────────────────────────────────────────────────────────
// Kategori Yapısı — V5 Matrisi (indeksler 0-bazlı)
// ─────────────────────────────────────────────────────────────
export const KAT_YAPILAR = [
  { key: 'musteri', ad: 'Müşteri Sadakati ve Deneyimi', agirlik: 0.25, kpis: [0, 1, 2] },
  { key: 'ticari', ad: 'Finansal Verimlilik ve Rasyo Analizi', agirlik: 0.25, kpis: [3, 4, 5] },
  { key: 'operasyonel', ad: 'Süreç ve Operasyonel Akış', agirlik: 0.25, kpis: [6, 7] },
  { key: 'bayi', ad: 'Bayi Ağı Kapasite Yönetimi', agirlik: 0.15, kpis: [8, 9] },
  { key: 'kapsam', ad: 'Stratejik Kapsam Dağılımı', agirlik: 0.10, kpis: [10, 11] },
] as const satisfies readonly CategoryConfig[]

// ─────────────────────────────────────────────────────────────
// Renk Sabitleri
// ─────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const val = parseInt(full, 16)

  return `rgba(${(val >> 16) & 255},${(val >> 8) & 255},${val & 255},${alpha})`
}

export const CAT_COLORS: Record<string, string> = {
  'Müşteri Sadakati ve Deneyimi': '#10b981',
  'Finansal Verimlilik ve Rasyo Analizi': '#3b82f6',
  'Süreç ve Operasyonel Akış': '#f59e0b',
  'Bayi Ağı Kapasite Yönetimi': '#8b5cf6',
  'Stratejik Kapsam Dağılımı': '#ef4444',

  // Eski/kısa kategori adlarıyla geriye dönük uyumluluk
  'Müşteri': '#10b981',
  'Ticari': '#3b82f6',
  'Operasyonel': '#f59e0b',
  'Bayi Ağı': '#8b5cf6',
  'Kapsam': '#ef4444',
}

export const SEGMENT_HEX: Record<string, string> = {
  Mass: '#3b82f6',
  Premium: '#8b5cf6',
  EV: '#10b981',
  '': '#fbbf24',
}

export const SEGMENT_COLORS = SEGMENT_HEX

export const SEGMENT_BG: Record<string, string> = Object.fromEntries(
  Object.entries(SEGMENT_HEX).map(([k, v]) => [k, `${v}18`])
)

export const SEGMENT_HEX_BG: Record<string, string> = Object.fromEntries(
  Object.entries(SEGMENT_HEX).map(([k, v]) => [k, hexToRgba(v, 0.25)])
)

export const SEGMENT_BORDER: Record<string, string> = SEGMENT_HEX

export const BOLGE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
]

export const YAS_COLORS: Record<string, string> = {
  'Tümü': '#64748b',
  '0-3': '#10b981',
  '3-7': '#f59e0b',
  '7+': '#ef4444',
}
