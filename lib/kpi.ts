import KPI_RAW from './kpi_data.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta { no: number; ad: string; kat: string; fmt: string }

export interface MarkaKpi {
  marka: string; segment: string
  servis_count: number; io_count: number
  kpis_by_yas: Record<string, number[] | null>
}
export interface BolgeKpi {
  bolge: string; io_count: number
  kpis_by_yas: Record<string, number[] | null>
}
export interface SegmentKpi {
  segment: string; marka_count: number
  kpis_by_yas: Record<string, number[] | null>
}
export interface BolgeSegmentKpi {
  bolge: string; segment: string
  kpis_by_yas: Record<string, number[] | null>
}

export const KPI_META: KpiMeta[]              = KPI_RAW.kpi_meta as KpiMeta[]
export const MARKA_KPIS: MarkaKpi[]           = KPI_RAW.markalar as MarkaKpi[]
export const BOLGE_KPIS: BolgeKpi[]           = KPI_RAW.bolgeler as BolgeKpi[]
export const SEGMENT_KPIS: SegmentKpi[]       = KPI_RAW.segmentler as SegmentKpi[]
export const BOLGE_SEG_KPIS: BolgeSegmentKpi[]= KPI_RAW.bolge_segment as BolgeSegmentKpi[]
export const YAS_GRUPLARI: string[]           = KPI_RAW.yas_gruplari as string[]
export const YAS_STATS: Record<string,number> = KPI_RAW.yas_stats as Record<string,number>

// ── Yardımcı: yaş grubuna göre KPI dizisi al ─────────────────
export function getKpis(obj: { kpis_by_yas: Record<string, number[] | null> }, yas: string): number[] {
  return obj.kpis_by_yas[yas] ?? Array(12).fill(0)
}

// ── Renkler ───────────────────────────────────────────────────
export const SEGMENT_COLORS: Record<string, string> = {
  Premium: '#8b5cf6', Mass: '#3b82f6', EV: '#10b981',
}
export const SEGMENT_BG: Record<string, string> = {
  Premium: 'rgba(139,92,246,.35)', Mass: 'rgba(59,130,246,.35)', EV: 'rgba(16,185,129,.35)',
}
export const CAT_COLORS: Record<string, string> = {
  'Müşteri': '#10b981', 'Ticari': '#3b82f6', 'Operasyonel': '#f59e0b',
  'Bayi Ağı': '#8b5cf6', 'Kapsam': '#ef4444',
}
export const YAS_COLORS: Record<string, string> = {
  '0-3': '#10b981', '3-7': '#3b82f6', '7+': '#f59e0b', 'Tümü': '#8496b0',
}

// ── Format ────────────────────────────────────────────────────
export function fmtKpi(val: number | null | undefined, fmt: string): string {
  if (val === null || val === undefined || isNaN(val as number)) return '—'
  const v = val as number
  switch (fmt) {
    case 'pct4':   return `${(v * 100).toFixed(2)}%`
    case 'pct2':   return `${(v * 100).toFixed(1)}%`
    case 'ratio2': return v.toFixed(2)
    case 'ratio1': return v.toFixed(1)
    case 'saat1':  return `${v.toFixed(1)} sa`
    case 'tl0':    return `₺${Math.round(v).toLocaleString('tr-TR')}`
    case 'gun1':   return `${v.toFixed(1)} gün`
    case 'int':    return Math.round(v).toLocaleString('tr-TR')
    default:       return v.toFixed(1)
  }
}

export function fmt(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(v as number)) return '—'
  return Number(v).toFixed(dec)
}

// ── Isı haritası rengi ────────────────────────────────────────
export function heatColor(val: number, segAvg: number, higherIsBetter = true): { bg: string; color: string } {
  if (!segAvg) return { bg: 'rgba(77,96,112,.1)', color: '#4d6070' }
  const ratio = higherIsBetter ? val / segAvg : segAvg / val
  if (ratio >= 1.15) return { bg: 'rgba(16,185,129,.18)',  color: '#10b981' }
  if (ratio >= 1.05) return { bg: 'rgba(59,130,246,.14)',  color: '#60a5fa' }
  if (ratio >= 0.95) return { bg: 'rgba(245,158,11,.12)',  color: '#fbbf24' }
  return               { bg: 'rgba(239,68,68,.14)',   color: '#f87171' }
}

export function isLowerBetter(kpiIdx: number): boolean { return kpiIdx === 6 }

export function scoreColor(v: number | null): string {
  if (!v) return '#4d6070'
  if (v >= 80) return '#10b981'
  if (v >= 70) return '#3b82f6'
  if (v >= 60) return '#f59e0b'
  return '#ef4444'
}

// ── Segment ortalaması ────────────────────────────────────────
export function segmentAvg(segment: string, kpiIdx: number, yas = 'Tümü'): number {
  const s = SEGMENT_KPIS.find(x => x.segment === segment)
  if (!s) return 0
  const kpis = getKpis(s, yas)
  return kpis[kpiIdx] ?? 0
}

// ── Normalize skor (0-100) ─────────────────────────────────────
export function normalizedScore(marka: MarkaKpi, kpiIdx: number, yas = 'Tümü'): number {
  const kpis = getKpis(marka, yas)
  const val  = kpis[kpiIdx]
  const avg  = segmentAvg(marka.segment, kpiIdx, yas)
  if (!avg || !val) return 50
  const lob   = isLowerBetter(kpiIdx)
  const ratio = lob ? avg / val : val / avg
  return Math.min(100, Math.max(0, Math.round(ratio * 70)))
}

export function overallScore(marka: MarkaKpi, yas = 'Tümü'): number {
  const idxList = [0,1,2,3,4,5,6,8,9,10,11]
  const scores  = idxList.map(i => normalizedScore(marka, i, yas))
  return Math.round(scores.reduce((a,b) => a+b, 0) / scores.length)
}
