// lib/kpi/config.ts
// KPI metadata, kategori yapısı ve renk konfigürasyonu.
// Dışa bağımlılığı yoktur — bu dosya hiçbir kpi/* dosyasını import etmez.

import RAW from '../kpi_data.json'

const rawData = RAW as any

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
  value: number           // normalize skor (0-200); eksik veri → 100 (nötr)
  isDefault: boolean      // veri yoktu, nötr 100 atandı — ESKİ uyumluluk
  rawVal: number | null
  refVal: number | null
}

// Genişletilmiş KPI detay — kapsama ve kalite bilgisi dahil
export interface KpiScoreDetailFull {
  kpiIdx:               number          // 0-bazlı KPI index
  kpiNo:                number          // 1-bazlı KPI no (kpi_meta.no)
  score:                number          // normalize skor (0-200); eksik → undefined, hesaba dahil değil
  rawValue:             number | null   // ham segment değeri
  referenceValue:       number | null   // ham referans (TR genel) değeri
  isMissing:            boolean         // segment verisi yok
  isReferenceMissing:   boolean         // referans verisi yok
  isLowerBetter:        boolean         // düşük daha iyi mi?
  isCapped:             boolean         // skor 200 tavanına çarptı mı?
  coverageIncluded:     boolean         // bu KPI kategori ortalamasına dahil edildi mi?
}

// Kategori detay — hangi KPI'lar dahil edildi, hangisi eksik
export interface KatScoreDetail {
  key:               string
  ad:                string
  agirlik:           number
  score:             number             // kategori skoru (sadece geçerli KPI'lardan)
  validKpiCount:     number             // geçerli (veri olan) KPI sayısı
  totalKpiCount:     number             // toplam KPI sayısı bu kategoride
  missingKpiIdxs:    number[]           // eksik KPI'ların index listesi
}

// Tam detaylı skor — getScoreDetailed tarafından döner
export interface SegmentScoreDetailed {
  genel:             number
  musteri:           number
  ticari:            number
  operasyonel:       number
  bayi:              number
  kapsam:            number
  coverageRatio:     number             // geçerli KPI sayısı / toplam KPI sayısı (0-1)
  availableKpiCount: number             // veri olan KPI sayısı
  totalKpiCount:     number             // toplam KPI sayısı (12)
  missingKpis:       number[]           // eksik KPI index listesi
  detailedKpis:      KpiScoreDetailFull[]
  categories:        KatScoreDetail[]
}

// ─────────────────────────────────────────────────────────────
// KPI ve Boyut Metadata
// ─────────────────────────────────────────────────────────────
export const KPI_META:    KpiMeta[]             = rawData.kpi_meta    as KpiMeta[]
export const BOLGELER:    string[]              = rawData.bolgeler    as string[]
export const SEGMENTLER:  string[]              = rawData.segmentler  as string[]
export const YAS_GRUPLARI: string[]             = rawData.yas_gruplari as string[]
export const DONEMLER:    string[]              = rawData.donemler    as string[]
export const YAS_STATS:   Record<string,number> = rawData.yas_stats   ?? {}
export const TOTAL_IO:    number                = rawData.total_io    ?? 0
export const TOTAL_SERVIS: number               = rawData.total_servis ?? 0

// ─────────────────────────────────────────────────────────────
// Kategori Yapısı — V5 Matrisi (indeksler 0-bazlı)
// musteri:     KPI 1,2,3   → idx 0,1,2
// ticari:      KPI 4,5,6   → idx 3,4,5
// operasyonel: KPI 7,8     → idx 6,7
// bayi:        KPI 9,10    → idx 8,9
// kapsam:      KPI 11,12   → idx 10,11
// ─────────────────────────────────────────────────────────────
export const KAT_YAPILAR = [
  { key: 'musteri',     ad: 'Müşteri Sadakati ve Deneyimi',        agirlik: 0.25, kpis: [0,1,2]   },
  { key: 'ticari',      ad: 'Finansal Verimlilik ve Rasyo Analizi', agirlik: 0.25, kpis: [3,4,5]   },
  { key: 'operasyonel', ad: 'Süreç ve Operasyonel Akış',           agirlik: 0.25, kpis: [6,7]     },
  { key: 'bayi',        ad: 'Bayi Ağı Kapasite Yönetimi',          agirlik: 0.15, kpis: [8,9]     },
  { key: 'kapsam',      ad: 'Stratejik Kapsam Dağılımı',           agirlik: 0.10, kpis: [10,11]   },
] as const

// ─────────────────────────────────────────────────────────────
// Renk Sabitleri
// ─────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full  = clean.length === 3 ? clean.split('').map(c => c+c).join('') : clean
  const val   = parseInt(full, 16)
  return `rgba(${(val>>16)&255},${(val>>8)&255},${val&255},${alpha})`
}

export const CAT_COLORS: Record<string,string> = {
  'Müşteri Sadakati ve Deneyimi':        '#10b981',
  'Finansal Verimlilik ve Rasyo Analizi':'#3b82f6',
  'Süreç ve Operasyonel Akış':           '#f59e0b',
  'Bayi Ağı Kapasite Yönetimi':          '#8b5cf6',
  'Stratejik Kapsam Dağılımı':           '#ef4444',
  'Müşteri':    '#10b981',
  'Ticari':     '#3b82f6',
  'Operasyonel':'#f59e0b',
  'Bayi Ağı':   '#8b5cf6',
  'Kapsam':     '#ef4444',
}

export const SEGMENT_HEX: Record<string,string> = {
  Mass:    '#3b82f6',
  Premium: '#8b5cf6',
  EV:      '#10b981',
  '':      '#fbbf24',
}
export const SEGMENT_COLORS  = SEGMENT_HEX
export const SEGMENT_BG: Record<string,string> = Object.fromEntries(
  Object.entries(SEGMENT_HEX).map(([k,v]) => [k, `${v}18`])
)
export const SEGMENT_HEX_BG: Record<string,string> = Object.fromEntries(
  Object.entries(SEGMENT_HEX).map(([k,v]) => [k, hexToRgba(v, 0.25)])
)
export const SEGMENT_BORDER: Record<string,string> = SEGMENT_HEX
export const BOLGE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']
export const YAS_COLORS: Record<string,string> = {
  'Tümü': '#64748b', '0-3': '#10b981', '3-7': '#f59e0b', '7+': '#ef4444',
}
