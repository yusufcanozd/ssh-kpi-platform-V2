import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta {
  no: number
  ad: string
  kat: string
  fmt: string
  is_lower_better?: boolean  // opsiyonel — JSON'da tanımlıysa dinamik, yoksa fallback
}

export const KPI_META: KpiMeta[]    = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]     = RAW.bolgeler as string[]
export const SEGMENTLER: string[]   = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[] = RAW.yas_gruplari as string[]
export const DONEMLER: string[]     = RAW.donemler as string[]
export const YAS_STATS              = RAW.yas_stats as Record<string,number>
export const TOTAL_IO: number       = RAW.total_io as number
export const TOTAL_SERVIS: number   = RAW.total_servis as number

// Cube satırı: [seg, bolge, yas, donem, kpis, n, servis_count]
// NOT: cube'da seg = '', 'Mass', 'Premium', 'EV' — marka bazlı KPI yok
type CubeRow  = [string, string, string, string, (number|null)[], number, number]
type MarkaRow = [string, string, string, string, (number|null)[], number, number]

const CUBE: CubeRow[]        = (RAW.cube ?? []) as CubeRow[]
const MARKA_CUBE: MarkaRow[] = []  // Marka bazlı ham KPI verisi mevcut değil

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

// ── Segment ortalaması ────────────────────────────────────────
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

// ── Segment renk getter'ları — undefined güvenli ──────────────
// UI dosyaları SEGMENT_HEX[s] yerine bu fonksiyonları kullanır.
// seg='' (Tüm TR) dahil tüm durumlar için güvenli fallback sağlar.
const _DEFAULT_SEG_COLOR  = '#8496b0'  // nötr gri — Tüm TR
const _DEFAULT_SEG_BG     = 'rgba(132,150,176,.15)'

export function getSegmentColor(seg: string): string {
  return SEGMENT_HEX[seg] ?? _DEFAULT_SEG_COLOR
}

export function getSegmentBg(seg: string): string {
  return SEGMENT_HEX_BG[seg] ?? _DEFAULT_SEG_BG
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

// ── Negatif yönlü KPI tespiti — JSON'dan dinamik ─────────────
//
// NEDEN index (i) kullanıyoruz, no değil?
//   cube[row][4] dizisi: [kpi0, kpi1, ..., kpi11]
//   KPI_META dizisi:     [{no:1,...}, {no:2,...}, ..., {no:12,...}]
//   i = no - 1  →  cube dizisiyle %100 örtüşüyor (teyit edildi)
//   no sıralama değişmez; JSON'a yeni KPI eklenirse sona eklenir
//   bu yüzden i (dizi indeksi) cube ile güvenli eşleşir.
//
// YENİ KPI EKLENDIĞINDE YAPILACAK TEK ŞEY:
//   kpi_data.json'a { "no": 13, "ad": "...", "is_lower_better": true } ekle
//   Bu dosyaya dokunmaya gerek yok.
//
// FALLBACK: JSON'da is_lower_better tanımlı değilse V5 sabit tanımı devreye girer.
//
const _lowerBetterSet: Set<number> = new Set(
  KPI_META
    .map((k, i) => (k.is_lower_better === true ? i : -1))
    .filter(i => i >= 0)
)

export function isLowerBetter(i: number): boolean {
  if (_lowerBetterSet.size > 0) return _lowerBetterSet.has(i)
  // Fallback: V5 matrisindeki sabit tanım (index 3 ve 6)
  return i === 3 || i === 6
}

// ── V5 Dinamik Skor Motoru ────────────────────────────────────
//
// AMAÇ: Segment veya TR bazlı görünümler için KPI dizisini
//       segment ortalamasına göre normalize ederek 0-100 skor üret.
//
// KAPSAM: Bu fonksiyon SEGMENT bazlı hesaplamalar içindir.
//         Marka bazlı skorlar için getMarkaScore / getMarkaRanking kullanılır
//         (marka bazlı ham KPI verisi mevcut olmadığından backend skorları kullanılır).
//
// HESAPLAMA:
//   rasyo = kpiVal / segOrtalama  (büyükse iyi)
//   rasyo = segOrtalama / kpiVal  (küçükse iyi — index 3,6)
//   katSkoru = Σ(rasyo × kpiAğırlık) / kategoriToplamAğırlık
//   nihaiEndeks = Σ(katSkoru × kategoriAğırlık/100)
//   skor = round(nihaiEndeks × 70)
//
export function overallScoreFromKpis(
  kpis: number[],
  seg: string,
  bolge = '',
  yas = 'Tümü',
  donem = ''
): number {
  const agirliklar: Record<number,number> = {
    0:7,   1:11,  2:7,
    3:7,   4:8,   5:10,
    6:12,  7:13,
    8:7.5, 9:7.5,
    10:5,  11:5,
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
      const segOrtalama = getSegAvg(seg, i, bolge, yas, donem)
      const kpiVal      = kpis[i]
      const rasyo = (!segOrtalama || !kpiVal) ? 1.0
        : isLowerBetter(i) ? segOrtalama / kpiVal
        : kpiVal / segOrtalama
      katToplam += rasyo * agirliklar[i]
    }
    nihaiEndeks += (katToplam / kat.katAgirlik) * (kat.katAgirlik / 100)
  }
  return Math.round(nihaiEndeks * 70)
}

