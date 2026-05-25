import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ve Sabitler ──────────────────────────────────────────
export interface KpiMeta {
  no: number
  ad: string
  kat: string
  fmt: string
  is_lower_better?: boolean
}

export const KPI_META: KpiMeta[]    = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]     = RAW.bolgeler as string[]
export const SEGMENTLER: string[]   = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[] = RAW.yas_gruplari as string[]
export const DONEMLER: string[]     = RAW.donemler as string[]

type CubeRow  = [string, string, string, string, (number|null)[], number, number]
const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]

// ── Veri Çekme Motoru ──────────────────────────────────────────
export function getKpisFromCube(seg: string, bolge: string, yas: string, donem: string): (number|null)[] {
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem)
  return row ? row[4] : KPI_META.map(() => null)
}

// ── NORMALİZASYON: Performans Skoru Hesaplayıcı ────────────────
/**
 * Her KPI için: (Seçili Değer / TR Genel Ortalaması) * 100
 * Sonuç 1.702 gibi ham veri değil, 90-110 arası bir performans skorudur.
 */
export function getKpiScores(
  seg: string, 
  bolge: string, 
  yas: string, 
  donem: string
): number[] {
  const rawKpis = getKpisFromCube(seg, bolge, yas, donem)
  
  // TR Genelini çekmek için filtreleri sıfırla:
  // Bölge ve Yaş filtrelerini boş bırakarak her zaman "Genel TR" bazını alıyoruz.
  const trKpis = getKpisFromCube('', '', 'Tümü', donem)

  return rawKpis.map((val, i) => {
    const ref = trKpis[i]
    
    // Veri yoksa veya referans 0 ise 100 (nötr skor) dön
    if (val === null || ref === null || ref === 0) return 100 
    
    // Normalizasyon: (Değer / Referans) * 100
    const score = (val / ref) * 100
    return Math.round(score)
  })
}

// ── Yardımcı Fonksiyonlar ──────────────────────────────────────
export function kpiScoreColor(score: number): string {
  if (score >= 100) return '#10b981' // Yeşil (Başarılı)
  if (score >= 90) return '#f59e0b'  // Sarı (Sınırda)
  return '#ef4444'                   // Kırmızı (Düşük)
}

export function kpiScoreBg(score: number): string {
  if (score >= 100) return 'rgba(16,185,129,.15)'
  if (score >= 90) return 'rgba(245,158,11,.15)'
  return 'rgba(239,68,68,.15)'
}

// ── Mevcut Marka Sıralama Fonksiyonun (Bunu koruyabilirsin) ──
export function getMarkaList() {
    return Array.from(new Set(MARKA_RAW.cube.map((r: any) => r[0])))
}

export function getMarkaKpiScores(marka: string, bolge: string, yas: string, donem: string): number[] {
    // Marka bazlı skorların varsa burada hesapla, yoksa 100 dön
    return KPI_META.map(() => 100)
}
