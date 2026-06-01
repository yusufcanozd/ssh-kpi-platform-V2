// lib/kpi/formula.ts
// KPI normalizasyon, kategori ve genel skor hesaplama motoru.
// score_cube runtime hesaplamada kullanılmaz; ham cube değerleri dinamik olarak normalize edilir.

import {
  KPI_META, KAT_YAPILAR,
  SegmentScore, KpiScoreDetail,
  KpiScoreDetailFull, KatScoreDetail, SegmentScoreDetailed,
} from './config'
import { getKpisFromCube, isZeroVarianceKpi } from './data'

export type KpiReferenceMode = 'same-filter' | 'national'

interface NormResult {
  score: number
  isMissing: boolean
  isReferenceMissing: boolean
  isCapped: boolean
  coverageIncluded: boolean
}

interface ScoreCalcOptions {
  round?: boolean
  excludeZeroVariance?: boolean
}

export function isLowerBetterByIndex(index: number): boolean {
  return KPI_META[index]?.is_lower_better ?? false
}

export function isLowerBetterByNo(no: number): boolean {
  return KPI_META.find(k => k.no === no)?.is_lower_better ?? false
}

/**
 * @deprecated Bu fonksiyon 0-bazlı KPI index'i kabul eder. KPI no için isLowerBetterByNo(no) kullan.
 */
export function isLowerBetter(index: number): boolean {
  return isLowerBetterByIndex(index)
}

function clampScore(score: number): number {
  return Math.min(200, Math.max(0, score))
}

function maybeRound(score: number, round = true): number {
  return round ? Math.round(score) : Math.round(score * 10) / 10
}

