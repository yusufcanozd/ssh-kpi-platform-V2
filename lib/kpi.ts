import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ─────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────
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

export interface KpiScoreDetail {
  value: number       // normalize skor (0-200)
  isDefault: boolean  // veri yoktu, nötr 100 atandı
  rawVal: number | null
  refVal: number | null
}

export interface MarkaData {
  marka: string
  segment: string
  score: number
}

// ─────────────────────────────────────────────────────────────
// Sabitler
// ─────────────────────────────────────────────────────────────
type CubeRow  = [string, string, string, string, (number | null)[], number, number]
type ScoreRow = [string, string, string, string, number, number, number, number, number, number]
type MarkaRow = [string, string, string, string, string, number]

const rawData     = RAW  as any
const rawMarkaData = MARKA_RAW as any

export const KPI_META:    KpiMeta[]            = rawData.kpi_meta   as KpiMeta[]
export const BOLGELER:    string[]             = rawData.bolgeler   as string[]
export const SEGMENTLER:  string[]             = rawData.segmentler as string[]
export const YAS_GRUPLARI: string[]            = rawData.yas_gruplari as string[]
export const DONEMLER:    string[]             = rawData.donemler   as string[]
export const YAS_STATS:   Record<string,number>= rawData.yas_stats  ?? {}
export const TOTAL_IO:    number               = rawData.total_io   ?? 0
export const TOTAL_SERVIS: number              = rawData.total_servis ?? 0

// Kategori yapısı — V5 matrisine göre (KPI indeksleri 0-bazlı)
export const KAT_YAPILAR = [
  { key: 'musteri',     ad: 'Müşteri Sadakati ve Deneyimi',        agirlik: 0.25, kpis: [0,1,2] },
  { key: 'ticari',      ad: 'Finansal Verimlilik ve Rasyo Analizi', agirlik: 0.25, kpis: [3,4,5] },
  { key: 'operasyonel', ad: 'Süreç ve Operasyonel Akış',           agirlik: 0.25, kpis: [6,7]   },
  { key: 'bayi',        ad: 'Bayi Ağı Kapasite Yönetimi',          agirlik: 0.15, kpis: [8,9]   },
  { key: 'kapsam',      ad: 'Stratejik Kapsam Dağılımı',           agirlik: 0.10, kpis: [10,11] },
] as const

export const CAT_COLORS: Record<string,string> = {
  'Müşteri Sadakati ve Deneyimi':        '#10b981',
  'Finansal Verimlilik ve Rasyo Analizi':'#3b82f6',
  'Süreç ve Operasyonel Akış':           '#f59e0b',
  'Bayi Ağı Kapasite Yönetimi':          '#8b5cf6',
  'Stratejik Kapsam Dağılımı':           '#ef4444',
  // kısa alias (eski sayfalar için)
  'Müşteri':    '#10b981',
  'Ticari':     '#3b82f6',
  'Operasyonel':'#f59e0b',
  'Bayi Ağı':   '#8b5cf6',
  'Kapsam':     '#ef4444',
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#','')
  const full  = clean.length === 3
    ? clean.split('').map(c => c+c).join('')
    : clean
  const val = parseInt(full, 16)
  return `rgba(${(val>>16)&255},${(val>>8)&255},${val&255},${alpha})`
}

export const SEGMENT_HEX: Record<string,string> = {
  Mass:    '#3b82f6',
  Premium: '#8b5cf6',
  EV:      '#10b981',
  '':      '#fbbf24',
}
export const SEGMENT_COLORS  = SEGMENT_HEX
export const SEGMENT_BG: Record<string,string> = Object.fromEntries(
  Object.entries(SEGMENT_HEX).map(([k,v]) => [k, `${v}18`])
)
export const SEGMENT_HEX_BG: Record<string,string> = Object.fromEntries(
  Object.entries(SEGMENT_HEX).map(([k,v]) => [k, hexToRgba(v, 0.25)])
)
export const SEGMENT_BORDER: Record<string,string> = SEGMENT_HEX
export const BOLGE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']
export const YAS_COLORS: Record<string,string> = {
  'Tümü': '#64748b', '0-3': '#10b981', '3-7': '#f59e0b', '7+': '#ef4444',
}

