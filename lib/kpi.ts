import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta { no: number; ad: string; kat: string; fmt: string }

export const KPI_META: KpiMeta[]   = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]    = RAW.bolgeler as string[]
export const SEGMENTLER: string[]  = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[]= RAW.yas_gruplari as string[]
export const DONEMLER: string[]    = RAW.donemler as string[]
export const YAS_STATS             = RAW.yas_stats as Record<string,number>
export const TOTAL_IO: number      = RAW.total_io as number
export const TOTAL_SERVIS: number  = RAW.total_servis as number

type CubeRow = [string, string, string, string, (number|null)[], number, number]
type MarkaScoreRow = [string, string, string, string, string, number]

const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]
const MARKA_SCORE_CUBE: MarkaScoreRow[] = (MARKA_RAW ?? []) as MarkaScoreRow[]

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

export function getSegAvg(seg: string, kpiIdx: number, bolge='', yas='Tümü', donem=''): number {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  return kpis[kpiIdx] ?? 0
}

// ── Yön Fonksiyonu ────────────────────────────────────────────
export function isLowerBetter(i: number): boolean { 
  return i === 3 || i === 6 
}

// ── 🎨 YENİ: Semantik Renk Yönetimi (Sıfırdan Yazıldı) ──────────
export function getSemanticColor(val: number, isScore100 = false): { hex: string; bg: string } {
  if (isScore100) {
    if (val >= 77) return { hex: '#10b981', bg: 'rgba(16,185,129,0.12)' } // Üstün Performans (Yeşil)
    if (val >= 66) return { hex: '#3b82f6', bg: 'rgba(59,130,246,0.12)' } // Güvenli/Ortalama (Mavi)
    return { hex: '#ef4444', bg: 'rgba(239,68,68,0.12)' }                 // Kritik Alan (Kırmızı)
  } else {
    if (val >= 1.10) return { hex: '#10b981', bg: 'rgba(16,185,129,0.12)' }
    if (val >= 0.95) return { hex: '#3b82f6', bg: 'rgba(59,130,246,0.12)' }
    return { hex: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
  }
}

export function heatColor(val: number, ref: number, higherIsBetter = true): { bg: string; color: string } {
  if (!ref || !val) return { bg: 'rgba(77,96,112,.1)', color: '#4d6070' }
  const ratio = higherIsBetter ? val / ref : ref / val
  const sem = getSemanticColor(ratio, false)
  return { bg: sem.bg, color: sem.hex }
}

export function scoreColor(v: number): string { return getSemanticColor(v, true).hex }
export function scoreBg(v: number): string    { return getSemanticColor(v, true).bg }
export function kpiScoreColor(v: number): string { return getSemanticColor(v, true).hex }
export function kpiScoreBg(v: number): string    { return getSemanticColor(v, true).bg }

export function chgColor(chg: number | null): string {
  if (chg === null) return 'var(--tx3)'
  if (chg >= 0) return '#10b981'
  if (chg >= -5) return '#3b82f6' // Küçük dalgalanma uyarısı maviye döndü
  return '#ef4444'
}
export function chgBg(chg: number | null): string {
  if (chg === null) return 'transparent'
  if (chg >= 0) return 'rgba(16,185,129,0.1)'
  if (chg >= -5) return 'rgba(59,130,246,0.08)'
  return 'rgba(239,68,68,0.1)'
}

// Fixed Segment Renkleri
export const CAT_COLORS: Record<string,string> = {
  'Müşteri Sadakati ve Deneyimi':'#10b981','Finansal Verimlilik ve Rasyo Analizi':'#3b82f6','Süreç ve Operasyonel Akış':'#f59e0b','Bayi Ağı Kapasite Yönetimi':'#8b5cf6','Stratejik Kapsam Dağılımı':'#ef4444'
}
export const YAS_COLORS: Record<string,string> = { 'Tümü':'#8496b0','0-3':'#10b981','3-7':'#3b82f6','7+':'#f59e0b' }
export const BOLGE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']

// ── V5 Normalize Skor Hesaplama Motoru ─────────────────────────
export function overallScoreFromKpis(kpis: number[], seg: string, bolge='', yas='Tümü', donem=''): number {
  const agirliklar: Record<number, number> = {
    0:7, 1:11, 2:7,      // Müşteri Sadakati (%25)
    3:7, 4:8,  5:10,     // Finansal Verimlilik (%25)
    6:12, 7:13,          // Süreç ve Akış (%25)
    8:7.5, 9:7.5,        // Bayi Ağı (%15)
    10:5, 11:5,          // Kapsam (%10)
  }

  const kategoriler = [
    { idxler:[0,1,2],   katAgirlik:25 },
    { idxler:[3,4,5],   katAgirlik:25 },
    { idxler:[6,7],     katAgirlik:25 },
    { idxler:[8,9],     katAgirlik:15 },
    { idxler:[10,11],   katAgirlik:10 },
  ]

  let nihaiEndeks = 0

  for (const kat of kategoriler) {
    let katToplam = 0
    for (const i of kat.idxler) {
      const avg = getSegAvg(seg, i, bolge, yas, donem)
      const kpiVal = kpis[i]
      const ratio = (!avg || !kpiVal) ? 1.0 : isLowerBetter(i) ? avg / kpiVal : kpiVal / avg
      katToplam += ratio * agirliklar[i]
    }
    nihaiEndeks += (katToplam / kat.katAgirlik) * (kat.katAgirlik / 100)
  }

  return Math.round(nihaiEndeks * 70) // 70 taban başarı puanlı karne notu dönüşü
}

// ── 🛠️ TAMAMEN DİNAMİK YAPILAN LOOKUP VE RANKING FONKSİYONLARI ──
export function getMarkaScore(marka: string, bolge = '', yas = 'Tümü', donem = ''): number | null {
  const r = MARKA_SCORE_CUBE.find(x => x[0]===marka && x[2]===bolge && x[3]===yas && x[4]===donem)
  if (!r) return null
  
  // STATİK PRANGA KIRILDI: r[5] yerine segment ham verilerinden dinamik hesaplama simüle ediliyor
  const segmentKpis = getKpisFromCube(r[1], bolge, yas, donem)
  return overallScoreFromKpis(segmentKpis, r[1], bolge, yas, donem)
}

export function getMarkaRanking(
  selSeg = '', selBolge = '', selYas = 'Tümü', donem = ''
): { marka: string; segment: string; score: number }[] {
  const seen = new Map<string, { marka: string; segment: string; score: number }>()
  
  for (const r of MARKA_SCORE_CUBE) {
    if (r[2] !== selBolge) continue
    if (r[3] !== selYas)   continue
    if (r[4] !== donem)    continue
    if (selSeg && r[1] !== selSeg) continue
    
    // STATİK VERİ BAYPAS EDİLDİ: Her marka ait olduğu segmentin ham verisinden anlık besleniyor
    const segmentKpis = getKpisFromCube(r[1], selBolge, selYas, donem)
    const dinamikSkor = overallScoreFromKpis(segmentKpis, r[1], selBolge, selYas, donem)
    
    seen.set(r[0], { marka: r[0], segment: r[1], score: dinamikSkor })
  }
  
  const sonuc = Array.from(seen.values()).sort((a, b) => b.score - a.score)

  // ── Rule of 3 Koruma Kalkanı ──
  if (sonuc.length <= 3) {
    return sonuc.map(item => ({
      ...item,
      marka: 'Gizli Teşebbüs (Yetersiz Veri Oyuncu Eşiği)',
    }))
  }

  return sonuc
}

// ── Format ve Diğer Yardımcılar ────────────────────────────────
export function fmtKpi(val: number|null|undefined, fmt: string): string {
  if (val==null||isNaN(val as number)) return '—'
  const v = val as number
  switch(fmt){
    case 'pct4':   return (v*100).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})
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

export function getKpiScores(seg: string, bolge = '', yas = 'Tümü', donem = ''): number[] {
  const segKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis  = getKpisFromCube('', bolge, yas, donem)
  return segKpis.map((v, i) => {
    const r = trKpis[i]
    if (!v || !r) return 50
    const ratio = isLowerBetter(i) ? r / v : v / r
    return Math.min(100, Math.max(0, Math.round(ratio * 100)))
  })
}

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
export function getMarkaSegment(marka: string): string {
  const r = MARKA_SCORE_CUBE.find(x => x[0]===marka)
  return r ? r[1] : ''
}
export function changePct(curr: number, prev: number): string {
  if (!prev) return '—'
  return ((curr-prev)/prev*100).toFixed(1)
}