// ── Skor Cube ─────────────────────────────────────────────────
// [seg, bolge, yas, donem, genel, musteri, ticari, operasyonel, bayi, kapsam]
type ScoreRow = [string,string,string,string,number,number,number,number,number,number]
const SCORE_CUBE: ScoreRow[] = ((RAW as any).score_cube ?? []) as ScoreRow[]

export interface SegmentScore {
  genel: number
  musteri: number; ticari: number; operasyonel: number; bayi: number; kapsam: number
}

// getScore: segment/TR bazlı kategori skorlarını SCORE_CUBE'dan döner
export function getScore(seg='', bolge='', yas='Tümü', donem=''): SegmentScore | null {
  const r = SCORE_CUBE.find(x => x[0]===seg && x[1]===bolge && x[2]===yas && x[3]===donem)
  if (!r) return null
  return { genel:r[4], musteri:r[5], ticari:r[6], operasyonel:r[7], bayi:r[8], kapsam:r[9] }
}

// ── Renk Fonksiyonları ────────────────────────────────────────
// V5 eşikleri: >= 77 Üstün, >= 66 Güvenli, < 66 Kritik
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
// Şema: [marka, segment, bolge, yas, donem, genel]
// Kaynak önceliği: kpi_data.json > marka_scores.json
type MarkaScoreRow = [string,string,string,string,string,number]

// kpi_data.json içindeki marka_score_cube varsa onu kullan (tip güvenli)
// yoksa marka_scores.json'a düş (any cast ile güvenli erişim)
const _rawMarkaScoreCube = (RAW as any).marka_score_cube
const _fallbackMarkaRaw  = Array.isArray(MARKA_RAW) ? MARKA_RAW : []
const MARKA_SCORE_CUBE: MarkaScoreRow[] = (
  Array.isArray(_rawMarkaScoreCube) && _rawMarkaScoreCube.length > 0
    ? _rawMarkaScoreCube
    : _fallbackMarkaRaw
) as MarkaScoreRow[]

// getMarkaScore: marka_score_cube'dan hazır genel skoru döner
// (backend'de hesaplanmış, marka bazlı ham KPI içermez)
export function getMarkaScore(marka: string, bolge='', yas='Tümü', donem=''): number | null {
  const r = MARKA_SCORE_CUBE.find(x =>
    x[0]===marka && x[2]===bolge && x[3]===yas && x[4]===donem
  )
  return r ? r[5] : null
}

// Alias — markalar/page.tsx getMarkaKpiScores adıyla import ediyor
export const getMarkaKpiScores = getMarkaScore

export function getMarkaSegment(marka: string): string {
  const r = MARKA_SCORE_CUBE.find(x => x[0]===marka)
  return r ? r[1] : ''
}