// ─────────────────────────────────────────────────────────────
// Veri küpleri
// ─────────────────────────────────────────────────────────────
const CUBE: CubeRow[] = (rawData.cube ?? []) as CubeRow[]
const SCORE_CUBE: ScoreRow[] = (rawData.score_cube ?? []) as ScoreRow[]
const MARKA_CUBE: MarkaRow[] = Array.isArray(rawMarkaData)
  ? rawMarkaData as MarkaRow[]
  : (rawMarkaData.cube ?? rawData.marka_score_cube ?? []) as MarkaRow[]

// O(1) lookup için map'ler
const cubeMap  = new Map(CUBE.map(r  => [k4(r[0],r[1],r[2],r[3]), r]))
const scoreMap = new Map(SCORE_CUBE.map(r => [k4(r[0],r[1],r[2],r[3]), r]))

function k4(seg='', bolge='', yas='Tümü', donem='') {
  return `${seg}|${bolge}|${yas}|${donem}`
}
function nd(donem?: string) { return donem ?? '' }

// ─────────────────────────────────────────────────────────────
// Ham veri erişimi (dahili kullanım + eski uyumluluk)
// ─────────────────────────────────────────────────────────────
export function getKpisFromCube(
  seg='', bolge='', yas='Tümü', donem=''
): (number|null)[] {
  const row = cubeMap.get(k4(seg, bolge, yas, nd(donem)))
  return row ? row[4] : KPI_META.map(() => null)
}

export function getN(seg='', bolge='', yas='Tümü', donem=''): number {
  const row = cubeMap.get(k4(seg, bolge, yas, nd(donem)))
  return row ? row[5] : 0
}

export function getServisCount(seg='', bolge='', yas='Tümü', donem=''): number {
  const row = cubeMap.get(k4(seg, bolge, yas, nd(donem)))
  return row ? row[6] : 0
}

export function getCube(seg='', bolge='', yas='Tümü', donem='') {
  return cubeMap.get(k4(seg, bolge, yas, nd(donem))) ?? null
}

// ─────────────────────────────────────────────────────────────
// Çekirdek: Tek KPI normalize skoru
// Aşama 1: (val/ref)*100 veya (ref/val)*100
// ─────────────────────────────────────────────────────────────
function normalizeKpi(
  val: number|null|undefined,
  ref: number|null|undefined,
  meta?: KpiMeta
): number {
  if (val == null || ref == null) return 100  // veri yok → nötr
  if (val === 0 && ref === 0)    return 100
  if (ref === 0) return meta?.is_lower_better ? (val === 0 ? 100 : 0) : 0
  if (val === 0) return meta?.is_lower_better ? 100 : 0
  const ratio = meta?.is_lower_better ? ref / val : val / ref
  return Math.round(Math.min(200, Math.max(0, ratio * 100)))
}

