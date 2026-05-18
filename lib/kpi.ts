import { KpiScore } from '@/types'

// ── Renk ─────────────────────────────────────────────────────
export function scoreColor(v: number | null): string {
  if (!v) return '#4d6070'
  if (v >= 80) return '#10b981'
  if (v >= 70) return '#3b82f6'
  if (v >= 60) return '#f59e0b'
  return '#ef4444'
}

export function scoreBg(v: number | null): string {
  if (!v) return 'rgba(77,96,112,.1)'
  if (v >= 80) return 'rgba(16,185,129,.15)'
  if (v >= 70) return 'rgba(59,130,246,.12)'
  if (v >= 60) return 'rgba(245,158,11,.15)'
  return 'rgba(239,68,68,.12)'
}

export const SEGMENT_COLORS = {
  Premium: '#8b5cf6',
  Mass:    '#3b82f6',
  EV:      '#10b981',
} as const

export const SEGMENT_BG = {
  Premium: 'rgba(139,92,246,.4)',
  Mass:    'rgba(59,130,246,.4)',
  EV:      'rgba(16,185,129,.4)',
} as const

// ── Format ────────────────────────────────────────────────────
export function fmt(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined) return '—'
  return Number(v).toFixed(dec)
}

// ── Marka Agregasyonu ─────────────────────────────────────────
export interface BrandAggregated {
  id: string
  name: string
  segment: string
  op: number
  cu: number
  sv: number
  co: number
  ov: number
  kpis: number[]
  count: number
}

const KPI_KEYS = [
  'idx_work_order_duration','idx_work_order_volume','idx_active_customer_base',
  'idx_labor_hours_per_wo','idx_customer_retention','idx_service_usage',
  'idx_periodic_maintenance','idx_wo_per_service','idx_customer_per_service',
  'idx_parts_revenue_per_cust','idx_warranty_coverage'
]

export function groupByBrand(scores: KpiScore[]): BrandAggregated[] {
  const map: Record<string, any> = {}

  scores.forEach(s => {
    if (!s.brands) return
    const bid = s.brand_id
    if (!map[bid]) {
      map[bid] = {
        id: bid,
        name: s.brands.name,
        segment: s.brands.segment,
        n: 0, op: 0, cu: 0, sv: 0, co: 0, ov: 0,
        kpis: KPI_KEYS.map(() => 0)
      }
    }
    const b = map[bid]
    b.n++
    b.op += s.score_operational    || 0
    b.cu += s.score_customer       || 0
    b.sv += s.score_service_capacity || 0
    b.co += s.score_coverage       || 0
    b.ov += s.score_overall        || 0
    KPI_KEYS.forEach((k, i) => { b.kpis[i] += ((s as any)[k] || 0) })
  })

  return Object.values(map).map(b => ({
    ...b,
    op: +(b.op / b.n).toFixed(1),
    cu: +(b.cu / b.n).toFixed(1),
    sv: +(b.sv / b.n).toFixed(1),
    co: +(b.co / b.n).toFixed(1),
    ov: +(b.ov / b.n).toFixed(1),
    kpis: b.kpis.map((v: number) => +(v / b.n).toFixed(1)),
    count: b.n,
  })).sort((a: any, b: any) => b.ov - a.ov)
}

// ── Bölge Agregasyonu ─────────────────────────────────────────
export interface BolgeAggregated {
  name: string
  ov: number
  kpis: number[]
}

export function groupByBolge(scores: KpiScore[]): BolgeAggregated[] {
  const map: Record<string, any> = {}

  scores.forEach(s => {
    const bn = s.regions?.name
    if (!bn) return
    if (!map[bn]) map[bn] = { name: bn, n: 0, ov: 0, kpis: KPI_KEYS.map(() => 0) }
    map[bn].n++
    map[bn].ov += s.score_overall || 0
    KPI_KEYS.forEach((k, i) => { map[bn].kpis[i] += ((s as any)[k] || 0) })
  })

  return Object.values(map).map(b => ({
    name: b.name,
    ov:   +(b.ov / b.n).toFixed(1),
    kpis: b.kpis.map((v: number) => +(v / b.n).toFixed(1)),
  })).sort((a: any, b: any) => b.ov - a.ov)
}

// ── Dönem Agregasyonu (Trend) ─────────────────────────────────
export interface TrendPoint {
  label: string
  ov: number
  op: number
  cu: number
  sv: number
  co: number
  segs: Record<string, { n: number; ov: number }>
}

export function groupByPeriod(scores: KpiScore[]): TrendPoint[] {
  const map: Record<string, any> = {}

  scores.forEach(s => {
    if (!s.periods) return
    const key = `${s.periods.year} ${s.periods.quarter}`
    if (!map[key]) map[key] = { label: key, n: 0, ov: 0, op: 0, cu: 0, sv: 0, co: 0, segs: {} }
    map[key].n++
    map[key].ov += s.score_overall            || 0
    map[key].op += s.score_operational        || 0
    map[key].cu += s.score_customer           || 0
    map[key].sv += s.score_service_capacity   || 0
    map[key].co += s.score_coverage           || 0
    const seg = s.brands?.segment
    if (seg) {
      if (!map[key].segs[seg]) map[key].segs[seg] = { n: 0, ov: 0 }
      map[key].segs[seg].n++
      map[key].segs[seg].ov += s.score_overall || 0
    }
  })

  return Object.values(map)
    .sort((a: any, b: any) => a.label.localeCompare(b.label))
    .map(p => ({
      label: p.label,
      ov: +(p.ov / p.n).toFixed(1),
      op: +(p.op / p.n).toFixed(1),
      cu: +(p.cu / p.n).toFixed(1),
      sv: +(p.sv / p.n).toFixed(1),
      co: +(p.co / p.n).toFixed(1),
      segs: p.segs,
    }))
}
