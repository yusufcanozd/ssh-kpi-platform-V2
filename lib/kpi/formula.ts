// lib/kpi/formula.ts
// KPI normalizasyon, kategori ve genel skor hesaplama motoru.

import {
  KPI_META, KAT_YAPILAR,
  SegmentScore, KpiScoreDetail,
  KpiScoreDetailFull, KatScoreDetail, SegmentScoreDetailed,
} from './config'
import { getKpisFromCube, isZeroVarianceKpi, getExcludedKpiIdxs } from './data'

export type KpiReferenceMode = 'same-filter' | 'national'

// ─────────────────────────────────────────────────────────────
// Lower-is-better yardımcıları
// ─────────────────────────────────────────────────────────────
export function isLowerBetterByIndex(index: number): boolean {
  return KPI_META[index]?.is_lower_better ?? false
}

export function isLowerBetterByNo(no: number): boolean {
  return KPI_META.find(k => k.no === no)?.is_lower_better ?? false
}

/** @deprecated Bu fonksiyon 0-bazlı KPI index'i kabul eder. KPI no için isLowerBetterByNo(no) kullan. */
export function isLowerBetter(index: number): boolean {
  return isLowerBetterByIndex(index)
}

interface NormResult {
  score: number
  isMissing: boolean
  isReferenceMissing: boolean
  isCapped: boolean
  coverageIncluded: boolean
  excludedReason?: 'missing-value' | 'missing-reference' | 'zero-variance'
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function clampScore(rawScore: number): { score: number; isCapped: boolean } {
  const clamped = Math.min(200, Math.max(0, rawScore))
  return { score: clamped, isCapped: rawScore > 200 || rawScore < 0 }
}

function _normalizeRaw(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number,
  precise = false
): NormResult {
  const isMissing = val == null
  const isReferenceMissing = ref == null

  if (isZeroVarianceKpi(kpiIdx)) {
    return {
      score: NaN,
      isMissing,
      isReferenceMissing,
      isCapped: false,
      coverageIncluded: false,
      excludedReason: 'zero-variance',
    }
  }

  if (isMissing || isReferenceMissing) {
    return {
      score: NaN,
      isMissing,
      isReferenceMissing,
      isCapped: false,
      coverageIncluded: false,
      excludedReason: isMissing ? 'missing-value' : 'missing-reference',
    }
  }

  if (val === 0 && ref === 0) {
    return { score: 100, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  const lob = isLowerBetterByIndex(kpiIdx)

  if (ref === 0) {
    const score = lob ? (val === 0 ? 100 : 0) : 0
    return { score, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  if (val === 0) {
    const score = lob ? 100 : 0
    return { score, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  const ratio = lob ? ref / val : val / ref
  const { score, isCapped } = clampScore(ratio * 100)
  return {
    score: precise ? round1(score) : Math.round(score),
    isMissing: false,
    isReferenceMissing: false,
    isCapped,
    coverageIncluded: true,
  }
}

export function normalizeKpi(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number
): number {
  const r = _normalizeRaw(val, ref, kpiIdx)
  return Number.isNaN(r.score) ? 100 : r.score
}

export function normalizeKpiPrecise(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number
): number {
  const r = _normalizeRaw(val, ref, kpiIdx, true)
  return Number.isNaN(r.score) ? 100 : r.score
}

function calculateScoreFromKpis(
  kpis: (number | null)[],
  refKpis: (number | null)[],
  precise = false
): SegmentScore {
  let genel = 0
  const katSkorlar: Record<string, number> = {}

  for (const kat of KAT_YAPILAR) {
    let toplam = 0
    let validCount = 0

    for (const ki of kat.kpis) {
      const r = _normalizeRaw(kpis[ki], refKpis[ki], ki, precise)
      if (r.coverageIncluded && !Number.isNaN(r.score)) {
        toplam += r.score
        validCount++
      }
    }

    const katSkorRaw = validCount > 0 ? toplam / validCount : 100
    const katSkor = precise ? round1(katSkorRaw) : Math.round(katSkorRaw)
    katSkorlar[kat.key] = katSkor
    genel += katSkor * kat.agirlik
  }

  return {
    genel: precise ? round1(genel) : Math.round(genel),
    musteri: katSkorlar['musteri'] ?? 0,
    ticari: katSkorlar['ticari'] ?? 0,
    operasyonel: katSkorlar['operasyonel'] ?? 0,
    bayi: katSkorlar['bayi'] ?? 0,
    kapsam: katSkorlar['kapsam'] ?? 0,
  }
}

export function hesaplaKatveGenelSkor(kpis: (number | null)[], refKpis: (number | null)[]): SegmentScore {
  return calculateScoreFromKpis(kpis, refKpis, false)
}

export function hesaplaKatveGenelSkorPrecise(kpis: (number | null)[], refKpis: (number | null)[]): SegmentScore {
  return calculateScoreFromKpis(kpis, refKpis, true)
}

function nationalBenchmarkKpis(seg = '', yas = 'Tümü', donem = ''): (number | null)[] {
  // Segment seçiliyse referans aynı segmentin Tüm Türkiye satırıdır.
  // Segment seçili değilse referans tüm segmentlerin Tüm Türkiye satırıdır.
  return getKpisFromCube(seg || '', '', yas, donem)
}

function referenceKpisForMode(
  seg = '',
  bolge = '',
  yas = 'Tümü',
  donem = '',
  referenceMode: KpiReferenceMode = 'same-filter'
): (number | null)[] {
  if (referenceMode === 'national') return nationalBenchmarkKpis(seg, yas, donem)
  return getKpisFromCube('', bolge, yas, donem)
}

export function getKpiScores(seg = '', bolge = '', yas = 'Tümü', donem = ''): number[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = referenceKpisForMode(seg, bolge, yas, donem, 'same-filter')
  return kpis.map((v, i) => normalizeKpi(v, refKpis[i], i))
}

export function getRegionalKpiScores(seg = '', bolge = '', yas = 'Tümü', donem = ''): number[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = nationalBenchmarkKpis(seg, yas, donem)
  return kpis.map((v, i) => normalizeKpi(v, refKpis[i], i))
}

export function getRegionalKpiScoresPrecise(seg = '', bolge = '', yas = 'Tümü', donem = ''): number[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = nationalBenchmarkKpis(seg, yas, donem)
  return kpis.map((v, i) => normalizeKpiPrecise(v, refKpis[i], i))
}

export function getKpiScoresDetailed(seg = '', bolge = '', yas = 'Tümü', donem = ''): KpiScoreDetail[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = referenceKpisForMode(seg, bolge, yas, donem, 'same-filter')
  return kpis.map((v, i) => {
    const r = _normalizeRaw(v, refKpis[i], i)
    return {
      value: Number.isNaN(r.score) ? 100 : r.score,
      isDefault: !r.coverageIncluded,
      rawVal: v ?? null,
      refVal: refKpis[i] ?? null,
    }
  })
}

export function getScore(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  return getScoreWithReferenceMode({ seg, bolge, yas, donem, referenceMode: 'same-filter' })
}

export function getScoreWithReferenceMode({
  seg = '',
  bolge = '',
  yas = 'Tümü',
  donem = '',
  referenceMode = 'same-filter',
}: {
  seg?: string
  bolge?: string
  yas?: string
  donem?: string
  referenceMode?: KpiReferenceMode
}): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return hesaplaKatveGenelSkor(kpis, referenceKpisForMode(seg, bolge, yas, donem, referenceMode))
}

export function getScoreWithReferenceModePrecise({
  seg = '',
  bolge = '',
  yas = 'Tümü',
  donem = '',
  referenceMode = 'same-filter',
}: {
  seg?: string
  bolge?: string
  yas?: string
  donem?: string
  referenceMode?: KpiReferenceMode
}): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return hesaplaKatveGenelSkorPrecise(kpis, referenceKpisForMode(seg, bolge, yas, donem, referenceMode))
}

export function getRegionalScore(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  return getScoreWithReferenceMode({ seg, bolge, yas, donem, referenceMode: 'national' })
}

export function getRegionalScorePrecise(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  return getScoreWithReferenceModePrecise({ seg, bolge, yas, donem, referenceMode: 'national' })
}

function getKpiScoresFullDetailWithMode(
  seg = '',
  bolge = '',
  yas = 'Tümü',
  donem = '',
  referenceMode: KpiReferenceMode = 'same-filter'
): KpiScoreDetailFull[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = referenceKpisForMode(seg, bolge, yas, donem, referenceMode)

  return kpis.map((v, i) => {
    const meta = KPI_META[i]
    const r = _normalizeRaw(v, refKpis[i], i)
    return {
      kpiIdx: i,
      kpiNo: meta?.no ?? i + 1,
      score: Number.isNaN(r.score) ? 100 : r.score,
      rawValue: v ?? null,
      referenceValue: refKpis[i] ?? null,
      isMissing: r.isMissing,
      isReferenceMissing: r.isReferenceMissing,
      isLowerBetter: isLowerBetterByIndex(i),
      isCapped: r.isCapped,
      coverageIncluded: r.coverageIncluded,
    }
  })
}

export function getKpiScoresFullDetail(seg = '', bolge = '', yas = 'Tümü', donem = ''): KpiScoreDetailFull[] {
  return getKpiScoresFullDetailWithMode(seg, bolge, yas, donem, 'same-filter')
}

function scoreDetailedFromDetails(detailedKpis: KpiScoreDetailFull[]): SegmentScoreDetailed {
  const totalKpiCount = KPI_META.length
  const missingKpis = detailedKpis.filter(d => !d.coverageIncluded).map(d => d.kpiIdx)
  const availableKpiCount = totalKpiCount - missingKpis.length
  const coverageRatio = totalKpiCount > 0 ? availableKpiCount / totalKpiCount : 0

  let genel = 0
  const katSkorlar: Record<string, number> = {}
  const categories: KatScoreDetail[] = []

  for (const kat of KAT_YAPILAR) {
    let toplam = 0
    let validCount = 0
    const missingKpiIdxs: number[] = []

    for (const ki of kat.kpis) {
      const d = detailedKpis[ki]
      if (d.coverageIncluded) {
        toplam += d.score
        validCount++
      } else {
        missingKpiIdxs.push(ki)
      }
    }

    const katSkor = validCount > 0 ? Math.round(toplam / validCount) : 100
    katSkorlar[kat.key] = katSkor
    genel += katSkor * kat.agirlik
    categories.push({ key: kat.key, ad: kat.ad, agirlik: kat.agirlik, score: katSkor, validKpiCount: validCount, totalKpiCount: kat.kpis.length, missingKpiIdxs })
  }

  return {
    genel: Math.round(genel),
    musteri: katSkorlar['musteri'] ?? 0,
    ticari: katSkorlar['ticari'] ?? 0,
    operasyonel: katSkorlar['operasyonel'] ?? 0,
    bayi: katSkorlar['bayi'] ?? 0,
    kapsam: katSkorlar['kapsam'] ?? 0,
    coverageRatio,
    availableKpiCount,
    totalKpiCount,
    missingKpis,
    detailedKpis,
    categories,
  }
}

export function getScoreDetailed(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScoreDetailed | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return scoreDetailedFromDetails(getKpiScoresFullDetailWithMode(seg, bolge, yas, donem, 'same-filter'))
}

export function getRegionalScoreDetailed(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScoreDetailed | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return scoreDetailedFromDetails(getKpiScoresFullDetailWithMode(seg, bolge, yas, donem, 'national'))
}

/**
 * Coverage-aware skor hesaplama. Eksik veya veri kalitesi nedeniyle hariç KPI'ları dışarıda bırakır.
 */
export function overallScoreFromKpisDetailed(kpis: Array<number | null | undefined>): number {
  let genel = 0
  for (const kat of KAT_YAPILAR) {
    const vals = kat.kpis
      .filter(ki => !isZeroVarianceKpi(ki) && kpis[ki] != null && Number.isFinite(Number(kpis[ki])))
      .map(ki => Number(kpis[ki]))
    const katOrt = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 100
    genel += katOrt * kat.agirlik
  }
  return Math.round(genel)
}

/**
 * @deprecated Coverage farklarını saklamak için overallScoreFromKpisDetailed kullanın.
 */
export function overallScoreFromKpis(kpis: number[]): number {
  return overallScoreFromKpisDetailed(kpis)
}

export function getSegAvg(seg: string, kpiIdx: number, bolge = '', yas = 'Tümü', donem = ''): number {
  return getKpisFromCube(seg, bolge, yas, donem)[kpiIdx] ?? 0
}

export function getExcludedKpis(): number[] {
  return getExcludedKpiIdxs()
}
