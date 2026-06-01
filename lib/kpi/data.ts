// lib/kpi/data.ts
// Cube lookup, marka veri erişimi ve filtre yardımcıları.
// Bağımlılık: config.ts (tipler + KPI_META)

import RAW from '../kpi_data.json'
import MARKA_RAW from '../marka_scores.json'
import { KPI_META, MarkaScore } from './config'

const rawData      = RAW      as any
const rawMarkaData = MARKA_RAW as any

// ─────────────────────────────────────────────────────────────
// Tip tanımları (dahili)
// ─────────────────────────────────────────────────────────────
export type CubeRow  = [string, string, string, string, (number|null)[], number, number]
type MarkaRow        = [string, string, string, string, string, number]

// ─────────────────────────────────────────────────────────────
// Ham veri yükleme
// ─────────────────────────────────────────────────────────────
export const CUBE: CubeRow[] = (rawData.cube ?? []) as CubeRow[]

// score_cube legacy/precomputed veri alanıdır; runtime skor hesaplamasında kullanılmaz.
// JSON içinde bırakılmıştır ancak getScore() artık bu veriyi okumaz.
// Tüm skorlar normalizeKpi → hesaplaKatveGenelSkor pipeline'ından üretilir.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SCORE_CUBE_LEGACY = (rawData.score_cube ?? [])

const MARKA_CUBE: MarkaRow[] = Array.isArray(rawMarkaData)
  ? rawMarkaData as MarkaRow[]
  : (rawMarkaData.cube ?? rawData.marka_score_cube ?? []) as MarkaRow[]

// ─────────────────────────────────────────────────────────────
// O(1) lookup
// ─────────────────────────────────────────────────────────────
export function cubeKey(seg = '', bolge = '', yas = 'Tümü', donem = ''): string {
  return `${seg}|${bolge}|${yas}|${donem}`
}

const cubeMap = new Map(CUBE.map(r => [cubeKey(r[0],r[1],r[2],r[3]), r]))

function nd(donem?: string) { return donem ?? '' }

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
// ─────────────────────────────────────────────────────────────
export function getMarkaRanking(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): MarkaScore[] {
  const d = nd(donem)
  const sonuc = MARKA_CUBE
    .filter(r => (!seg || r[1] === seg) && r[2] === bolge && r[3] === yas && r[4] === d)
    .map(r => ({ marka: r[0], segment: r[1], score: r[5] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.marka.localeCompare(b.marka, 'tr'))

  // Rule of 3: <= 3 aktif oyuncu varsa marka kimliğini maskele
  if (sonuc.length > 0 && sonuc.length <= 3) {
    return sonuc.map(m => ({ ...m, marka: 'Gizli Teşebbüs (Yetersiz Veri Oyuncu Eşiği)' }))
  }
  return sonuc
}

export function getMarkaList(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): string[] {
  return getMarkaRanking(seg, bolge, yas, donem).map(m => m.marka)
}

export function getMarkaScore(
  marka: string, bolge = '', yas = 'Tümü', donem = ''
): number | null {
  const r = getMarkaRanking('', bolge, yas, donem).find(m => m.marka === marka)
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
  console.group(`[kpi/data] debugDonem(seg="${seg||'TR'}", bolge="${bolge||'Tümü'}", yas="${yas}")`)
  console.log('Satır:', rows.length)
  console.log('Dönemler:', Array.from(new Set(rows.map(r => r[3]).filter(Boolean))).sort())
  console.groupEnd()
}