// getMarkaRanking: marka_score_cube'dan sıralama + Rule of 3 koruma kalkanı
export function getMarkaRanking(
  selSeg='', selBolge='', selYas='Tümü', donem=''
): { marka: string; segment: string; score: number }[] {
  const seen = new Map<string,{marka:string;segment:string;score:number}>()

  for (const r of MARKA_SCORE_CUBE) {
    if (r[2] !== selBolge) continue
    if (r[3] !== selYas)   continue
    if (r[4] !== donem)    continue
    if (selSeg && r[1] !== selSeg) continue
    // Backend'de hesaplanmış gerçek marka skorunu kullan
    seen.set(r[0], { marka: r[0], segment: r[1], score: r[5] })
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
// Segment değerini Tüm TR referansına göre normalize et → 0-100
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
  if (chg >= -10)  return '#f59e0b'
  return '#ef4444'
}
export function chgBg(chg: number | null): string {
  if (chg === null) return 'transparent'
  if (chg >= 0)    return 'rgba(16,185,129,.1)'
  if (chg >= -10)  return 'rgba(245,158,11,.08)'
  return 'rgba(239,68,68,.1)'
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

// ── Geliştirme: Dönem Sağlık Kontrolü ────────────────────────
// Kullanım (sadece development):
//   import { debugDonem } from '@/lib/kpi'
//   debugDonem()                          // TR genel tüm dönemler
//   debugDonem('Mass', '', 'Tümü')       // Mass segmenti
//   debugDonem('', 'Marmara', 'Tümü')   // Marmara bölgesi
//
// Üretim buildinde process.env.NODE_ENV === 'production' koruması
// ile erken çıkar — tree-shaking otomatik düşürür.
export function debugDonem(seg = '', bolge = '', yas = 'Tümü'): void {
  if (process.env.NODE_ENV === 'production') return

  const rows = CUBE.filter(r => r[0] === seg && r[1] === bolge && r[2] === yas)
  const donems = rows.map(r => r[3])
  const bos    = donems.filter(d => d === '' || d == null)
  const dolu   = donems.filter(d => d !== '' && d != null)
  const ceyrek = dolu.filter(d => String(d).includes('Q')).sort()
  const yillik = dolu.filter(d => String(d).includes('FY')).sort()

  console.group(`[kpi.ts] debugDonem(seg="${seg||'TR Genel'}", bolge="${bolge||'Tümü'}", yas="${yas}")`)
  console.log('Toplam satır :', rows.length)
  console.log('Boş donem    :', bos.length, bos.length > 0 ? '← global/Tümü satırı (beklenen)' : '')
  console.log('Çeyreklik    :', ceyrek)
  console.log('Yıllık       :', yillik)

  // Satır başına kpi spot kontrolü — LowerBetter KPI'lar dahil
  console.table(
    rows.map(r => ({
      donem : r[3] === '' ? '(Tümü/Global)' : r[3],
      n     : r[5],
      kpi_0 : r[4][0]?.toFixed(4) ?? 'NULL',  // Aktif Müşteri Bazı
      kpi_3 : r[4][3]?.toFixed(2) ?? 'NULL',  // İşçilik Saati (LowerBetter)
      kpi_6 : r[4][6]?.toFixed(2) ?? 'NULL',  // İş Emri Süresi (LowerBetter)
    }))
  )

  // Uyarılar
  if (rows.length === 0) {
    console.warn('[kpi.ts] ⚠ CUBE\'da bu kombinasyon için satır YOK → getKpisFromCube() sıfır döner')
    console.warn('  Normalizasyon: tüm rasyolar 1.0 → skor = 70 (sabit)')
  }
  if (bos.length === rows.length) {
    console.warn('[kpi.ts] ⚠ Tüm donem değerleri boş — sadece global satır var, dönemsel kırılım çalışmaz')
  }
  const eksikDonem = DONEMLER.filter(d => !dolu.includes(d))
  if (eksikDonem.length > 0) {
    console.warn('[kpi.ts] ⚠ DONEMLER listesinde olup CUBE\'da EKSİK dönemler:', eksikDonem)
  }

  console.groupEnd()
}

// ── 1. Detaylı KPI Skoru — Empty State Handling ───────────────
//
// getKpiScores'un mevcut imzası (number[]) korunuyor — mevcut sayfalar kırılmaz.
// Bu fonksiyon UI'a ek bilgi vermek için ayrı olarak kullanılır.
//
// isDefault: true  → veri yoktu, 50 (nötr) atandı
//            false → gerçek hesaplama yapıldı
//
export interface KpiScoreDetail {
  value: number       // 0-100 arası skor
  isDefault: boolean  // true ise veri yetersiz, global ortalama kullanıldı
  segVal: number      // segmentin ham KPI değeri
  trVal: number       // TR genelinin ham KPI değeri
}

export function getKpiScoresDetailed(
  seg: string, bolge = '', yas = 'Tümü', donem = ''
): KpiScoreDetail[] {
  const segKpis = getKpisFromCube(seg, bolge, yas, donem)
  const trKpis  = getKpisFromCube('', bolge, yas, donem)

  return segKpis.map((v, i) => {
    const r = trKpis[i]
    const hasData = v !== 0 && r !== 0

    if (!hasData) {
      return { value: 50, isDefault: true, segVal: v, trVal: r }
    }

    const ratio = isLowerBetter(i) ? r / v : v / r
    return {
      value: Math.min(100, Math.max(0, Math.round(ratio * 100))),
      isDefault: false,
      segVal: v,
      trVal: r,
    }
  })
}

// ── 2. Akıllı Filtre — Veri Olan Dönemler ────────────────────
//
// CUBE'u tarayarak seçili (seg, bolge, yas) kombinasyonu için
// gerçekten veri olan dönemleri döner.
//
// Kullanım (trend/page.tsx içinde useMemo ile):
//   const availableDonemler = useMemo(
//     () => getAvailableDonemler(selSeg, selBolge, selYas),
//     [selSeg, selBolge, selYas]
//   )
//   // Sonra: donem listesinde availableDonemler'da olmayanları disabled yap
//
export function getAvailableDonemler(
  seg = '', bolge = '', yas = 'Tümü'
): Set<string> {
  const available = new Set<string>()
  for (const r of CUBE) {
    if (r[0] !== seg)  continue
    if (r[1] !== bolge) continue
    if (r[2] !== yas)   continue
    const donem = r[3]
    if (donem === '' || donem == null) continue  // boş = global, dönem değil
    // En az bir KPI'da gerçek veri var mı?
    const hasData = (r[4] as (number|null)[]).some(v => v !== null && v !== 0)
    if (hasData) available.add(donem)
  }
  return available
}

// getAvailableBolgeler — aynı mantık, bolge ekseni için
export function getAvailableBolgeler(
  seg = '', yas = 'Tümü', donem = ''
): Set<string> {
  const available = new Set<string>()
  for (const r of CUBE) {
    if (r[0] !== seg)   continue
    if (r[2] !== yas)   continue
    if (r[3] !== donem) continue
    const bolge = r[1]
    const hasData = (r[4] as (number|null)[]).some(v => v !== null && v !== 0)
    if (hasData) available.add(bolge)
  }
  return available
}
