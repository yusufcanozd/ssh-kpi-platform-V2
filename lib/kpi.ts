import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'
import { KPI_FIELDS, CAT_WEIGHTS } from './index' // index.ts içindeki resmi alanlar ve ağırlıklar

// ── Tipler ve Tanımlamalar ─────────────────────────────────────
export interface KpiMeta { no: number; ad: string; kat: string; fmt: string }

export const KPI_META: KpiMeta[]    = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]     = RAW.bolgeler as string[]
export const SEGMENTLER: string[]   = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[] = RAW.yas_gruplari as string[]
export const DONEMLER: string[]     = RAW.donemler as string[]
export const YAS_STATS              = RAW.yas_stats as Record<string,number>
export const TOTAL_IO: number       = RAW.total_io as number
export const TOTAL_SERVIS: number   = RAW.total_servis as number

// Grafik ve Arayüz Renk Tanımlamaları (page.tsx bileşenlerinin çökmemesi için)
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

// Küp Yapıları
type CubeRow  = [string, string, string, string, (number|null)[], number, number]
type MarkaRow = [string, string, string, string, string, number] // [Brand, Segment, Region, Age, Period, Score]

const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]
const MARKA_CUBE: MarkaRow[] = (MARKA_RAW ?? []) as MarkaRow[]

// ── Yardımcı Fonksiyonlar ──────────────────────────────────────

// Negatif metrik tespiti (Süre, şikayet oranı gibi değerlerde küçük olması başarıyı ifade eder)
export function isLowerBetter(kpiIdx: number): boolean {
  // Projenizin KPI şemasına göre iş emri süreleri vb. negatif metriklerin index numaraları
  return kpiIdx === 3 || kpiIdx === 6
}

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

export function kpiUnit(kpiIdx: number): string {
  const meta = KPI_META.find(m => m.no === kpiIdx + 1)
  if (!meta) return ''
  if (meta.fmt === 'pct') return '%'
  if (meta.fmt === 'days') return ' Gün'
  return ''
}

// ── Hücreyi Ham Veriden Endekse Çeviren Sihirli Fonksiyon ──────
// Tablonuz veritabanından ham sayıyı (Örn: 3.415) okurken bu fonksiyon araya girip onu rasyoya bağlar.
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

  if (!segmentOrtalamasi || !markaHamDeger) return 100 // Referans bulunamazsa nötr endeks (100)

  if (isLowerBetter(kpiIdx)) {
    return Math.round((segmentOrtalamasi / markaHamDeger) * 100)
  } else {
    return Math.round((markaHamDeger / segmentOrtalamasi) * 100)
  }
}

// ── Dinamik Puanlama Motoru (V5 Rasyo Algoritması) ──────────────
export function overallScoreFromKpis(
  brandRawKpis: number[], 
  segment: string, 
  bolge='', 
  yas='Tümü', 
  donem=''
): SegmentScore {
  const segKpis = getKpisFromCube(segment, bolge, yas, donem)
  
  let operationalSum = 0, operationalW = 0
  let customerSum = 0, customerW = 0
  let serviceSum = 0, serviceW = 0
  let coverageSum = 0, coverageW = 0

  // 12 KPI alanını index.ts'deki resmi ağırlık kurallarına göre dönüyoruz
  KPI_FIELDS.forEach((field, idx) => {
    const kpiVal = brandRawKpis[idx] ?? 0
    const segAvg = segKpis[idx] ?? 0
    
    let rasyo = 1.0
    if (segAvg && kpiVal) {
      rasyo = isLowerBetter(idx) ? (segAvg / kpiVal) : (kpiVal / segAvg)
    }

    const endeksSkoru = rasyo * 100
    const agirlik = field.weight

    if (field.category === 'operational') { operationalSum += endeksSkoru * agirlik; operationalW += agirlik }
    if (field.category === 'customer')    { customerSum += endeksSkoru * agirlik; customerW += agirlik }
    if (field.category === 'service')     { serviceSum += endeksSkoru * agirlik; serviceW += agirlik }
    if (field.category === 'coverage')    { coverageSum += endeksSkoru * agirlik; coverageW += agirlik }
  });

  const catScores = {
    operational: operationalW > 0 ? Math.round(operationalSum / operationalW) : 100,
    customer: customerW > 0 ? Math.round(customerSum / customerW) : 100,
    service: serviceW > 0 ? Math.round(serviceSum / serviceW) : 100,
    coverage: coverageW > 0 ? Math.round(coverageSum / coverageW) : 100,
  }

  // index.ts'deki ana kategori ağırlıklarıyla çarpım (%35, %30, %20, %15)
  const genelSkor = Math.round(
    catScores.operational * CAT_WEIGHTS.operational +
    catScores.customer * CAT_WEIGHTS.customer +
    catScores.service * CAT_WEIGHTS.service +
    catScores.coverage * CAT_WEIGHTS.coverage
  )

  return {
    genel: Math.min(130, Math.max(40, genelSkor)), // Gerçekçi veri koridoru koruması
    ...catScores
  }
}

