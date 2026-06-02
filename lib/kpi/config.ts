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

export const KPI_DISPLAY_NAMES: Record<number, string> = {
  1: 'Aktif Müşteri Bazı Endeksi',
  2: 'Müşteri Tutundurma Endeksi',
  3: 'Servis Kullanım Endeksi',
  4: 'İş Emri Başına İşçilik Saati',
  5: 'İş Emri Başına İşçilik Tutarı',
  6: 'İş Emri Başına Parça Tutarı',
  7: 'İş Emri Süresi Endeksi',
  8: 'İş Emri Hacim Endeksi',
  9: 'Servis Başına İş Emri',
  10: 'Servis Başına Aktif Müşteri',
  11: 'Garanti Kapsam Endeksi',
  12: 'Periyodik Bakım Endeksi',
}

export const CATEGORY_DISPLAY_NAMES: Record<CategoryKey, string> = {
  musteri: 'Müşteri Sadakati ve Deneyimi',
  ticari: 'Finansal Verimlilik ve Rasyo Analizi',
  operasyonel: 'Süreç ve Operasyonel Akış',
  bayi: 'Bayi Ağı Kapasite Yönetimi',
  kapsam: 'Stratejik Kapsam Dağılımı',
}

export const CATEGORY_SHORT_NAMES: Record<CategoryKey, string> = {
  musteri: 'Müşteri',
  ticari: 'Ticari',
  operasyonel: 'Operasyonel',
  bayi: 'Bayi Ağı',
  kapsam: 'Stratejik Kapsam',
}

export const RAW_CATEGORY_TO_KEY: Record<string, CategoryKey> = {
  'Müşteri': 'musteri',
  'Müşteri Sadakati ve Deneyimi': 'musteri',
  'Ticari': 'ticari',
  'Finansal Verimlilik ve Rasyo Analizi': 'ticari',
  'Operasyonel': 'operasyonel',
  'Süreç ve Operasyonel Akış': 'operasyonel',
  'Bayi': 'bayi',
  'Bayi Ağı': 'bayi',
  'Bayi Ağı Kapasite Yönetimi': 'bayi',
  'Kapsam': 'kapsam',
  'Stratejik Kapsam': 'kapsam',
  'Stratejik Kapsam Dağılımı': 'kapsam',
}

function standardizeKpiMeta(meta: KpiMeta): KpiMeta {
  const categoryKey = RAW_CATEGORY_TO_KEY[meta.kat]
  return {
    ...meta,
    ad: KPI_DISPLAY_NAMES[meta.no] ?? meta.ad,
    kat: categoryKey ? CATEGORY_DISPLAY_NAMES[categoryKey] : meta.kat,
  }
}

export const KPI_META: KpiMeta[] = (rawData.kpi_meta ?? []).map(standardizeKpiMeta)

export function getCategoryDisplayName(keyOrName: CategoryKey | string): string {
  const key = RAW_CATEGORY_TO_KEY[keyOrName] ?? (keyOrName as CategoryKey)
  return CATEGORY_DISPLAY_NAMES[key as CategoryKey] ?? keyOrName
}

export function getCategoryShortName(keyOrName: CategoryKey | string): string {
  const key = RAW_CATEGORY_TO_KEY[keyOrName] ?? (keyOrName as CategoryKey)
  return CATEGORY_SHORT_NAMES[key as CategoryKey] ?? keyOrName
}

export function getKpiDisplayName(kpiNoOrIndex: number): string {
  const no = kpiNoOrIndex >= 1 && KPI_DISPLAY_NAMES[kpiNoOrIndex] ? kpiNoOrIndex : kpiNoOrIndex + 1
  return KPI_DISPLAY_NAMES[no] ?? KPI_META[no - 1]?.ad ?? `KPI ${no}`
}

export function getKpiIndexesForCategory(categoryKeyOrName: CategoryKey | string): number[] {
  const key = RAW_CATEGORY_TO_KEY[categoryKeyOrName] ?? (categoryKeyOrName as CategoryKey)
  const category = KAT_YAPILAR.find(cat => cat.key === key)
  return category ? [...category.kpis] : []
}

export function getKpisForCategory(categoryKeyOrName: CategoryKey | string): Array<KpiMeta & { i: number }> {
  const indexes = new Set(getKpiIndexesForCategory(categoryKeyOrName))
  return KPI_META.map((kpi, i) => ({ ...kpi, i })).filter(kpi => indexes.has(kpi.i))
}
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
  { key: 'musteri', ad: CATEGORY_DISPLAY_NAMES.musteri, agirlik: 0.25, kpis: [0, 1, 2] },
  { key: 'ticari', ad: CATEGORY_DISPLAY_NAMES.ticari, agirlik: 0.25, kpis: [3, 4, 5] },
  { key: 'operasyonel', ad: CATEGORY_DISPLAY_NAMES.operasyonel, agirlik: 0.25, kpis: [6, 7] },
  { key: 'bayi', ad: CATEGORY_DISPLAY_NAMES.bayi, agirlik: 0.15, kpis: [8, 9] },
  { key: 'kapsam', ad: CATEGORY_DISPLAY_NAMES.kapsam, agirlik: 0.10, kpis: [10, 11] },
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
  'Stratejik Kapsam': '#ef4444',
}

export const CATEGORY_OPTIONS = KAT_YAPILAR.map(cat => ({
  key: cat.key,
  label: cat.ad,
  shortLabel: CATEGORY_SHORT_NAMES[cat.key],
  color: CAT_COLORS[cat.ad],
  agirlik: cat.agirlik,
  kpis: cat.kpis,
}))

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
