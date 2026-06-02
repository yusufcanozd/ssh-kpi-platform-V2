// lib/kpi/data.ts
// Cube lookup, marka veri erişimi ve filtre yardımcıları.
// Bağımlılık: config.ts (tipler + KPI_META)

import RAW from '../kpi_data.json'
import MARKA_RAW from '../marka_scores.json'
import { KPI_META, MarkaScore } from './config'

interface RawKpiData {
  cube?: CubeRow[]
  marka_score_cube?: MarkaRow[]
}

interface RawMarkaScoresData {
  cube?: MarkaRow[]
}

const rawData = RAW as unknown as RawKpiData
const rawMarkaData = MARKA_RAW as unknown as RawMarkaScoresData | MarkaRow[]

// ─────────────────────────────────────────────────────────────
// Tip tanımları (dahili)
// ─────────────────────────────────────────────────────────────
export type CubeRow = [
  string,          // segment
  string,          // bolge
  string,          // yas
  string,          // donem
  (number|null)[], // 12 ham KPI değeri
  number,          // iş emri / örneklem sayısı
  number           // servis sayısı
]

type MarkaRow = [
  string, // marka
  string, // segment
  string, // bolge
  string, // yas
  string, // donem
  number  // skor
]

export interface BrandPrivacyInfo {
  isMasked: boolean
  totalBrands: number
  rule: 'rule-of-3' | 'none'
}

export interface MarkaScoreWithPrivacy extends MarkaScore {
  /** Orijinal marka adı sadece internal/debug kullanım içindir; UI'da gösterilmemelidir. */
  originalMarka?: string
  isMasked?: boolean
}

// ─────────────────────────────────────────────────────────────
// Ham veri yükleme
// ─────────────────────────────────────────────────────────────
export const CUBE: CubeRow[] = (rawData.cube ?? []) as CubeRow[]

// score_cube legacy veri alanıdır, runtime skor hesaplamasında kullanılmaz.
// JSON içinde geriye dönük izlenebilirlik / eski backend çıktısı olarak kalabilir;
// ancak getScore(), getScoreDetailed(), getKpiScores() ve UI skorları artık yalnızca
// CUBE ham KPI değerleri üzerinden normalizeKpi → hesaplaKatveGenelSkor motoruyla üretilir.
// Bu dosyada bilinçli olarak rawData.score_cube okunmaz ve herhangi bir scoreMap oluşturulmaz.



// ─────────────────────────────────────────────────────────────
// Veri kalitesi / coverage yardımcıları
// ─────────────────────────────────────────────────────────────
const ZERO_VARIANCE_KPI_IDXS = new Set<number>()

