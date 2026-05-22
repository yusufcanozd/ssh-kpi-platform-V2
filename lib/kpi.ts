import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta { no: number; ad: string; kat: string; fmt: string }

export const KPI_META: KpiMeta[]    = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]     = RAW.bolgeler as string[]
export const SEGMENTLER: string[]   = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[] = RAW.yas_gruplari as string[]
export const DONEMLER: string[]     = RAW.donemler as string[]
export const YAS_STATS              = RAW.yas_stats as Record<string,number>
export const TOTAL_IO: number       = RAW.total_io as number
export const TOTAL_SERVIS: number   = RAW.total_servis as number

// Arayüz Renk Sabitleri
export const SEGMENT_COLORS: Record<string,string> = { Mass: '#60a5fa', Premium: '#c084fc', EV: '#34d399' }
export const SEGMENT_BG: Record<string,string> = { Mass: 'rgba(96,165,250,.1)', Premium: 'rgba(192,132,252,.1)', EV: 'rgba(52,211,153,.1)' }
export const SEGMENT_HEX: Record<string,string> = { Mass: '#60a5fa', Premium: '#c084fc', EV: '#34d399' }
export const SEGMENT_HEX_BG: Record<string,string> = { Mass: 'rgba(96,165,250,.25)', Premium: 'rgba(192,132,252,.25)', EV: 'rgba(52,211,153,.25)' }
export const CAT_COLORS: Record<string,string> = { operational: '#34d399', customer: '#60a5fa', service: '#c084fc', coverage: '#fbbf24' }
export const YAS_COLORS: Record<string,string> = { '0-3': '#34d399', '3-7': '#3b82f6', '7+': '#a78bfa' }

export interface SegmentScore {
  genel: number
  operational: number
  customer: number
  service: number
  coverage: number
}

// Cube satır yapıları
type CubeRow  = [string, string, string, string, (number|null)[], number, number]
type MarkaRow = [string, string, string, string, string, number] // [Brand, Segment, Region, Age, Period, Score]

const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]
const MARKA_CUBE: MarkaRow[] = (MARKA_RAW ?? []) as MarkaRow[]

// ── Cube Lookup & Veri Çekme Fonksiyonları ────────────────────
export function getCube(seg='', bolge='', yas='Tümü', donem=''): CubeRow | null {
  return CUBE.find(r => r[0]===seg && r[1]===bolge && r[2]===yas && r[3]===donem) || null
}

export function getKpisFromCube(seg='', bolge='', yas='Tümü', donem=''): number[] {
  const r = getCube(seg, bolge, yas, donem)
  return (r ? r[4] : Array(12).fill(0)).map(v => v ?? 0)
}

export function getN(seg='', bolge='', yas='Tümü', donem=''): number {
  const r = getCube(seg, bolge, yas, donem)
  return r ? r[5] : 0
}

// Negatif Metrik Kontrolü (Düşük olması daha iyi olan KPI'lar)
export function isLowerBetter(kpiIdx: number): boolean {
  // Projenizdeki iş emri kapatma süresi vb. süreç indexleri
  return kpiIdx === 3 || kpiIdx === 6
}

export function kpiUnit(kpiIdx: number): string {
  const meta = KPI_META.find(m => m.no === kpiIdx + 1)
  if (!meta) return ''
  if (meta.fmt === 'pct') return '%'
  if (meta.fmt === 'days') return ' Gün'
  return ''
}

// ── Tablo İçin Sihirli Hücre Endeks Dönüştürücüsü ──────────────
// `/dashboard/kpiler` sayfasındaki ham değerleri (Örn: Chery 3.415) segment ortalamasına göre oranlar.
export function getKpiCellIndex(
  markaHamDeger: number, 
  kpiIdx: number, 
  segment: string, 
  bolge='', 
  yas='Tümü', 
  donem=''
): number {
  const segKpis = getKpisFromCube(segment, bolge, yas, donem)
  const segmentOrtalamasi = segKpis[kpiIdx] ?? 0

  if (!segmentOrtalamasi || !markaHamDeger) return 100 // Referans yoksa nötr endeks

  if (isLowerBetter(kpiIdx)) {
    return Math.round((segmentOrtalamasi / markaHamDeger) * 100)
  } else {
    return Math.round((markaHamDeger / segmentOrtalamasi) * 100)
  }
}

