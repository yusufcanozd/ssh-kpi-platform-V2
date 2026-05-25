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

type CubeRow = [string, string, string, string, (number | null)[], number, number]
type ScoreRow = [string, string, string, string, number, number, number, number, number, number]
type MarkaRow = [string, string, string, string, string, number]

const rawData = RAW as any
const rawMarkaData = MARKA_RAW as any

export const KPI_META: KpiMeta[] = rawData.kpi_meta as KpiMeta[]
export const BOLGELER: string[] = rawData.bolgeler as string[]
export const SEGMENTLER: string[] = rawData.segmentler as string[]
export const YAS_GRUPLARI: string[] = rawData.yas_gruplari as string[]
export const DONEMLER: string[] = rawData.donemler as string[]
export const YAS_STATS: Record<string, number> = rawData.yas_stats ?? {}
export const TOTAL_IO: number = rawData.total_io ?? 0
export const TOTAL_SERVIS: number = rawData.total_servis ?? 0

export const CAT_COLORS: Record<string, string> = {
  'Müşteri Sadakati ve Deneyimi': '#10b981',
  'Finansal Verimlilik ve Rasyo Analizi': '#3b82f6',
  'Süreç ve Operasyonel Akış': '#f59e0b',
  'Bayi Ağı Kapasite Yönetimi': '#8b5cf6',
  'Stratejik Kapsam Dağılımı': '#ef4444',
  Müşteri: '#10b981',
  Ticari: '#3b82f6',
  Operasyonel: '#f59e0b',
  Bayi: '#8b5cf6',
  Kapsam: '#ef4444',
}

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
  Object.entries(SEGMENT_HEX).map(([k, v]) => [k, `${hexToRgba(v, 0.25)}`])
)
export const YAS_COLORS: Record<string, string> = {
  Tümü: '#64748b',
  '0-3': '#10b981',
  '3-7': '#f59e0b',
  '7+': '#ef4444',
}

const CUBE: CubeRow[] = (rawData.cube ?? []) as CubeRow[]
const SCORE_CUBE: ScoreRow[] = (rawData.score_cube ?? []) as ScoreRow[]
const MARKA_CUBE: MarkaRow[] = Array.isArray(rawMarkaData)
  ? rawMarkaData as MarkaRow[]
  : (rawMarkaData.cube ?? rawData.marka_score_cube ?? []) as MarkaRow[]

const cubeMap = new Map(CUBE.map(r => [key4(r[0], r[1], r[2], r[3]), r]))
const scoreMap = new Map(SCORE_CUBE.map(r => [key4(r[0], r[1], r[2], r[3]), r]))

// ── Fonksiyonlar ──────────────────────────────────────────────

