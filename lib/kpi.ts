import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Temel Tanımlar ─────────────────────────────────────────────
export const KPI_META = RAW.kpi_meta as any[]
export const SEGMENTLER = RAW.segmentler as string[]
export const BOLGELER = RAW.bolgeler as string[]
export const DONEMLER = RAW.donemler as string[]
export const YAS_GRUPLARI = RAW.yas_gruplari as string[]

type CubeRow = [string, string, string, string, (number|null)[], number, number]
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

export function getAvailableDonemler(seg = '', bolge = '', yas = 'Tümü'): Set<string> {
  const available = new Set<string>()
  CUBE.forEach(r => {
    if (r[0] === seg && r[1] === bolge && r[2] === yas && r[3]) available.add(r[3])
  })
  return available
}

export function getMarkaRanking(seg: string, bolge: string, yas: string, donem: string) {
  return MARKA_CUBE
    .filter(r => r[1] === seg && r[2] === bolge && r[3] === yas && r[4] === donem)
    .map(r => ({ marka: r[0], segment: r[1] }))
}

export function getKpiScores(seg: string, bolge: string, yas: string, donem: string): number[] {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)
  return rawKpis.map((val: any, i: number) => {
    const ref = trKpis[i]
    return (val === null || ref === null || ref === 0) ? 100 : Math.round((val / ref) * 100)
  })
}

export const kpiScoreColor = (s: number) => s >= 100 ? '#10b981' : s >= 90 ? '#f59e0b' : '#ef4444'
export const kpiScoreBg = (s: number) => s >= 100 ? 'rgba(16,185,129,.15)' : s >= 90 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)'
