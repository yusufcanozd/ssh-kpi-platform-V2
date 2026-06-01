// lib/kpi/formula.ts
// KPI normalizasyon, kategori ve genel skor hesaplama motoru.
// Bağımlılık: config.ts (KPI_META, KAT_YAPILAR, tipler)
//             data.ts (getKpisFromCube)

import {
  KPI_META, KAT_YAPILAR,
  SegmentScore, KpiScoreDetail,
  KpiScoreDetailFull, KatScoreDetail, SegmentScoreDetailed,
} from './config'
import { getKpisFromCube } from './data'

// ─────────────────────────────────────────────────────────────
// isLowerBetter — JSON'dan dinamik okur
//
// is_lower_better alanı kpi_data.json → kpi_meta içinde tutulur.
// Şu an lower-is-better KPI'lar:
//   idx=3 (no=4): İE Başına İşçilik Saati
//   idx=6 (no=7): İş Emri Süresi Endeksi
// ─────────────────────────────────────────────────────────────
export function isLowerBetter(idxOrNo: number): boolean {
  const byIdx = KPI_META[idxOrNo]
  const byNo  = KPI_META.find(k => k.no === idxOrNo)
  return (byIdx ?? byNo)?.is_lower_better ?? false
}

// ─────────────────────────────────────────────────────────────
// _normalizeRaw — iç hesaplama çekirdeği
//
// Hem getKpiScores hem getScoreDetailed buradan beslenir.
// Geriye sayı dönmek yerine tüm kapsama bilgisini taşır.
//
// Formül:
//   yüksek-daha-iyi: skor = (val / ref) × 100
//   düşük-daha-iyi:  skor = (ref / val) × 100
// Sınır: [0, 200]
// ─────────────────────────────────────────────────────────────
interface NormResult {
  score:              number   // hesaplanan skor; geçersizse NaN
  isMissing:          boolean  // segment verisi yok (null/undefined)
  isReferenceMissing: boolean  // referans verisi yok
  isCapped:           boolean  // 200 tavanına çarptı
  coverageIncluded:   boolean  // kategori ortalamasına dahil edilebilir mi
}

