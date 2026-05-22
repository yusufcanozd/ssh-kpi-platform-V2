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

// Cube satırı: [seg, bolge, yas, donem, kpis, n, servis_count]
type CubeRow  = [string, string, string, string, (number|null)[], number, number]
type MarkaRow = [string, string, string, string, (number|null)[], number, number]

const CUBE: CubeRow[]       = (RAW.cube ?? []) as CubeRow[]
const MARKA_CUBE: MarkaRow[] = []  // marka_bolge kaldırıldı

// ── Cube lookup ───────────────────────────────────────────────
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

export function getServisCount(seg='', bolge='', yas='Tümü', donem=''): number {
  const r = getCube(seg, bolge, yas, donem)
  return r ? r[6] : 0
}

// ── Marka lookup (eski arayüz uyumu) ──────────────────────────
export interface MarkaData {
  marka: string; segment: string; bolge: string; yas: string
  kpis: number[]; n: number; servis_count: number
}
export function getMarkaList(bolge='', yas='Tümü'): MarkaData[] { return [] }

// ── Segment ortalaması — dönem dahil ─────────────────────────
// Segment'in seçili bölge + yaş + DÖNEM'deki ortalama KPI değeri
export function getSegAvg(seg: string, kpiIdx: number, bolge='', yas='Tümü', donem=''): number {
  return getKpisFromCube(seg, bolge, yas, donem)[kpiIdx] ?? 0
}

// ── Renkler ───────────────────────────────────────────────────
export const SEGMENT_COLORS: Record<string,string> = {
  Premium: 'var(--seg-premium-color)',
  Mass:    'var(--seg-mass-color)',
  EV:      'var(--seg-ev-color)',
}
export const SEGMENT_BG: Record<string,string> = {
  Premium: 'var(--seg-premium-bg)',
  Mass:    'var(--seg-mass-bg)',
  EV:      'var(--seg-ev-bg)',
}
export const SEGMENT_BORDER: Record<string,string> = {
  Premium: 'var(--seg-premium-border)',
  Mass:    'var(--seg-mass-border)',
  EV:      'var(--seg-ev-border)',
}
export const SEGMENT_HEX: Record<string,string> = {
  Premium: '#c084fc', Mass: '#60a5fa', EV: '#34d399',
}
export const SEGMENT_HEX_BG: Record<string,string> = {
  Premium: 'rgba(192,132,252,.25)', Mass: 'rgba(96,165,250,.25)', EV: 'rgba(52,211,153,.25)',
}
export const CAT_COLORS: Record<string,string> = {
  'Müşteri Sadakati ve Deneyimi':        '#10b981',
  'Finansal Verimlilik ve Rasyo Analizi':'#3b82f6',
  'Süreç ve Operasyonel Akış':           '#f59e0b',
  'Bayi Ağı Kapasite Yönetimi':          '#8b5cf6',
  'Stratejik Kapsam Dağılımı':           '#ef4444',
}
export const YAS_COLORS: Record<string,string> = {
  'Tümü':'#8496b0','0-3':'#10b981','3-7':'#3b82f6','7+':'#f59e0b'
}
export const BOLGE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']

// ── Format ────────────────────────────────────────────────────
export function fmtKpi(val: number|null|undefined, fmt: string): string {
  if (val==null||isNaN(val as number)) return '—'
  const v = val as number
  switch(fmt){
    case 'pct4':
    case 'pct2':   return (v*100).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})
    case 'ratio2': return v.toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})
    case 'ratio1': return Math.round(v).toLocaleString('tr-TR')
    case 'saat1':  return v.toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})
    case 'tl0':    return Math.round(v).toLocaleString('tr-TR')
    case 'gun1':   return v.toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})
    case 'int':    return Math.round(v).toLocaleString('tr-TR')
    default:       return v.toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})
  }
}

// ── Isı rengi ─────────────────────────────────────────────────
export function heatColor(val: number, ref: number, higherIsBetter=true): {bg:string;color:string} {
  if(!ref||!val) return {bg:'rgba(77,96,112,.1)',color:'#4d6070'}
  const ratio = higherIsBetter ? val/ref : ref/val
  if(ratio>=1.15) return {bg:'rgba(16,185,129,.2)', color:'#10b981'}
  if(ratio>=1.05) return {bg:'rgba(59,130,246,.15)',color:'#60a5fa'}
  if(ratio>=0.95) return {bg:'rgba(245,158,11,.12)',color:'#fbbf24'}
  return              {bg:'rgba(239,68,68,.15)',   color:'#f87171'}
}

