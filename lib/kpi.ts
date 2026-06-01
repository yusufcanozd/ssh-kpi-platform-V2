// lib/kpi.ts
// Public facade — mevcut tüm import'lar bu dosyadan çalışmaya devam eder.
//
// İç yapı:
//   lib/kpi/config.ts   — tipler, KPI metadata, kategori konfigürasyonu, renk sabitleri
//   lib/kpi/data.ts     — cube lookup, marka veri erişimi, filtre yardımcıları
//   lib/kpi/formula.ts  — normalizeKpi, hesaplama motoru, getScore, getKpiScores
//   lib/kpi/format.ts   — fmtKpi, scoreColor, changePct ve diğer görsel yardımcılar
//
// Döngüsel import yoktur:
//   config ← data ← formula
//   config ← format
//   (facade hepsini import eder, hiç biri facade'ı import etmez)

// ── Tipler ───────────────────────────────────────────────────
export type {
  KpiMeta,
  SegmentScore,
  MarkaScore,
  KpiScoreDetail,
  KpiScoreDetailFull,
  KatScoreDetail,
  SegmentScoreDetailed,
} from './kpi/config'

// ── Metadata ve Sabitler ─────────────────────────────────────
export {
  KPI_META,
  BOLGELER,
  SEGMENTLER,
  YAS_GRUPLARI,
  DONEMLER,
  YAS_STATS,
  TOTAL_IO,
  TOTAL_SERVIS,
  KAT_YAPILAR,
  CAT_COLORS,
  SEGMENT_HEX,
  SEGMENT_COLORS,
  SEGMENT_BG,
  SEGMENT_HEX_BG,
  SEGMENT_BORDER,
  BOLGE_COLORS,
  YAS_COLORS,
} from './kpi/config'

// ── Veri Erişimi ─────────────────────────────────────────────
export {
  CUBE,
  getKpisFromCube,
  getN,
  getServisCount,
  getCube,
  getMarkaRanking,
  getMarkaList,
  getMarkaScore,
  getMarkaSegment,
  getAvailableDonemler,
  getAvailableBolgeler,
  debugDonem,
} from './kpi/data'

// ── Hesaplama Motoru ─────────────────────────────────────────
export {
  isLowerBetter,
  isLowerBetterByIndex,
  isLowerBetterByNo,
  normalizeKpi,
  hesaplaKatveGenelSkor,
  getKpiScores,
  getKpiScoresDetailed,
  getKpiScoresFullDetail,
  getScore,
  getScoreDetailed,
  overallScoreFromKpis,
  getSegAvg,
} from './kpi/formula'

// ── Formatlama ve Renkler ────────────────────────────────────
export {
  fmtKpi,
  kpiUnit,
  scoreColor,
  scoreBg,
  kpiScoreColor,
  kpiScoreBg,
  chgColor,
  chgBg,
  changePct,
  heatColor,
  getSegmentColor,
  getSegmentBg,
} from './kpi/format'

// ── Geriye Dönük Uyumluluk Alias'ları ───────────────────────
// Bu alias'lar eski sayfalardaki import adlarını korur.
export { getMarkaScore as getMarkaKpiScores } from './kpi/data'