// ─────────────────────────────────────────────────────────────
// Aşama 2+3: Kategori ve Genel Skor
// Referans noktası: seçilen (seg, bolge, yas, donem) kombinasyonu
// ─────────────────────────────────────────────────────────────
function hesaplaKatveGenelSkor(
  kpis: (number|null)[],
  refKpis: (number|null)[]
): SegmentScore {
  let genel = 0
  const katSkorlar: Record<string,number> = {}

  for (const kat of KAT_YAPILAR) {
    const n = kat.kpis.length  // dinamik: 2 KPI varsa /2, 3 varsa /3
    let katToplam = 0
    for (const ki of kat.kpis) {
      katToplam += normalizeKpi(kpis[ki], refKpis[ki], KPI_META[ki])
    }
    const katSkor = n > 0 ? Math.round(katToplam / n) : 0
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
// getKpiScores — normalize 0-200 skor dizisi (12 eleman)
// Referans: seg, bolge, yas — seçili filtre kombinasyonu
// ─────────────────────────────────────────────────────────────
export function getKpiScores(
  seg='', bolge='', yas='Tümü', donem=''
): number[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  // Referans: TR genel (aynı bölge/yaş/dönem ama seg='')
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => normalizeKpi(v, refKpis[i], KPI_META[i]))
}

// getKpiScoresDetailed — skor + metadata
export function getKpiScoresDetailed(
  seg='', bolge='', yas='Tümü', donem=''
): KpiScoreDetail[] {
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  return kpis.map((v, i) => {
    const ref = refKpis[i]
    const hasData = v != null && ref != null && !(v === 0 && ref === 0)
    return {
      value:     normalizeKpi(v, ref, KPI_META[i]),
      isDefault: !hasData,
      rawVal:    v,
      refVal:    ref,
    }
  })
}

// getScore — segment/TR bazlı skor (score_cube'dan VEYA dinamik hesap)
export function getScore(
  seg='', bolge='', yas='Tümü', donem=''
): SegmentScore | null {
  // Önce score_cube'a bak (backend hesaplanmış)
  const r = scoreMap.get(k4(seg, bolge, yas, nd(donem)))
  if (r) {
    return { genel:r[4], musteri:r[5], ticari:r[6], operasyonel:r[7], bayi:r[8], kapsam:r[9] }
  }
  // score_cube'da yoksa dinamik hesapla
  const kpis    = getKpisFromCube(seg, bolge, yas, donem)
  const refKpis = getKpisFromCube('', bolge, yas, donem)
  if (kpis.every(v => v == null)) return null
  return hesaplaKatveGenelSkor(kpis, refKpis)
}

// overallScoreFromKpis — zaten normalize edilmiş kpi dizisinden genel skor
export function overallScoreFromKpis(kpis: number[]): number {
  let genel = 0
  for (const kat of KAT_YAPILAR) {
    const n = kat.kpis.length  // dinamik: yeni KPI eklenince otomatik güncellenir
    const katOrt = n > 0
      ? kat.kpis.reduce((s, ki) => s + (kpis[ki] ?? 100), 0) / n
      : 0
    genel += katOrt * kat.agirlik
  }
  return Math.round(genel)
}

// getSegAvg — belirli KPI için referans değer
export function getSegAvg(
  seg: string, kpiIdx: number, bolge='', yas='Tümü', donem=''
): number {
  const v = getKpisFromCube(seg, bolge, yas, donem)[kpiIdx]
  return v ?? 0
}

// ─────────────────────────────────────────────────────────────
// Marka fonksiyonları
// ─────────────────────────────────────────────────────────────
export function getMarkaRanking(
  seg='', bolge='', yas='Tümü', donem=''
): MarkaScore[] {
  const d = nd(donem)
  const sonuc = MARKA_CUBE
    .filter(r => (!seg || r[1]===seg) && r[2]===bolge && r[3]===yas && r[4]===d)
    .map(r => ({ marka: r[0], segment: r[1], score: r[5] ?? 0 }))
    .sort((a,b) => b.score - a.score || a.marka.localeCompare(b.marka,'tr'))

  // Rule of 3: <= 3 marka varsa maskele
  if (sonuc.length > 0 && sonuc.length <= 3) {
    return sonuc.map(m => ({ ...m, marka: 'Gizli Teşebbüs (Yetersiz Veri Oyuncu Eşiği)' }))
  }
  return sonuc
}

export function getMarkaList(
  seg='', bolge='', yas='Tümü', donem=''
): string[] {
  return getMarkaRanking(seg, bolge, yas, donem).map(m => m.marka)
}

export function getMarkaScore(
  marka: string, bolge='', yas='Tümü', donem=''
): number | null {
  const r = getMarkaRanking('', bolge, yas, donem).find(m => m.marka === marka)
  return r?.score ?? null
}

// Alias — markalar/page.tsx uyumu
export const getMarkaKpiScores = getMarkaScore

export function getMarkaSegment(marka: string): string {
  const r = MARKA_CUBE.find(row => row[0] === marka)
  return r ? r[1] : ''
}

// ─────────────────────────────────────────────────────────────
// Filtre yardımcıları
// ─────────────────────────────────────────────────────────────
export function getAvailableDonemler(
  seg='', bolge='', yas='Tümü'
): Set<string> {
  const s = new Set<string>()
  for (const r of CUBE) {
    if (r[0]===seg && r[1]===bolge && r[2]===yas && r[3]) s.add(r[3])
  }
  return s
}

export function getAvailableBolgeler(
  seg='', yas='Tümü', donem=''
): Set<string> {
  const d = nd(donem)
  const s = new Set<string>()
  for (const r of CUBE) {
    if (r[0]===seg && r[2]===yas && r[3]===d && r[1]) s.add(r[1])
  }
  return s
}

export function getSegmentColor(seg=''): string {
  return SEGMENT_HEX[seg] ?? '#64748b'
}

export function getSegmentBg(seg=''): string {
  return SEGMENT_BG[seg] ?? 'rgba(100,116,139,.15)'
}

// ─────────────────────────────────────────────────────────────
// isLowerBetter — JSON'dan dinamik okur
// ─────────────────────────────────────────────────────────────
export function isLowerBetter(idxOrNo: number): boolean {
  // Önce index olarak dene (0-bazlı), sonra no olarak (1-bazlı)
  const byIdx = KPI_META[idxOrNo]
  const byNo  = KPI_META.find(k => k.no === idxOrNo)
  return (byIdx ?? byNo)?.is_lower_better ?? false
}

// ─────────────────────────────────────────────────────────────
// fmtKpi — ham değer formatlama (sadece dahili/debug kullanımı)
// UI'da normalize skor gösterilir, ham değer gösterilmez
// ─────────────────────────────────────────────────────────────
export function fmtKpi(v: any, f: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  switch (f) {
    case '%': case 'pct': case 'pct2':
      return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(1)}%`
    case 'pct4':
      return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(2)}%`
    case 'tl0':
      return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'
    case 'int':
      return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
    case 'ratio1': case 'gun1': case 'saat1':
      return n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    case 'ratio2':
      return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return n.toLocaleString('tr-TR')
  }
}

