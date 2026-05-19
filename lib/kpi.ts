import KPI_RAW from './kpi_data.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta {
  no: number; ad: string; kat: string; fmt: string
}
export interface MarkaKpi {
  marka: string; segment: string; kpis: number[]
  servis_count: number; io_count: number
}
export interface BolgeKpi {
  bolge: string; kpis: number[]; io_count: number
}
export interface SegmentKpi {
  segment: string; kpis: number[]; marka_count: number
}
export interface BolgeSegmentKpi {
  bolge: string; segment: string; kpis: number[]
}

export const KPI_META: KpiMeta[]          = KPI_RAW.kpi_meta as KpiMeta[]
export const MARKA_KPIS: MarkaKpi[]       = KPI_RAW.markalar as MarkaKpi[]
export const BOLGE_KPIS: BolgeKpi[]       = KPI_RAW.bolgeler as BolgeKpi[]
export const SEGMENT_KPIS: SegmentKpi[]   = KPI_RAW.segmentler as SegmentKpi[]
export const BOLGE_SEG_KPIS: BolgeSegmentKpi[] = KPI_RAW.bolge_segment as BolgeSegmentKpi[]

// ── Segment renkleri ──────────────────────────────────────────
export const SEGMENT_COLORS: Record<string, string> = {
  Premium: '#8b5cf6',
  Mass:    '#3b82f6',
  EV:      '#10b981',
}
export const SEGMENT_BG: Record<string, string> = {
  Premium: 'rgba(139,92,246,.35)',
  Mass:    'rgba(59,130,246,.35)',
  EV:      'rgba(16,185,129,.35)',
}
export const CAT_COLORS: Record<string, string> = {
  'Müşteri':    '#10b981',
  'Ticari':     '#3b82f6',
  'Operasyonel':'#f59e0b',
  'Bayi Ağı':   '#8b5cf6',
  'Kapsam':     '#ef4444',
}

// ── Format fonksiyonları ──────────────────────────────────────
export function fmtKpi(val: number, fmt: string): string {
  if (val === null || val === undefined) return '—'
  switch (fmt) {
    case 'pct4':  return `${(val * 100).toFixed(2)}%`
    case 'pct2':  return `${(val * 100).toFixed(1)}%`
    case 'ratio2': return val.toFixed(2)
    case 'ratio1': return val.toFixed(1)
    case 'saat1': return `${val.toFixed(1)} sa`
    case 'tl0':   return `₺${Math.round(val).toLocaleString('tr-TR')}`
    case 'gun1':  return `${val.toFixed(1)} gün`
    case 'int':   return Math.round(val).toLocaleString('tr-TR')
    default:      return val.toFixed(1)
  }
}

export function fmt(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined) return '—'
  return Number(v).toFixed(dec)
}

// ── Isı haritası rengi (kpi bazlı normalize) ──────────────────
// Her KPI için değer aralığı farklı olduğundan segment ortalamalarına göre normalize et
export function heatColor(val: number, segAvg: number, higherIsBetter = true): {
  bg: string; color: string
} {
  if (!segAvg) return { bg: 'rgba(77,96,112,.1)', color: '#4d6070' }
  const ratio = val / segAvg
  // Düşük süre KPI için tersine çevir
  const r = higherIsBetter ? ratio : 2 - ratio

  if (r >= 1.15) return { bg: 'rgba(16,185,129,.18)', color: '#10b981' }   // çok iyi
  if (r >= 1.05) return { bg: 'rgba(59,130,246,.14)', color: '#60a5fa' }   // iyi
  if (r >= 0.95) return { bg: 'rgba(245,158,11,.12)', color: '#fbbf24' }   // ortalama
  return           { bg: 'rgba(239,68,68,.14)',  color: '#f87171' }         // düşük
}

// KPI7 (süre) için: düşük daha iyi
export function isLowerBetter(kpiIdx: number): boolean {
  return kpiIdx === 6 // KPI7 = index 6
}

// ── Skor rengi (eski uyumluluk) ───────────────────────────────
export function scoreColor(v: number | null): string {
  if (!v) return '#4d6070'
  if (v >= 80) return '#10b981'
  if (v >= 70) return '#3b82f6'
  if (v >= 60) return '#f59e0b'
  return '#ef4444'
}

export function scoreBg(v: number | null): string {
  if (!v) return 'rgba(77,96,112,.1)'
  if (v >= 80) return 'rgba(16,185,129,.15)'
  if (v >= 70) return 'rgba(59,130,246,.12)'
  if (v >= 60) return 'rgba(245,158,11,.15)'
  return 'rgba(239,68,68,.12)'
}

// ── Segment ortalaması al ─────────────────────────────────────
export function segmentAvg(segment: string, kpiIdx: number): number {
  const s = SEGMENT_KPIS.find(x => x.segment === segment)
  return s ? s.kpis[kpiIdx] : 0
}

// ── Tüm markalar için normalize edilmiş skor (0-100) ─────────
// Her KPI kendi segment ortalamasına göre normalize edilir
export function normalizedScore(marka: MarkaKpi, kpiIdx: number): number {
  const avg = segmentAvg(marka.segment, kpiIdx)
  if (!avg) return 50
  const lowerBetter = isLowerBetter(kpiIdx)
  const ratio = lowerBetter ? avg / marka.kpis[kpiIdx] : marka.kpis[kpiIdx] / avg
  return Math.min(100, Math.max(0, Math.round(ratio * 70)))
}

// Genel skor: tüm KPI'ların normalize ortalaması (KPI8 hariç hacim KPI)
export function overallScore(marka: MarkaKpi): number {
  const idxList = [0,1,2,3,4,5,6,8,9,10,11] // KPI8 (index 7) hariç
  const scores = idxList.map(i => normalizedScore(marka, i))
  return Math.round(scores.reduce((a,b)=>a+b,0) / scores.length)
}
