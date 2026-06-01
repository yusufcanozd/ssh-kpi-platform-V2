// lib/kpi/formula.ts
// KPI normalizasyon, kategori ve genel skor hesaplama motoru.
// Bağımlılık: config.ts (KPI_META, KAT_YAPILAR, tipler)
//             data.ts (getKpisFromCube)

import { KPI_META, KAT_YAPILAR, SegmentScore, KpiScoreDetail } from './config'
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
// normalizeKpi — tek KPI için normalize skor
//
// Formül:
//   yüksek-daha-iyi: skor = (val / ref) × 100
//   düşük-daha-iyi:  skor = (ref / val) × 100
//
// Sınırlar: [0, 200]
// Eksik veri: 100 (nötr)
// ─────────────────────────────────────────────────────────────
export function normalizeKpi(
  val: number | null | undefined,
  ref: number | null | undefined,
  kpiIdx: number
): number {
  if (val == null || ref == null) return 100   // veri yok → nötr
  if (val === 0 && ref === 0)     return 100
  const lob = isLowerBetter(kpiIdx)
  if (ref === 0) return lob ? (val === 0 ? 100 : 0) : 0
  if (val === 0) return lob ? 100 : 0
  const ratio = lob ? ref / val : val / ref
  return Math.round(Math.min(200, Math.max(0, ratio * 100)))
}

// ─────────────────────────────────────────────────────────────
// hesaplaKatveGenelSkor — 12 KPI → SegmentScore
//
// Aşama 2: Kategori skoru = KPI skorlarının eşit ağırlıklı ortalaması
//   Örn: musteri = (KPI0 + KPI1 + KPI2) / 3
//
// Aşama 3: Genel skor = Σ(kategori_skoru × kategori_ağırlığı)
//   musteri:0.25 + ticari:0.25 + operasyonel:0.25 + bayi:0.15 + kapsam:0.10
//
// KPI sayısı dinamiktir (KAT_YAPILAR[x].kpis.length).
// Yeni KPI eklenmesi bu fonksiyonu değiştirmez.
// ─────────────────────────────────────────────────────────────
export function hesaplaKatveGenelSkor(
  kpis: (number|null)[],
  refKpis: (number|null)[]
): SegmentScore {
  let genel = 0
  const katSkorlar: Record<string, number> = {}

  for (const kat of KAT_YAPILAR) {
    const n = kat.kpis.length
    let toplam = 0
    for (const ki of kat.kpis) {
      toplam += normalizeKpi(kpis[ki], refKpis[ki], ki)
    }
    const katSkor = n > 0 ? Math.round(toplam / n) : 0
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
// Public API — hesaplama fonksiyonları
// ─────────────────────────────────────────────────────────────

// getKpiScores — 12 elemanlı normalize skor dizisi (0-200)
// Referans noktası: aynı (bolge, yas, donem) altında seg='' (TR genel)
export function getKpiScores(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): number[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => normalizeKpi(v, refKpis[i], i))
}

// getKpiScoresDetailed — skor + metadata (isDefault, rawVal, refVal)
export function getKpiScoresDetailed(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): KpiScoreDetail[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => {
    const ref     = refKpis[i]
    const hasData = v != null && ref != null && !(v === 0 && ref === 0)
    return {
      value:     normalizeKpi(v, ref, i),
      isDefault: !hasData,
      rawVal:    v,
      refVal:    ref,
    }
  })
}

// getScore — segment/TR bazlı kategori ve genel skor
//
// score_cube artık KULLANILMIYOR.
// Tüm skorlar normalizeKpi → hesaplaKatveGenelSkor pipeline'ından üretilir.
// Return shape: SegmentScore — geriye dönük uyumluluk korunmuştur.
export function getScore(
  seg = '', bolge = '', yas = 'Tümü', donem = ''
): SegmentScore | null {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return hesaplaKatveGenelSkor(kpis, refKpis)
}

// overallScoreFromKpis — zaten normalize edilmiş skor dizisinden genel skor
// (getMarkaRanking gibi dışarıdan skor dizisi geldiğinde kullanılır)
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
