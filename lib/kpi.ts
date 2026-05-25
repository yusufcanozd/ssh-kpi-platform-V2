import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Temel Tanımlar ─────────────────────────────────────────────
export const KPI_META = RAW.kpi_meta as any[]
export const BOLGELER = RAW.bolgeler as string[]
export const SEGMENTLER = RAW.segmentler as string[]
export const YAS_GRUPLARI = RAW.yas_gruplari as string[]
export const DONEMLER = RAW.donemler as string[]
export const YAS_STATS = RAW.yas_stats as Record<string, number>
export const TOTAL_IO = RAW.total_io as number
export const TOTAL_SERVIS = RAW.total_servis as number

// ── Renk ve Stil Sabitleri ─────────────────────────────────────
export const CAT_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']
export const SEGMENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']
export const SEGMENT_HEX = ['#3b82f6', '#8b5cf6', '#10b981']
export const SEGMENT_BG = ['rgba(59,130,246,0.1)', 'rgba(139,92,246,0.1)', 'rgba(16,185,129,0.1)']
export const YAS_COLORS = ['#f59e0b', '#3b82f6', '#ef4444'] // DashboardClient için

// ── Fonksiyonlar ──────────────────────────────────────────────
export const isLowerBetter = (no: number) => KPI_META.find(k => k.no === no)?.is_lower_better ?? false
export const kpiUnit = (no: number) => KPI_META.find(k => k.no === no)?.fmt ?? ''

export const fmtKpi = (v: any, f: string) => v === null ? '—' : (f === '%' ? `${v.toFixed(1)}%` : v.toLocaleString())

export const getScore = (val: number, ref: number, lower: boolean) => !ref ? 100 : (val / ref) * 100
export const scoreColor = (s: number) => s >= 100 ? '#10b981' : s >= 90 ? '#f59e0b' : '#ef4444'
export const scoreBg = (s: number) => s >= 100 ? 'rgba(16,185,129,.15)' : s >= 90 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)'

export const chgColor = (val: number) => val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#64748b'
export const chgBg = (val: number) => val > 0 ? 'rgba(16,185,129,.15)' : val < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'
export const heatColor = (val: number) => val > 0.5 ? '#10b981' : '#ef4444'

// ── Veri Çekme ────────────────────────────────────────────────
type CubeRow = [string, string, string, string, (number|null)[], number, number]
const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]

export function getAvailableDonemler(seg = '', bolge = '', yas = 'Tümü'): Set<string> {
  const available = new Set<string>()
  for (const r of CUBE) {
    if (r[0] === seg && r[1] === bolge && r[2] === yas) {
      if (r[3] && (r[4] as any[]).some(v => v !== null)) available.add(r[3])
    }
  }
  return available
}