function _normalizeRaw(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number
): NormResult {
  const isMissing          = val == null
  const isReferenceMissing = ref == null

  if (isMissing || isReferenceMissing) {
    return { score: NaN, isMissing, isReferenceMissing, isCapped: false, coverageIncluded: false }
  }

  // Her ikisi de sıfır → nötr ama coverage dahil
  if (val === 0 && ref === 0) {
    return { score: 100, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  const lob = isLowerBetter(kpiIdx)

  // Referans sıfır → anlamsız oran
  if (ref === 0) {
    const score = lob ? (val === 0 ? 100 : 0) : 0
    return { score, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  // Değer sıfır → lower-is-better için mükemmel, değilse 0
  if (val === 0) {
    const score = lob ? 100 : 0
    return { score, isMissing: false, isReferenceMissing: false, isCapped: false, coverageIncluded: true }
  }

  const ratio     = lob ? ref / val : val / ref
  const rawScore  = ratio * 100
  const isCapped  = rawScore > 200
  const score     = Math.round(Math.min(200, Math.max(0, rawScore)))

  return { score, isMissing: false, isReferenceMissing: false, isCapped, coverageIncluded: true }
}

// ─────────────────────────────────────────────────────────────
// normalizeKpi — genel kullanım için sayı döner
//
// Geriye dönük uyumluluk: eksik veri → 100 (nötr)
// ─────────────────────────────────────────────────────────────
export function normalizeKpi(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number
): number {
  const r = _normalizeRaw(val, ref, kpiIdx)
  // Eksik veri → nötr 100 (eski davranış korunuyor)
  return isNaN(r.score) ? 100 : r.score
}

// ─────────────────────────────────────────────────────────────
// hesaplaKatveGenelSkor — 12 KPI → SegmentScore
//
// Eksik KPI'lar ortalamaya dahil EDİLMEZ (eski: dahil edilirdi 100 olarak).
// Kategoride hiç geçerli KPI yoksa → 100 (nötr, ama coverage düşük görünür).
// ─────────────────────────────────────────────────────────────
export function hesaplaKatveGenelSkor(
  kpis: (number|null)[],
  refKpis: (number|null)[]
): SegmentScore {
  let genel = 0
  const katSkorlar: Record<string, number> = {}

  for (const kat of KAT_YAPILAR) {
    let toplam    = 0
    let validCount = 0

    for (const ki of kat.kpis) {
      const r = _normalizeRaw(kpis[ki], refKpis[ki], ki)
      if (r.coverageIncluded && !isNaN(r.score)) {
        toplam += r.score
        validCount++
      }
      // Eksik KPI ortalamaya dahil edilmez
    }

    // Hiç geçerli KPI yoksa → nötr 100
    const katSkor = validCount > 0 ? Math.round(toplam / validCount) : 100
    katSkorlar[kat.key] = katSkor
    genel += katSkor * kat.agirlik
  }

  return {
    genel:       Math.round(genel),
    musteri:     katSkorlar['musteri']     ?? 0,
    ticari:      katSkorlar['ticari']      ?? 0,
    operasyonel: katSkorlar['operasyonel'] ?? 0,
    bayi:        katSkorlar['bayi']        ?? 0,
    kapsam:      katSkorlar['kapsam']      ?? 0,
  }
}

// ─────────────────────────────────────────────────────────────
// Public API — geriye dönük uyumlu fonksiyonlar
// ─────────────────────────────────────────────────────────────

// getKpiScores — 12 elemanlı sayı dizisi (0-200)
// Eksik veri → 100 (nötr, geriye dönük uyumluluk)
export function getKpiScores(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): number[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => normalizeKpi(v, refKpis[i], i))
}

// getKpiScoresDetailed — eski KpiScoreDetail[] (geriye dönük uyumluluk)
export function getKpiScoresDetailed(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): KpiScoreDetail[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => {
    const ref = refKpis[i]
    const r   = _normalizeRaw(v, ref, i)
    return {
      value:     isNaN(r.score) ? 100 : r.score,
      isDefault: !r.coverageIncluded,
      rawVal:    v ?? null,
      refVal:    ref ?? null,
    }
  })
}

// getScore — geriye dönük uyumlu SegmentScore
// Eksik KPI'lar artık ortalamaya dahil edilmez (hesap daha doğru)
// Return shape değişmedi → dashboard sayfaları etkilenmez
export function getScore(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): SegmentScore | null {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return hesaplaKatveGenelSkor(kpis, refKpis)
}

// ─────────────────────────────────────────────────────────────
// YENİ — getKpiScoresFullDetail — tam kapsama bilgili KPI detay
// ─────────────────────────────────────────────────────────────
export function getKpiScoresFullDetail(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): KpiScoreDetailFull[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)

  return kpis.map((v, i) => {
    const meta = KPI_META[i]
    const ref  = refKpis[i]
    const r    = _normalizeRaw(v, ref, i)
    return {
      kpiIdx:             i,
      kpiNo:              meta?.no ?? i + 1,
      score:              isNaN(r.score) ? 100 : r.score,
      rawValue:           v ?? null,
      referenceValue:     ref ?? null,
      isMissing:          r.isMissing,
      isReferenceMissing: r.isReferenceMissing,
      isLowerBetter:      isLowerBetter(i),
      isCapped:           r.isCapped,
      coverageIncluded:   r.coverageIncluded,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// YENİ — getScoreDetailed — tam kapsama bilgili segment skoru
// ─────────────────────────────────────────────────────────────
export function getScoreDetailed(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): SegmentScoreDetailed | null {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  if (kpis.every(v => v == null)) return null

  const detailedKpis = getKpiScoresFullDetail(seg, bolge, yas, donem)
  const totalKpiCount     = KPI_META.length
  const missingKpis       = detailedKpis.filter(d => !d.coverageIncluded).map(d => d.kpiIdx)
  const availableKpiCount = totalKpiCount - missingKpis.length
  const coverageRatio     = totalKpiCount > 0 ? availableKpiCount / totalKpiCount : 0

  // Kategori hesabı — sadece geçerli KPI'lardan
  let genel = 0
  const katSkorlar: Record<string, number> = {}
  const categories: KatScoreDetail[]       = []

  for (const kat of KAT_YAPILAR) {
    let toplam     = 0
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

    categories.push({
      key:            kat.key,
      ad:             kat.ad,
      agirlik:        kat.agirlik,
      score:          katSkor,
      validKpiCount:  validCount,
      totalKpiCount:  kat.kpis.length,
      missingKpiIdxs,
    })
  }

  return {
    genel:             Math.round(genel),
    musteri:           katSkorlar['musteri']     ?? 0,
    ticari:            katSkorlar['ticari']      ?? 0,
    operasyonel:       katSkorlar['operasyonel'] ?? 0,
    bayi:              katSkorlar['bayi']        ?? 0,
    kapsam:            katSkorlar['kapsam']      ?? 0,
    coverageRatio,
    availableKpiCount,
    totalKpiCount,
    missingKpis,
    detailedKpis,
    categories,
  }
}

// ─────────────────────────────────────────────────────────────
// overallScoreFromKpis — normalize edilmiş skor dizisinden genel skor
// ─────────────────────────────────────────────────────────────
export function overallScoreFromKpis(kpis: number[]): number {
  let genel = 0
  for (const kat of KAT_YAPILAR) {
    const n      = kat.kpis.length
    const katOrt = n > 0 ? kat.kpis.reduce((s, ki) => s + (kpis[ki] ?? 100), 0) / n : 0
    genel += katOrt * kat.agirlik
  }
  return Math.round(genel)
}

// getSegAvg — belirli bir KPI'nın segment ortalaması (ham değer)
export function getSegAvg(
  seg: string, kpiIdx: number, bolge = '', yas = 'Tümü', donem = ''
): number {
  return getKpisFromCube(seg, bolge, yas, donem)[kpiIdx] ?? 0
}