// ── Negatif yönlü KPI'lar ────────────────────────────────────
// Index 3: Teknik Onarım Verimlilik (işçilik saati — az = iyi)
// Index 6: İş Emri Süresi (araç kalma günü — az = iyi)
export function isLowerBetter(i: number): boolean { return i===3 || i===6 }

// ── V5 Dinamik Skor Motoru ────────────────────────────────────
//
// HESAPLAMA:
//   1) Her KPI için segment ortalamasına göre rasyo hesapla
//      - Büyükse iyi: rasyo = markaKpiVal / segOrtalama
//      - Küçükse iyi: rasyo = segOrtalama / markaKpiVal
//      - Veri yoksa: rasyo = 1.0 (nötr)
//   2) Rasyoyu KPI ağırlığıyla çarp → kategori toplamına ekle
//   3) Kategori toplamını kategori ağırlığına böl → kategori skoru
//   4) Kategori skorunu kategori ağırlığıyla çarp → nihai endekse ekle
//   5) Nihai endeks × 70 = 0-100 ölçeğinde genel performans skoru
//
// DÖNEM PARAMETRESİ: Segment ortalaması da aynı dönemden alınır —
// böylece "2024-Q1 Mass ortalama" ile "2024-Q1 Chery değeri" karşılaştırılır.
//
export function overallScoreFromKpis(
  kpis: number[],
  seg: string,
  bolge = '',
  yas = 'Tümü',
  donem = ''   // ← Dönem eklendi: segment avg ile aynı dönem
): number {

  // KPI ağırlıkları (indeks → ağırlık %)
  const agirliklar: Record<number,number> = {
    0:7,   1:11,  2:7,   // Müşteri Sadakati ve Deneyimi  — toplam %25
    3:7,   4:8,   5:10,  // Finansal Verimlilik            — toplam %25
    6:12,  7:13,         // Süreç ve Operasyonel Akış      — toplam %25
    8:7.5, 9:7.5,        // Bayi Ağı Kapasite Yönetimi     — toplam %15
    10:5,  11:5,         // Stratejik Kapsam Dağılımı      — toplam %10
  }

  const kategoriler = [
    { idxler:[0,1,2],  katAgirlik:25 },
    { idxler:[3,4,5],  katAgirlik:25 },
    { idxler:[6,7],    katAgirlik:25 },
    { idxler:[8,9],    katAgirlik:15 },
    { idxler:[10,11],  katAgirlik:10 },
  ]

  let nihaiEndeks = 0

  for (const kat of kategoriler) {
    let katToplam = 0
    for (const i of kat.idxler) {
      // Segment ortalaması — aynı bölge + yaş + DÖNEM
      const segOrtalama = getSegAvg(seg, i, bolge, yas, donem)
      const kpiVal      = kpis[i]

      let rasyo: number
      if (!segOrtalama || !kpiVal) {
        rasyo = 1.0  // Veri yoksa nötr
      } else if (isLowerBetter(i)) {
        rasyo = segOrtalama / kpiVal  // Küçükse iyi: seg/marka
      } else {
        rasyo = kpiVal / segOrtalama  // Büyükse iyi: marka/seg
      }

      katToplam += rasyo * agirliklar[i]
    }

    // Kategori skoru = ağırlıklı rasyo toplamı / kategori toplam ağırlığı
    const katSkoru = katToplam / kat.katAgirlik

    // Nihai endekse katkı = kategori skoru × kategori ağırlığı
    nihaiEndeks += katSkoru * (kat.katAgirlik / 100)
  }

  // 0-100 ölçeğine oturt: nihai endeks × 70 (taban başarı puanı)
  return Math.round(nihaiEndeks * 70)
}

// ── Skor Cube (kategori skorları) ────────────────────────────
// [seg, bolge, yas, donem, genel, musteri, ticari, operasyonel, bayi, kapsam]
type ScoreRow = [string,string,string,string,number,number,number,number,number,number]
const SCORE_CUBE: ScoreRow[] = ((RAW as any).score_cube ?? []) as ScoreRow[]

export interface SegmentScore {
  genel: number
  musteri: number; ticari: number; operasyonel: number; bayi: number; kapsam: number
}

// getScore: SCORE_CUBE'dan kategori skorlarını döner
// (segment bazlı görünümler için — marka skor motoru değil)
export function getScore(seg='', bolge='', yas='Tümü', donem=''): SegmentScore | null {
  const r = SCORE_CUBE.find(x => x[0]===seg && x[1]===bolge && x[2]===yas && x[3]===donem)
  if (!r) return null
  return { genel:r[4], musteri:r[5], ticari:r[6], operasyonel:r[7], bayi:r[8], kapsam:r[9] }
}

