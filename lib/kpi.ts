import RAW from './kpi_data.json'

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

// Cube satırı: [seg, bolge, yas, donem, kpis, n, servis_count]
type CubeRow = [string, string, string, string, (number|null)[], number, number]
type MarkaRow= [string, string, string, string, (number|null)[], number, number]

const CUBE:  CubeRow[]  = RAW.cube  as CubeRow[]
const MARKA_CUBE: MarkaRow[] = RAW.marka_bolge as MarkaRow[]

// ── Cube lookup ───────────────────────────────────────────────
export function getCube(seg='', bolge='', yas='Tümü', donem=''): CubeRow | null {
  return CUBE.find(r =>
    r[0]===seg && r[1]===bolge && r[2]===yas && r[3]===donem
  ) || null
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

// ── Marka lookup ──────────────────────────────────────────────
export interface MarkaData {
  marka: string; segment: string; bolge: string; yas: string
  kpis: number[]; n: number; servis_count: number
}

export function getMarkaList(bolge='', yas='Tümü'): MarkaData[] {
  const seen = new Map<string, MarkaData>()
  for (const r of MARKA_CUBE) {
    if (r[2]!==bolge || r[3]!==yas) continue
    seen.set(r[0], {
      marka: r[0], segment: r[1], bolge: r[2], yas: r[3],
      kpis: (r[4] as (number|null)[]).map(v => v ?? 0),
      n: r[5], servis_count: r[6]
    })
  }
  return Array.from(seen.values())
}

// ── Segment ortalaması ────────────────────────────────────────
export function getSegAvg(seg: string, kpiIdx: number, bolge='', yas='Tümü', donem=''): number {
  const kpis = getKpisFromCube(seg, bolge, yas, donem)
  return kpis[kpiIdx] ?? 0
}

// ── Renkler ───────────────────────────────────────────────────
export const SEGMENT_COLORS: Record<string,string> = {
  Premium:'#8b5cf6', Mass:'#3b82f6', EV:'#10b981'
}
export const SEGMENT_BG: Record<string,string> = {
  Premium:'rgba(139,92,246,.35)', Mass:'rgba(59,130,246,.35)', EV:'rgba(16,185,129,.35)'
}
export const CAT_COLORS: Record<string,string> = {
  'Müşteri':'#10b981','Ticari':'#3b82f6','Operasyonel':'#f59e0b','Bayi Ağı':'#8b5cf6','Kapsam':'#ef4444'
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
    case 'pct4':   return `${(v*100).toFixed(2)}%`
    case 'pct2':   return `${(v*100).toFixed(1)}%`
    case 'ratio2': return v.toFixed(2)
    case 'ratio1': return v.toFixed(1)
    case 'saat1':  return `${v.toFixed(1)} sa`
    case 'tl0':    return `₺${Math.round(v).toLocaleString('tr-TR')}`
    case 'gun1':   return `${v.toFixed(1)} gün`
    case 'int':    return Math.round(v).toLocaleString('tr-TR')
    default:       return v.toFixed(1)
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
export function isLowerBetter(i: number): boolean { return i===6 }

// ── Normalize skor ────────────────────────────────────────────
export function overallScoreFromKpis(kpis: number[], seg: string, bolge='', yas='Tümü'): number {
  const idxList = [0,2,3,4,5,6,8,9,10,11]
  const scores = idxList.map(i => {
    const avg = getSegAvg(seg, i, bolge, yas)
    if(!avg||!kpis[i]) return 50
    const ratio = isLowerBetter(i) ? avg/kpis[i] : kpis[i]/avg
    return Math.min(100, Math.max(0, Math.round(ratio*70)))
  })
  return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)
}
