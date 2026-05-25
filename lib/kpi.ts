import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Temel Sabitler ────────────────────────────────────────────
export const KPI_META = RAW.kpi_meta as any[]
export const SEGMENTLER = RAW.segmentler as string[]
export const DONEMLER = RAW.donemler as string[]

// Eksik olan CAT_COLORS ve Renk Tanımları
export const CAT_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']
export const SEGMENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

// Cube Yapısı
const CUBE = (RAW.cube ?? []) as any[]

// ── Export Edilmesi Gereken Fonksiyonlar ─────────────────────

export function getKpisFromCube(seg: string, bolge: string, yas: string, donem: string) {
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem)
  return row ? row[4] : KPI_META.map(() => null)
}

// Hata veren: getN
export function getN(seg: string, bolge: string, yas: string, donem: string) {
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem)
  return row ? row[5] : 0
}

// Hata veren: getSegmentColor
export function getSegmentColor(seg: string) {
  const idx = SEGMENTLER.indexOf(seg)
  return idx !== -1 ? SEGMENT_COLORS[idx % SEGMENT_COLORS.length] : '#64748b'
}

// Hata veren: getAvailableDonemler
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

export const getKpiScores = (seg: string, bolge: string, yas: string, donem: string): number[] => {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)
  return rawKpis.map((val: any, i: number) => {
    const ref = trKpis[i]
    if (val === null || ref === null || ref === 0) return 100
    return Math.round((val / ref) * 100)
  })
}

export const getKpiScoresDetailed = (seg: string, bolge: string, yas: string, donem: string) => {
    // Mevcut dashboard yapısına göre genişletilmiş skor verisi
    return getKpiScores(seg, bolge, yas, donem)
}

export const isLowerBetter = (no: number) => KPI_META.find(k => k.no === no)?.is_lower_better ?? false
export const fmtKpi = (v: any, f: string) => v === null ? '—' : (f === '%' ? `${v.toFixed(1)}%` : v.toLocaleString())
export const getScore = (val: number, ref: number, lower: boolean) => !ref ? 100 : (val / ref) * 100