for (let i = 0; i < KPI_META.length; i++) {
  const vals = CUBE.map(r => r[4]?.[i]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const uniqueVals = new Set(vals.map(v => Number(v)))
  if (vals.length > 0 && uniqueVals.size <= 1) ZERO_VARIANCE_KPI_IDXS.add(i)
}

/**
 * Veri setinde hiç varyans üretmeyen KPI'lar skoru ayrıştıramaz.
 * Örneğin mevcut veri setinde KPI 2 tüm satırlarda 0 olduğu için coverage dışında tutulur.
 */
export function isZeroVarianceKpi(kpiIdx: number): boolean {
  return ZERO_VARIANCE_KPI_IDXS.has(kpiIdx)
}

export function getExcludedKpiIdxs(): number[] {
  return Array.from(ZERO_VARIANCE_KPI_IDXS).sort((a, b) => a - b)
}

const MARKA_CUBE: MarkaRow[] = Array.isArray(rawMarkaData)
  ? rawMarkaData as MarkaRow[]
  : (rawMarkaData.cube ?? rawData.marka_score_cube ?? []) as MarkaRow[]

// ─────────────────────────────────────────────────────────────
// O(1) lookup
// ─────────────────────────────────────────────────────────────
export function cubeKey(seg = '', bolge = '', yas = 'Tümü', donem = ''): string {
  return `${seg}|${bolge}|${yas}|${donem}`
}

const cubeMap = new Map(CUBE.map(r => [cubeKey(r[0], r[1], r[2], r[3]), r]))

function nd(donem?: string): string {
  return donem ?? ''
}

// ─────────────────────────────────────────────────────────────
// Ham Cube Erişimi
// ─────────────────────────────────────────────────────────────
export function getKpisFromCube(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): (number|null)[] {
  const row = cubeMap.get(cubeKey(seg, bolge, yas, nd(donem)))
  return row ? row[4] : KPI_META.map(() => null)
}

export function getN(seg = '', bolge = '', yas = 'Tümü', donem = ''): number {
  const row = cubeMap.get(cubeKey(seg, bolge, yas, nd(donem)))
  return row ? row[5] : 0
}

export function getServisCount(seg = '', bolge = '', yas = 'Tümü', donem = ''): number {
  const row = cubeMap.get(cubeKey(seg, bolge, yas, nd(donem)))
  return row ? row[6] : 0
}

export function getCube(seg = '', bolge = '', yas = 'Tümü', donem = ''): CubeRow | null {
  return cubeMap.get(cubeKey(seg, bolge, yas, nd(donem))) ?? null
}

// ─────────────────────────────────────────────────────────────
// Marka Veri Erişimi
// Not: marka_score_cube / marka_scores.json ayrı precomputed marka skor kaynağıdır.
// Marka skorları şu an yalnızca genel skor içerir; kategori/KPI kırılımı yoktur.
// Segment/kategori/genel dashboard skorları ise score_cube kullanmaz, dinamik KPI motorundan gelir.
// ─────────────────────────────────────────────────────────────
export function applyBrandPrivacyRule<T extends { marka: string }>(rows: T[]): T[] {
  // Rekabet hassasiyeti / Rule of 3:
  // Filtre sonucunda 1, 2 veya 3 marka varsa marka adları deterministik şekilde maskelenir.
  if (rows.length > 0 && rows.length <= 3) {
    return rows.map((row, i) => ({
      ...row,
      originalMarka: row.marka,
      marka: `Gizli Teşebbüs ${i + 1}`,
      isMasked: true,
    }))
  }

  return rows.map(row => ({ ...row, isMasked: false }))
}

export function getBrandPrivacyInfo(count: number): BrandPrivacyInfo {
  return {
    isMasked: count > 0 && count <= 3,
    totalBrands: count,
    rule: count > 0 && count <= 3 ? 'rule-of-3' : 'none',
  }
}

export function getRawMarkaRanking(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): MarkaScore[] {
  const d = nd(donem)
  return MARKA_CUBE
    .filter(r => (!seg || r[1] === seg) && r[2] === bolge && r[3] === yas && r[4] === d)
    .map(r => ({ marka: r[0], segment: r[1], score: r[5] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.marka.localeCompare(b.marka, 'tr'))
}

export function getMarkaRanking(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): MarkaScoreWithPrivacy[] {
  return applyBrandPrivacyRule(getRawMarkaRanking(seg, bolge, yas, donem)) as MarkaScoreWithPrivacy[]
}

export function getMarkaList(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): string[] {
  return getMarkaRanking(seg, bolge, yas, donem).map(m => m.marka)
}

export function getMarkaScore(
  marka: string, bolge = '', yas = 'Tümü', donem = ''
): number | null {
  const r = getMarkaRanking('', bolge, yas, donem).find(m => m.marka === marka || m.originalMarka === marka)
  return r?.score ?? null
}

export function getMarkaSegment(marka: string): string {
  const r = MARKA_CUBE.find(row => row[0] === marka)
  return r ? r[1] : ''
}

// ─────────────────────────────────────────────────────────────
// Filtre Yardımcıları
// ─────────────────────────────────────────────────────────────
export function getAvailableDonemler(
  seg = '', bolge = '', yas = 'Tümü'
): Set<string> {
  const s = new Set<string>()
  for (const r of CUBE) {
    if (r[0] === seg && r[1] === bolge && r[2] === yas && r[3]) s.add(r[3])
  }
  return s
}

export function getAvailableBolgeler(
  seg = '', yas = 'Tümü', donem = ''
): Set<string> {
  const d = nd(donem)
  const s = new Set<string>()
  for (const r of CUBE) {
    if (r[0] === seg && r[2] === yas && r[3] === d && r[1]) s.add(r[1])
  }
  return s
}

// ─────────────────────────────────────────────────────────────
// Debug (sadece development)
// ─────────────────────────────────────────────────────────────
export function debugDonem(seg = '', bolge = '', yas = 'Tümü'): void {
  if (process.env.NODE_ENV === 'production') return
  const rows = CUBE.filter(r => r[0] === seg && r[1] === bolge && r[2] === yas)
  console.group(`[kpi/data] debugDonem(seg="${seg || 'TR'}", bolge="${bolge || 'Tümü'}", yas="${yas}")`)
  console.log('Satır:', rows.length)
  console.log('Dönemler:', Array.from(new Set(rows.map(r => r[3]).filter(Boolean))).sort())
  console.groupEnd()
}