// ── Dinamik Puanlama Motoru (Orijinal Sistem Entegrasyonu) ─────
export function overallScoreFromKpis(
  brandRawKpis: number[], 
  segment: string, 
  bolge='', 
  yas='Tümü', 
  donem=''
): SegmentScore {
  const segKpis = getKpisFromCube(segment, bolge, yas, donem)
  
  // Orijinal index.ts ağırlık dağılımları
  const weights = [0.10, 0.09, 0.08, 0.07, 0.12, 0.10, 0.09, 0.08, 0.07, 0.05, 0.075, 0.075]
  const categories = [
    'operational', 'operational', 'operational', 'operational',
    'customer', 'customer', 'customer',
    'service', 'service', 'service',
    'coverage', 'coverage'
  ]

  let opSum = 0, opW = 0
  let cuSum = 0, cuW = 0
  let svSum = 0, svW = 0
  let coSum = 0, coW = 0

  brandRawKpis.forEach((val, idx) => {
    const segAvg = segKpis[idx] ?? 0
    let ratio = 1.0
    if (segAvg && val) {
      ratio = isLowerBetter(idx) ? (segAvg / val) : (val / segAvg)
    }
    const score = ratio * 100
    const w = weights[idx] ?? 0.08

    if (categories[idx] === 'operational') { opSum += score * w; opW += w }
    if (categories[idx] === 'customer')    { cuSum += score * w; cuW += w }
    if (categories[idx] === 'service')     { svSum += score * w; svW += w }
    if (categories[idx] === 'coverage')    { coSum += score * w; coW += w }
  })

  const catScores = {
    operational: opW > 0 ? Math.round(opSum / opW) : 100,
    customer: cuW > 0 ? Math.round(cuSum / cuW) : 100,
    service: svW > 0 ? Math.round(svSum / svW) : 100,
    coverage: coW > 0 ? Math.round(coSum / coW) : 100
  }

  // index.ts ana kategori ağırlık çarpanları (%35, %30, %20, %15)
  const genelSkor = Math.round(
    catScores.operational * 0.35 +
    catScores.customer * 0.30 +
    catScores.service * 0.20 +
    catScores.coverage * 0.15
  )

  return {
    genel: Math.min(130, Math.max(40, genelSkor)),
    ...catScores
  }
}

// ── Marka Listesi ve Dinamik Sıralama Algoritması ──────────────
export function getMarkaList(segment = ''): string[] {
  const brands = Array.from(new Set(MARKA_CUBE.map(r => r[0])))
  if (!segment) return brands
  return brands.filter(b => {
    const found = MARKA_CUBE.find(r => r[0] === b)
    return found ? found[1] === segment : false
  })
}

export function getMarkaRanking(
  selSeg='', selBolge='', selYas='Tümü', donem=''
): { marka: string; segment: string; score: number }[] {
  const brands = getMarkaList(selSeg)
  const list = brands.map(marka => {
    const found = MARKA_CUBE.find(r => r[0] === marka)
    const segment = found ? found[1] : 'Mass'
    
    // Marka trend eğrisini korumak için JSON skorunu baz alarak simüle ham veri üretiyoruz
    const scoreRow = MARKA_CUBE.find(r => r[0]===marka && r[2]===selBolge && r[3]===selYas && r[4]===donem)
    const baseScore = scoreRow ? scoreRow[5] : 70
    const multiplier = baseScore / 72

    const mockRawKpis = getKpisFromCube(segment, selBolge, selYas, donem).map(v => v * multiplier)
    const res = overallScoreFromKpis(mockRawKpis, segment, selBolge, selYas, donem)
    
    return { marka, segment, score: res.genel }
  })
  return list.sort((a, b) => b.score - a.score)
}

// Orijinal Korunan Yapı: Tüm TR referansına göre normalize et (0-100)
export function getKpiScores(seg: string, bolge='', yas='Tümü', donem=''): number[] {
  const segKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis  = getKpisFromCube('', bolge, yas, donem)
  return segKpis.map((v, i) => {
    const r = trKpis[i]
    if (!v || !r) return 50
    const ratio = isLowerBetter(i) ? r / v : v / r
    return Math.min(100, Math.max(0, Math.round(ratio * 100)))
  })
}

export function getScore(seg='', bolge='', yas='Tümü', donem=''): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  return overallScoreFromKpis(kpis, seg, bolge, yas, donem)
}

// ── UI Renk ve Görsel Eşik Fonksiyonları ───────────────────────
export function scoreColor(v: number): string {
  if (v >= 105) return '#10b981'
  if (v >= 95)  return '#3b82f6'
  return '#ef4444'
}

export function scoreBg(v: number): string {
  if (v >= 105) return 'rgba(16,185,129,.15)'
  if (v >= 95)  return 'rgba(59,130,246,.12)'
  return 'rgba(239,68,68,.12)'
}

export function kpiScoreColor(v: number): string {
  if (v >= 77) return '#10b981'
  if (v >= 66) return '#3b82f6'
  return '#ef4444'
}

export function kpiScoreBg(v: number): string {
  if (v >= 77) return 'rgba(16,185,129,.15)'
  if (v >= 66) return 'rgba(59,130,246,.12)'
  return 'rgba(239,68,68,.12)'
}

export function chgColor(chg: number | null): string {
  if (chg === null) return 'var(--tx3)'
  if (chg >= 0)    return '#10b981'
  return '#ef4444'
}

export function heatColor(val: number, ref: number, higherIsBetter=true): {bg:string;color:string} {
  if(!ref||!val) return {bg:'rgba(77,96,112,.1)',color:'#4d6070'}
  const ratio = higherIsBetter ? val/ref : ref/val
  if(ratio>=1.05) return {bg:'rgba(16,185,129,.2)', color:'#10b981'}
  if(ratio>=0.95) return {bg:'rgba(59,130,246,.15)',color:'#60a5fa'}
  return              {bg:'rgba(239,68,68,.15)',   color:'#f87171'}
}

export function fmtKpi(val: number|null|undefined, fmt: string): string {
  if (val == null || isNaN(val as number)) return '—'
  if (val > 30 && val < 160) return Math.round(val).toString() // Endeks çıktısı ise tam sayı yap
  return (val as number).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

export function changePct(curr: number, prev: number): string {
  if (!prev) return '—'
  return ((curr-prev)/prev*100).toFixed(1)
}
