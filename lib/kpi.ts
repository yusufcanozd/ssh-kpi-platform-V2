import RAW from './kpi_data.json'
import MARKA_RAW from './marka_scores.json'

// ── Tipler ────────────────────────────────────────────────────
export interface KpiMeta { 
  no: number; 
  ad: string; 
  kat: string; 
  fmt: string;
  is_lower_better?: boolean; // JSON'da yoksa bile kodda güvenli kontrol için opsiyonel yaptık
}

export const KPI_META: KpiMeta[]    = RAW.kpi_meta as KpiMeta[]
export const BOLGELER: string[]     = RAW.bolgeler as string[]
export const SEGMENTLER: string[]   = RAW.segmentler as string[]
export const YAS_GRUPLARI: string[] = RAW.yas_gruplari as string[]
export const DONEMLER: string[]     = RAW.donemler as string[]
export const YAS_STATS              = RAW.yas_stats as Record<string, number>
export const TOTAL_IO: number       = RAW.total_io as number
export const TOTAL_SERVIS: number   = RAW.total_servis as number

// Cube satırı: [seg, bolge, yas, donem, kpis, n, servis_count]
type CubeRow  = [string, string, string, string, (number | null)[], number, number]
type MarkaRow = [string, string, string, string, number] // marka_scores.json yapısı: [Marka, Segment, Bölge, Yaş, Dönem, Skor]

const CUBE: CubeRow[] = (RAW.cube ?? []) as CubeRow[]

// marka_scores.json bir dizi dizisidir (Array of Arrays)
const MARKA_CUBE: any[] = MARKA_RAW as any[]

// ── Hangi KPI'ın "Düşük Olması Daha İyi" Kontrolü ────────────────
// Eski kodda index'e göre (i === 4) gibi hatalı bir mantık varsa dynamic hale getirdik
export function isLowerBetter(index: number): boolean {
  // Örneğin "İE Başına İşçilik Saati" veya maliyet içeren spesifik KPI'lar düşükse daha iyidir.
  // KPI_META'daki "no" değerine veya adına göre dinamik kontrol yapıyoruz.
  const kpi = KPI_META[index];
  if (!kpi) return false;
  
  // Örnek: Adında "Süresi", "Maliyeti", "Saati" geçen veya JSON'da belirtilen kpi'lar düşükse iyidir
  const ad = kpi.ad.toLowerCase();
  return ad.includes('saati') || ad.includes('maliyeti') || ad.includes('süresi');
}

// ── KPI Değer Formatlama Fonksiyonu ───────────────────────────
export function fmtKpi(val: number | null, fmt: string): string {
  if (val === null || val === undefined) return '—';
  
  switch (fmt) {
    case 'pct4':
    case 'pct1':
      return `%${val.toFixed(1)}`;
    case 'ratio2':
      return val.toFixed(2);
    case 'saat1':
      return `${val.toFixed(1)} sa`;
    case 'tl0':
      return `${Math.round(val).toLocaleString('tr-TR')} TL`;
    default:
      return val.toString();
  }
}

// ── Cube Lookup ───────────────────────────────────────────────
export function getKpisFromCube(seg: string, bolge = '', yas = 'Tümü', donem = ''): (number | null)[] {
  // Eşleşen satırı bul
  const row = CUBE.find(r => r[0] === seg && r[1] === bolge && r[2] === yas && r[3] === donem);
  if (row) return row[4];
  
  // Eğer tam eşleşme yoksa boş array dön (KPI_META uzunluğunda null array)
  return new Array(KPI_META.length).fill(null);
}

// ── Dynamic Skorlama Hesaplama (2. MADDE REVİZYONU) ───────────
// Tüm TR referansına göre normalize et → 0-100 arası skor üretir
export function getKpiScores(seg: string, bolge = '', yas = 'Tümü', donem = ''): number[] {
  const segKpis = getKpisFromCube(seg, bolge, yas, donem);
  const trKpis  = getKpisFromCube('', bolge, yas, donem); // TR Genel Referansı
  
  return segKpis.map((v, i) => {
    const r = trKpis[i];
    if (v === null || r === null || v === undefined || r === undefined || r === 0 || v === 0) {
      return 50; // Veri yoksa nötr skor
    }
    
    // Eğer düşük olması daha iyiyse (isLowerBetter), formülü tersine çeviriyoruz
    const ratio = isLowerBetter(i) ? r / v : v / r;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  });
}

// ── Skor Renklendirmeleri ─────────────────────────────────────
export function kpiScoreColor(v: number): string {
  if (v >= 77) return '#10b981'; // Yeşil
  if (v >= 66) return '#3b82f6'; // Mavi
  return '#ef4444'; // Kırmızı
}

export function kpiScoreBg(v: number): string {
  if (v >= 77) return 'rgba(16,185,129,.15)';
  if (v >= 66) return 'rgba(59,130,246,.12)';
  return 'rgba(239,68,68,.12)';
}

export function chgColor(chg: number | null): string {
  if (chg === null) return 'var(--tx3)';
  if (chg >= 0) return '#10b981';
  return '#ef4444';
}

// Geriye dönük uyumluluk ve sayfalarda hata vermemesi için eklenen yardımcı fonksiyonlar
export function getScore(seg: string, bolge = '', yas = 'Tümü', donem = ''): number {
  const scores = getKpiScores(seg, bolge, yas, donem);
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
}

export function scoreColor(v: number): string { return kpiScoreColor(v); }
export function scoreBg(v: number): string { return kpiScoreBg(v); }
export function heatColor(v: number): string { return kpiScoreColor(v); }