export function kpiUnit(fmt: string): string {
  if (fmt.startsWith('pct') || fmt === '%') return '%'
  if (fmt.startsWith('tl'))   return '₺'
  if (fmt.startsWith('gun'))  return 'gün'
  if (fmt.startsWith('saat')) return 'saat'
  return ''
}

// ─────────────────────────────────────────────────────────────
// Renk fonksiyonları — V5 eşikleri
// 77+ Yeşil | 66-77 Mavi | <66 Kırmızı
// ─────────────────────────────────────────────────────────────
export const scoreColor = (s: number) =>
  s >= 77 ? '#10b981' : s >= 66 ? '#3b82f6' : '#ef4444'

export const scoreBg = (s: number) =>
  s >= 77 ? 'rgba(16,185,129,.15)' : s >= 66 ? 'rgba(59,130,246,.14)' : 'rgba(239,68,68,.14)'

export const kpiScoreColor = (s: number) =>
  s >= 77 ? '#10b981' : s >= 66 ? '#3b82f6' : '#ef4444'

export const kpiScoreBg = (s: number) =>
  s >= 77 ? 'rgba(16,185,129,.15)' : s >= 66 ? 'rgba(59,130,246,.14)' : 'rgba(239,68,68,.14)'

export const chgColor = (v: number) =>
  v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#64748b'

export const chgBg = (v: number) =>
  v > 0 ? 'rgba(16,185,129,.15)' : v < 0 ? 'rgba(239,68,68,.15)' : 'rgba(100,116,139,.15)'

export const changePct = (
  baz: number|null|undefined,
  cmp: number|null|undefined
): number | null => {
  if (baz == null || cmp == null || cmp === 0) return null
  return Math.round(((baz - cmp) / Math.abs(cmp)) * 1000) / 10
}

export function heatColor(
  val: number|null|undefined,
  ref: number|null|undefined,
  higherBetter = true
) {
  if (val == null || ref == null || ref === 0) {
    return { bg: 'rgba(100,116,139,.10)', color: '#64748b' }
  }
  const ratio = higherBetter ? val / ref : ref / val
  if (ratio >= 1.05) return { bg: 'rgba(16,185,129,.16)', color: '#10b981' }
  if (ratio >= 0.95) return { bg: 'rgba(59,130,246,.14)',  color: '#3b82f6' }
  if (ratio >= 0.85) return { bg: 'rgba(245,158,11,.16)',  color: '#f59e0b' }
  return { bg: 'rgba(239,68,68,.14)', color: '#ef4444' }
}

// ─────────────────────────────────────────────────────────────
// Debug (sadece development)
// ─────────────────────────────────────────────────────────────
export function debugDonem(seg='', bolge='', yas='Tümü'): void {
  if (process.env.NODE_ENV === 'production') return
  const rows = CUBE.filter(r => r[0]===seg && r[1]===bolge && r[2]===yas)
  console.group(`[kpi] debugDonem(seg="${seg||'TR'}", bolge="${bolge||'Tümü'}", yas="${yas}")`)
  console.log('Satır:', rows.length)
  console.log('Dönemler:', Array.from(new Set(rows.map(r => r[3]).filter(Boolean))).sort())
  console.groupEnd()
}
