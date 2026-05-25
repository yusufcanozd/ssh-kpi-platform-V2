import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ve Sabitler ──────────────────────────────────────────
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
export const YAS_STATS              = RAW.yas_stats as Record<string,number>
export const TOTAL_IO: number       = RAW.total_io as number
export const TOTAL_SERVIS: number   = RAW.total_servis as number

// Renk ve Stil Sabitleri
export const SEGMENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']
export const SEGMENT_BG = ['#eff6ff', '#f5f3ff', '#ecfdf5']
export const SEGMENT_HEX = ['#3b82f6', '#8b5cf6', '#10b981']
export const SEGMENT_HEX_BG = ['rgba(59,130,246,0.1)', 'rgba(139,92,246,0.1)', 'rgba(16,185,129,0.1)']
export const YAS_COLORS = ['#f59e0b', '#ef4444', '#3b82f6']

type CubeRow  = [string, string, string, string, (number|null)[], number, number]
const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]

// ── Temel Fonksiyonlar ──────────────────────────────────────────
export function getKpisFromCube(seg: string, bolge: string, yas: string, donem: string): (number|null)[] {
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem)
  return row ? row[4] : KPI_META.map(() => null)
}

export function isLowerBetter(kpiNo: number) {
  return KPI_META.find(k => k.no === kpiNo)?.is_lower_better ?? false
}

export function fmtKpi(val: number | null, fmt: string) {
  if (val === null) return '—'
  if (fmt === '%') return `${val.toFixed(1)}%`
  return val.toLocaleString()
}

export function kpiUnit(kpiNo: number) {
  return KPI_META.find(k => k.no === kpiNo)?.fmt ?? ''
}

// ── NORMALİZASYON: Performans Skoru Hesaplayıcı ────────────────
export function getKpiScores(seg: string, bolge: string, yas: string, donem: string): number[] {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)

  return rawKpis.map((val, i) => {
    const ref = trKpis[i]
    if (val === null || ref === null || ref === 0) return 100
    return Math.round((val / ref) * 100)
  })
}

// ── Renk ve Skor Yardımcıları ──────────────────────────────────
export function kpiScoreColor(score: number): string {
  if (score >= 100) return '#10b981'
  if (score >= 90) return '#f59e0b'
  return '#ef4444'
}

export function kpiScoreBg(score: number): string {
  if (score >= 100) return 'rgba(16,185,129,.15)'
  if (score >= 90) return 'rgba(245,158,11,.15)'
  return 'rgba(239,68,68,.15)'
}

export const scoreColor = kpiScoreColor
export const scoreBg = kpiScoreBg
export const heatColor = kpiScoreColor
export const chgColor = (val: number) => val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#64748b'
export const chgBg = (val: number) => val > 0 ? 'rgba(16,185,129,.15)' : val < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'

// ── Marka ve Diğer Fonksiyonlar ────────────────────────────────
export function getMarkaRanking(seg: string, bolge: string, yas: string, donem: string) {
  return (MARKA_RAW.cube as any[]).map(r => ({ marka: r[0], segment: r[1] }))
}

export function getScore(val: number, ref: number, isLowerBetter: boolean) {
  if (!ref) return 100
  const score = (val / ref) * 100
  return isLowerBetter ? (200 - score) : score
}
