import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta {
  no: number
  ad: string
  kat: string
  fmt: string
  is_lower_better?: boolean
}

export const KPI_META: KpiMeta[]    = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]     = RAW.bolgeler as string[]
export const SEGMENTLER: string[]   = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[] = RAW.yas_gruplari as string[]
export const DONEMLER: string[]     = RAW.donemler as string[]
export const CAT_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']
export const SEGMENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

type CubeRow  = [string, string, string, string, (number|null)[], number, number]
type MarkaRow = [string, string, string, string, (number|null)[], number]

const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]
const MARKA_CUBE: MarkaRow[] = (MARKA_RAW.cube ?? []) as MarkaRow[]

// ── Fonksiyonlar ──────────────────────────────────────────────

export function getKpisFromCube(seg: string, bolge: string, yas: string, donem: string) {
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem)
  return row ? row[4] : KPI_META.map(() => null)
}

export function getN(seg: string, bolge: string, yas: string, donem: string) {
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem)
  return row ? row[5] : 0
}

export function getSegmentColor(seg: string) {
  const idx = SEGMENTLER.indexOf(seg)
  return idx !== -1 ? SEGMENT_COLORS[idx % SEGMENT_COLORS.length] : '#64748b'
}

export function getAvailableDonemler(seg = '', bolge = '', yas = 'Tümü'): Set<string> {
  const available = new Set<string>()
  for (const r of CUBE) {
    if (r[0] === seg && r[1] === bolge && r[2] === yas) {
      if (r[3]) available.add(r[3])
    }
  }
  return available
}

export function getMarkaRanking(seg: string, bolge: string, yas: string, donem: string) {
  return MARKA_CUBE
    .filter(r => r[1] === seg && r[2] === bolge && r[3] === yas && r[4] === donem)
    .map(r => ({ marka: r[0], segment: r[1] }))
}

export const getKpiScores = (seg: string, bolge: string, yas: string, donem: string): number[] => {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)
  return rawKpis.map((val: any, i: number) => {
    const ref = trKpis[i]
    if (val === null || ref === null || ref === 0) return 100
    return Math.round((val / ref) * 100)
  })
}

export const isLowerBetter = (no: number) => KPI_META.find(k => k.no === no)?.is_lower_better ?? false
export const fmtKpi = (v: any, f: string) => v === null ? '—' : (f === '%' ? `${v.toFixed(1)}%` : v.toLocaleString())
export const kpiScoreColor = (s: number) => s >= 100 ? '#10b981' : s >= 90 ? '#f59e0b' : '#ef4444'
export const kpiScoreBg = (s: number) => s >= 100 ? 'rgba(16,185,129,.15)' : s >= 90 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)'
export const chgColor = (val: number) => val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#64748b'
export const chgBg = (val: number) => val > 0 ? 'rgba(16,185,129,.15)' : val < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'