function key4(seg = '', bolge = '', yas = 'Tümü', donem = '') {
  return `${seg}|${bolge}|${yas}|${donem}`
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function normalizeDonem(donem?: string) {
  return donem ?? ''
}

function scoreFromRow(row: ScoreRow | undefined): SegmentScore | null {
  if (!row) return null
  return {
    genel: row[4] ?? 0,
    musteri: row[5] ?? 0,
    ticari: row[6] ?? 0,
    operasyonel: row[7] ?? 0,
    bayi: row[8] ?? 0,
    kapsam: row[9] ?? 0,
  }
}

export function getKpisFromCube(seg = '', bolge = '', yas = 'Tümü', donem = ''): (number | null)[] {
  const row = cubeMap.get(key4(seg, bolge, yas, normalizeDonem(donem)))
  return row ? row[4] : KPI_META.map(() => null)
}

export function getN(seg = '', bolge = '', yas = 'Tümü', donem = ''): number {
  const row = cubeMap.get(key4(seg, bolge, yas, normalizeDonem(donem)))
  return row ? row[5] : 0
}

export function getSegmentColor(seg = ''): string {
  return SEGMENT_HEX[seg] ?? '#64748b'
}

export function getAvailableDonemler(seg = '', bolge = '', yas = 'Tümü'): Set<string> {
  const available = new Set<string>()
  for (const r of CUBE) {
    if (r[0] === seg && r[1] === bolge && r[2] === yas && r[3]) available.add(r[3])
  }
  return available
}

export function getMarkaList(seg = '', bolge = '', yas = 'Tümü', donem = ''): string[] {
  return getMarkaRanking(seg, bolge, yas, donem).map(m => m.marka)
}

export function getMarkaRanking(seg = '', bolge = '', yas = 'Tümü', donem = ''): MarkaScore[] {
  const d = normalizeDonem(donem)
  return MARKA_CUBE
    .filter(r => (!seg || r[1] === seg) && r[2] === bolge && r[3] === yas && r[4] === d)
    .map(r => ({ marka: r[0], segment: r[1], score: r[5] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.marka.localeCompare(b.marka, 'tr'))
}

export function getScore(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  return scoreFromRow(scoreMap.get(key4(seg, bolge, yas, normalizeDonem(donem))))
}

export function getKpiScores(seg = '', bolge = '', yas = 'Tümü', donem = ''): number[] {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)
  return rawKpis.map((val, i) => getKpiScoreValue(val, trKpis[i], KPI_META[i]))
}

export function getKpiScoresDetailed(seg = '', bolge = '', yas = 'Tümü', donem = '') {
  const values = getKpisFromCube(seg, bolge, yas, donem)
  const refs = getKpisFromCube('', '', 'Tümü', donem)
  return values.map((value, i) => ({
    meta: KPI_META[i],
    value,
    ref: refs[i],
    score: getKpiScoreValue(value, refs[i], KPI_META[i]),
  }))
}

function getKpiScoreValue(val: number | null | undefined, ref: number | null | undefined, meta?: KpiMeta): number {
  if (val === null || val === undefined || ref === null || ref === undefined) return 100
  if (val === 0 && ref === 0) return 100
  if (ref === 0 || val === 0) return meta?.is_lower_better ? (val === 0 ? 100 : 0) : 0
  const ratio = meta?.is_lower_better ? ref / val : val / ref
  return Math.max(0, Math.round(ratio * 100))
}

export function overallScoreFromKpis(scores: number[]): number {
  const valid = scores.filter(n => Number.isFinite(n))
  if (!valid.length) return 0
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}

export function isLowerBetter(noOrIdx: number): boolean {
  const byNo = KPI_META.find(k => k.no === noOrIdx)
  const byIdx = KPI_META[noOrIdx]
  return (byNo ?? byIdx)?.is_lower_better ?? false
}

export function fmtKpi(v: any, f: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  switch (f) {
    case '%':
    case 'pct':
    case 'pct2':
      return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(1)}%`
    case 'pct4':
      return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(2)}%`
    case 'tl0':
      return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'
    case 'int':
      return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
    case 'ratio1':
    case 'gun1':
    case 'saat1':
      return n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    case 'ratio2':
      return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return n.toLocaleString('tr-TR')
  }
}

export function kpiUnit(fmt: string): string {
  if (fmt.startsWith('pct') || fmt === '%') return '%'
  if (fmt.startsWith('tl')) return '₺'
  if (fmt.startsWith('gun')) return 'gün'
  if (fmt.startsWith('saat')) return 'saat'
  return ''
}

export function heatColor(val: number | null | undefined, ref: number | null | undefined, higherBetter = true) {
  if (val === null || val === undefined || ref === null || ref === undefined || ref === 0) {
    return { bg: 'rgba(100,116,139,.10)', color: '#64748b' }
  }
  const ratio = higherBetter ? val / ref : ref / val
  if (ratio >= 1.05) return { bg: 'rgba(16,185,129,.16)', color: '#10b981' }
  if (ratio >= 0.95) return { bg: 'rgba(59,130,246,.14)', color: '#3b82f6' }
  if (ratio >= 0.85) return { bg: 'rgba(245,158,11,.16)', color: '#f59e0b' }
  return { bg: 'rgba(239,68,68,.14)', color: '#ef4444' }
}

export const scoreColor = (s: number) => s >= 80 ? '#10b981' : s >= 65 ? '#3b82f6' : s >= 50 ? '#f59e0b' : '#ef4444'
export const scoreBg = (s: number) => s >= 80 ? 'rgba(16,185,129,.15)' : s >= 65 ? 'rgba(59,130,246,.14)' : s >= 50 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.14)'
export const kpiScoreColor = (s: number) => s >= 100 ? '#10b981' : s >= 90 ? '#f59e0b' : '#ef4444'
export const kpiScoreBg = (s: number) => s >= 100 ? 'rgba(16,185,129,.15)' : s >= 90 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)'
export const chgColor = (val: number) => val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#64748b'
export const chgBg = (val: number) => val > 0 ? 'rgba(16,185,129,.15)' : val < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'
export const changePct = (baz: number | null | undefined, cmp: number | null | undefined): number | null => {
  if (baz === null || baz === undefined || cmp === null || cmp === undefined || cmp === 0) return null
  return Math.round(((baz - cmp) / Math.abs(cmp)) * 1000) / 10
}