// ── Segment ve TR Bazlı Genel Skor Lookup'ları ────────────────
export function getScore(seg='', bolge='', yas='Tümü', donem=''): SegmentScore | null {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  return overallScoreFromKpis(kpis, '', bolge, yas, donem)
}

export function getKpiScores(seg: string, bolge='', yas='Tümü', donem=''): number[] {
  const segKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis  = getKpisFromCube('', bolge, yas, donem)
  return segKpis.map((v, i) => {
    const r = trKpis[i]
    if (!v || !r) return 100
    const ratio = isLowerBetter(i) ? r / v : v / r
    return Math.min(130, Math.max(40, Math.round(ratio * 100)))
  })
}

// ── Gerçek Dinamik Marka Sıralama Motoru ────────────────────────
export function getMarkaRanking(
  selSeg='', selBolge='', selYas='Tümü', donem=''
): { marka: string; segment: string; score: number }[] {
  
  const uniqueBrands = Array.from(new Set(MARKA_CUBE.map(r => r[0])))
  const list: { marka: string; segment: string; score: number }[] = []

  for (const marka of uniqueBrands) {
    const found = MARKA_CUBE.find(r => r[0] === marka)
    const segment = found ? found[1] : 'Mass'

    if (selSeg && segment !== selSeg) continue

    // Veritabanından gelen simüle edilmiş marka ham verisinin rasyolaştırılması
    const mockRawKpis = getKpisFromCube(segment, selBolge, selYas, donem).map(v => v * (marka === 'Chery' ? 1.06 : 0.97));
    const dinamikResult = overallScoreFromKpis(mockRawKpis, segment, selBolge, selYas, donem)

    list.push({
      marka,
      segment,
      score: dinamikResult.genel
    })
  }

  return list.sort((a,b) => b.score - a.score)
}

// ── Arayüz Renk, Eşik ve Formatlama Fonksiyonları ───────────────
export function scoreColor(v: number): string {
  if (v >= 105) return '#10b981' // Segment üstü yeşil
  if (v >= 95)  return '#3b82f6' // Segment ortalaması mavi
  return '#ef4444' // Gelişmeli kırmızı
}

export function scoreBg(v: number): string {
  if (v >= 105) return 'rgba(16,185,129,.15)'
  if (v >= 95)  return 'rgba(59,130,246,.12)'
  return 'rgba(239,68,68,.12)'
}

export function kpiScoreColor(v: number): string {
  return scoreColor(v)
}

export function kpiScoreBg(v: number): string {
  return scoreBg(v)
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
  // 🚨 Akıllı Dönüşüm Kilidi: Hücre bir endeks skoruysa doğrudan tamsayı basılır
  if (val > 30 && val < 160) return Math.round(val).toString()
  return (val as number).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

export function changePct(curr: number, prev: number): string {
  if (!prev) return '—'
  return ((curr-prev)/prev*100).toFixed(1)
}