function _normalizeRaw(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number,
  options: ScoreCalcOptions = {}
): NormResult {
  const round = options.round ?? true
  const excludeZeroVariance = options.excludeZeroVariance ?? true
  const isMissing = val == null
  const isReferenceMissing = ref == null

  if (excludeZeroVariance && isZeroVarianceKpi(kpiIdx)) {
    return { score: NaN, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: false }
  }

  if (isMissing || isReferenceMissing) {
    return { score: NaN, isMissing, isReferenceMissing, isCapped: false, coverageIncluded: false }
  }

  // Her ikisi de sıfır ise ayrıştırıcı veri yoktur. KPI 2 gibi sıfır-varyans KPI'lar
  // yukarıda coverage dışında kalır; diğer KPI'larda nötr 100 korunur.
  if (val === 0 && ref === 0) {
    return { score: 100, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  const lowerBetter = isLowerBetterByIndex(kpiIdx)

  if (ref === 0) {
    const score = lowerBetter ? (val === 0 ? 100 : 0) : 0
    return { score, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  if (val === 0) {
    const score = lowerBetter ? 100 : 0
    return { score, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  const rawScore = (lowerBetter ? ref / val : val / ref) * 100
  const isCapped = rawScore > 200
  const score = maybeRound(clampScore(rawScore), round)
  return { score, isMissing: false, isReferenceMissing: false, isCapped, coverageIncluded: true }
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
  const r = _normalizeRaw(val, ref, kpiIdx, { round: false })
  return Number.isNaN(r.score) ? 100 : r.score
}

function calculateSegmentScore(
  kpis: (number | null)[],
  refKpis: (number | null)[],
  options: ScoreCalcOptions = {}
): SegmentScore {
  const round = options.round ?? true
  let genel = 0
  const katSkorlar: Record<string, number> = {}

  for (const kat of KAT_YAPILAR) {
    let toplam = 0
    let validCount = 0

    for (const ki of kat.kpis) {
      const r = _normalizeRaw(kpis[ki], refKpis[ki], ki, options)
      if (r.coverageIncluded && !Number.isNaN(r.score)) {
        toplam += r.score
        validCount++
      }
    }

    const rawKatSkor = validCount > 0 ? toplam / validCount : 100
    const katSkor = maybeRound(rawKatSkor, round)
    katSkorlar[kat.key] = katSkor
    genel += katSkor * kat.agirlik
  }

  return {
    genel: maybeRound(genel, round),
    musteri: katSkorlar['musteri'] ?? 0,
    ticari: katSkorlar['ticari'] ?? 0,
    operasyonel: katSkorlar['operasyonel'] ?? 0,
    bayi: katSkorlar['bayi'] ?? 0,
    kapsam: katSkorlar['kapsam'] ?? 0,
  }
}

export function hesaplaKatveGenelSkor(kpis: (number | null)[], refKpis: (number | null)[]): SegmentScore {
  return calculateSegmentScore(kpis, refKpis, { round: true })
}

function nationalBenchmarkKpis(seg: string, yas = 'Tümü', donem = ''): (number | null)[] {
  // Segment seçiliyse bölge benchmark'ı aynı segmentin Tüm Türkiye satırıdır.
  // Segment seçili değilse tüm segmentler / Tüm Türkiye satırı kullanılır.
  return getKpisFromCube(seg || '', '', yas, donem)
}

function referenceKpisForMode(seg: string, bolge: string, yas: string, donem: string, mode: KpiReferenceMode): (number | null)[] {
  if (mode === 'national') return nationalBenchmarkKpis(seg, yas, donem)
  return getKpisFromCube('', bolge, yas, donem)
}

export function getKpiScores(seg = '', bolge = '', yas = 'Tümü', donem = ''): number[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
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
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => {
    const ref = refKpis[i]
    const r = _normalizeRaw(v, ref, i)
    return { value: Number.isNaN(r.score) ? 100 : r.score, isDefault: !r.coverageIncluded, rawVal: v ?? null, refVal: ref ?? null }
  })
}

export function getScore(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return calculateSegmentScore(kpis, refKpis, { round: true })
}

export function getScoreWithReferenceMode(
  seg = '', bolge = '', yas = 'Tümü', donem = '', referenceMode: KpiReferenceMode = 'same-filter'
): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = referenceKpisForMode(seg, bolge, yas, donem, referenceMode)
  if (kpis.every(v => v == null)) return null
  return calculateSegmentScore(kpis, refKpis, { round: true })
}

export function getScoreWithReferenceModePrecise(
  seg = '', bolge = '', yas = 'Tümü', donem = '', referenceMode: KpiReferenceMode = 'same-filter'
): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = referenceKpisForMode(seg, bolge, yas, donem, referenceMode)
  if (kpis.every(v => v == null)) return null
  return calculateSegmentScore(kpis, refKpis, { round: false })
}

export function getRegionalScore(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  return getScoreWithReferenceMode(seg, bolge, yas, donem, 'national')
}

export function getRegionalScorePrecise(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScore | null {
  return getScoreWithReferenceModePrecise(seg, bolge, yas, donem, 'national')
}

function detailedKpisFor(
  kpis: (number | null)[],
  refKpis: (number | null)[],
  options: ScoreCalcOptions = {}
): KpiScoreDetailFull[] {
  return kpis.map((v, i) => {
    const meta = KPI_META[i]
    const ref = refKpis[i]
    const r = _normalizeRaw(v, ref, i, options)
    return {
      kpiIdx: i,
      kpiNo: meta?.no ?? i + 1,
      score: Number.isNaN(r.score) ? 100 : r.score,
      rawValue: v ?? null,
      referenceValue: ref ?? null,
      isMissing: r.isMissing,
      isReferenceMissing: r.isReferenceMissing,
      isLowerBetter: isLowerBetterByIndex(i),
      isCapped: r.isCapped,
      coverageIncluded: r.coverageIncluded,
    }
  })
}

export function getKpiScoresFullDetail(seg = '', bolge = '', yas = 'Tümü', donem = ''): KpiScoreDetailFull[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return detailedKpisFor(kpis, refKpis, { round: true })
}

export function getRegionalKpiScoresFullDetail(seg = '', bolge = '', yas = 'Tümü', donem = ''): KpiScoreDetailFull[] {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = nationalBenchmarkKpis(seg, yas, donem)
  return detailedKpisFor(kpis, refKpis, { round: false })
}

function detailedScoreFrom(
  kpis: (number | null)[],
  refKpis: (number | null)[],
  options: ScoreCalcOptions = {}
): SegmentScoreDetailed | null {
  if (kpis.every(v => v == null)) return null
  const round = options.round ?? true
  const detailedKpis = detailedKpisFor(kpis, refKpis, options)
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
      if (d.coverageIncluded) { toplam += d.score; validCount++ } else { missingKpiIdxs.push(ki) }
    }
    const rawKatSkor = validCount > 0 ? toplam / validCount : 100
    const katSkor = maybeRound(rawKatSkor, round)
    katSkorlar[kat.key] = katSkor
    genel += katSkor * kat.agirlik
    categories.push({ key: kat.key, ad: kat.ad, agirlik: kat.agirlik, score: katSkor, validKpiCount: validCount, totalKpiCount: kat.kpis.length, missingKpiIdxs })
  }

  return {
    genel: maybeRound(genel, round),
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
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return detailedScoreFrom(kpis, refKpis, { round: true })
}

export function getRegionalScoreDetailed(seg = '', bolge = '', yas = 'Tümü', donem = ''): SegmentScoreDetailed | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = nationalBenchmarkKpis(seg, yas, donem)
  return detailedScoreFrom(kpis, refKpis, { round: false })
}

/**
 * @deprecated Eski coverage-aware olmayan kullanım. Yeni kodda getScore/getScoreDetailed kullanılmalı.
 */
export function overallScoreFromKpis(kpis: number[]): number {
  return overallScoreFromKpisDetailed(kpis).genel
}

export function overallScoreFromKpisDetailed(kpis: Array<number | null | undefined>): SegmentScore {
  let genel = 0
  const katSkorlar: Record<string, number> = {}
  for (const kat of KAT_YAPILAR) {
    const vals = kat.kpis.map(ki => kpis[ki]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const katOrt = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 100
    const katSkor = Math.round(katOrt)
    katSkorlar[kat.key] = katSkor
    genel += katSkor * kat.agirlik
  }
  return {
    genel: Math.round(genel),
    musteri: katSkorlar['musteri'] ?? 0,
    ticari: katSkorlar['ticari'] ?? 0,
    operasyonel: katSkorlar['operasyonel'] ?? 0,
    bayi: katSkorlar['bayi'] ?? 0,
    kapsam: katSkorlar['kapsam'] ?? 0,
  }
}

export function getSegAvg(seg: string, kpiIdx: number, bolge = '', yas = 'Tümü', donem = ''): number {
  return getKpisFromCube(seg, bolge, yas, donem)[kpiIdx] ?? 0
}
