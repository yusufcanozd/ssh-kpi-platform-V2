import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Sabitler ──────────────────────────────────────────────────
export const KPI_META = RAW.kpi_meta as any[]
export const SEGMENTLER = RAW.segmentler as string[]
export const BOLGELER = RAW.bolgeler as string[]
export const DONEMLER = RAW.donemler as string[]
export const YAS_GRUPLARI = RAW.yas_gruplari as string[]
export const CAT_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']
export const SEGMENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']
export const SEGMENT_BG = ['rgba(59,130,246,0.1)', 'rgba(139,92,246,0.1)', 'rgba(16,185,129,0.1)']
export const SEGMENT_HEX = ['#3b82f6', '#8b5cf6', '#10b981']
export const SEGMENT_HEX_BG = ['rgba(59,130,246,0.1)', 'rgba(139,92,246,0.1)', 'rgba(16,185,129,0.1)']

const CUBE = (RAW.cube ?? []) as any[]

// ── Temel Veri Çekme Fonksiyonları ──────────────────────────────
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
    if (r[0] !== seg || r[1] !== bolge || r[2] !== yas) continue
    const donem = r[3]
    if (donem && (r[4] as (number | null)[]).some(v => v !== null && v !== 0)) {
      available.add(donem)
    }
  }
  return available
}

// ── Skorlama ve Formatlama ──────────────────────────────────────
export const getKpiScores = (seg: string, bolge: string, yas: string, donem: string): number[] => {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)
  return rawKpis.map((val: any, i: number) => {
    const ref = trKpis[i]
    if (val === null || ref === null || ref === 0) return 100
    return Math.round((val / ref) * 100)
  })
}

export const getKpiScoresDetailed = (seg: string, bolge: string, yas: string, donem: string) => getKpiScores(seg, bolge, yas, donem)
export const isLowerBetter = (no: number) => KPI_META.find(k => k.no === no)?.is_lower_better ?? false
export const fmtKpi = (v: any, f: string) => v === null ? '—' : (f === '%' ? `${v.toFixed(1)}%` : v.toLocaleString())
export const getScore = (val: number, ref: number, lower: boolean) => !ref ? 100 : (val / ref) * 100
export const getMarkaRanking = (seg: string, bolge: string, yas: string, donem: string) => 
  (MARKA_RAW.cube as any[]).map(r => ({ marka: r[0], segment: r[1] }))

// ── Stil Yardımcıları ──────────────────────────────────────────
export const kpiScoreColor = (s: number) => s >= 100 ? '#10b981' : s >= 90 ? '#f59e0b' : '#ef4444'
export const kpiScoreBg = (s: number) => s >= 100 ? 'rgba(16,185,129,.15)' : s >= 90 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)'
export const chgColor = (val: number) => val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#64748b'
export const chgBg = (val: number) => val > 0 ? 'rgba(16,185,129,.15)' : val < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'