// ── Semantik Renk Fonksiyonları — V5 Eşikleri ─────────────────
// >= 77: Üstün (Yeşil), >= 66: Güvenli (Mavi), < 66: Kritik (Kırmızı)
export function scoreColor(v: number): string {
  if (v >= 77) return '#10b981'
  if (v >= 66) return '#3b82f6'
  return '#ef4444'
}
export function scoreBg(v: number): string {
  if (v >= 77) return 'rgba(16,185,129,.15)'
  if (v >= 66) return 'rgba(59,130,246,.12)'
  return 'rgba(239,68,68,.12)'
}
export function changePct(curr: number, prev: number): string {
  if (!prev) return '—'
  return ((curr-prev)/prev*100).toFixed(1)
}

// ── Marka Skor Cube ───────────────────────────────────────────
// [marka, segment, bolge, yas, donem, genel_skor]
type MarkaScoreRow = [string,string,string,string,string,number]
const MARKA_SCORE_CUBE: MarkaScoreRow[] = (MARKA_RAW ?? []) as MarkaScoreRow[]

// getMarkaScore: statik r[5] BAYPAS
// → markanın segmenti + filtreler → getKpisFromCube → overallScoreFromKpis(dönem dahil)
export function getMarkaScore(marka: string, bolge='', yas='Tümü', donem=''): number | null {
  const r = MARKA_SCORE_CUBE.find(x => x[0]===marka && x[2]===bolge && x[3]===yas && x[4]===donem)
  if (!r) return null
  const segment     = r[1]
  const segmentKpis = getKpisFromCube(segment, bolge, yas, donem)
  // Dönem parametresi overallScoreFromKpis'e geçiliyor
  return overallScoreFromKpis(segmentKpis, segment, bolge, yas, donem)
}

export function getMarkaSegment(marka: string): string {
  const r = MARKA_SCORE_CUBE.find(x => x[0]===marka)
  return r ? r[1] : ''
}

// getMarkaRanking: dinamik V5 skorlama + Rule of 3 koruma kalkanı
export function getMarkaRanking(
  selSeg='', selBolge='', selYas='Tümü', donem=''
): { marka: string; segment: string; score: number }[] {
  const seen = new Map<string,{marka:string;segment:string;score:number}>()

  for (const r of MARKA_SCORE_CUBE) {
    if (r[2] !== selBolge) continue
    if (r[3] !== selYas)   continue
    if (r[4] !== donem)    continue
    if (selSeg && r[1] !== selSeg) continue

    const segment = r[1]
    // Segmentin ham KPI değerleri — aynı bölge + yaş + dönem
    const segKpis = getKpisFromCube(segment, selBolge, selYas, donem)
    // Dönem dahil dinamik skor hesabı
    const dinamikSkor = overallScoreFromKpis(segKpis, segment, selBolge, selYas, donem)

    seen.set(r[0], { marka: r[0], segment, score: dinamikSkor })
  }

  const sonuc = Array.from(seen.values()).sort((a,b) => b.score - a.score)

  // Rule of 3 — Rekabet hukuku: oyuncu sayısı <= 3 ise maskele
  if (sonuc.length <= 3) {
    return sonuc.map(item => ({
      ...item,
      marka: 'Gizli Teşebbüs (Yetersiz Veri Oyuncu Eşiği)',
    }))
  }

  return sonuc
}

// ── KPI Bazlı Puan Hesaplama ──────────────────────────────────
// Her KPI için segmentin Tüm TR referansına göre normalize et → 0-100
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

// KPI puan rengi — V5 eşikleri
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

// Değişim % rengi
export function chgColor(chg: number | null): string {
  if (chg === null) return 'var(--tx3)'
  if (chg >= 0)    return '#10b981'
  if (chg >= -10)  return '#f59e0b'
  return '#ef4444'
}
export function chgBg(chg: number | null): string {
  if (chg === null) return 'transparent'
  if (chg >= 0)    return 'rgba(16,185,129,.1)'
  if (chg >= -10)  return 'rgba(245,158,11,.08)'
  return 'rgba(239,68,68,.1)'
}

// KPI birim etiketi
export function kpiUnit(fmt: string): string {
  switch(fmt) {
    case 'pct4': case 'pct2': return '%'
    case 'ratio2': return '%'
    case 'ratio1': return '%'
    case 'saat1':  return 'saat'
    case 'tl0':    return '₺'
    case 'gun1':   return 'saat'
    case 'int':    return 'adet'
    default:       return ''
  }
}
