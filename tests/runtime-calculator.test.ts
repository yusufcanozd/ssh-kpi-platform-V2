import { describe, expect, it } from 'vitest'
import { createRuntimeCalculator } from '../lib/kpi/runtime-calculator'
import { KPI_META } from '../lib/kpi/config'
import type { CubeRow } from '../lib/kpi/data'
import type { ActiveWeightRow, KpiDefinitionRow, KpiRuntimeData } from '../lib/kpi/data-source-types'

const PERIOD = '2024-Q4'
const BOLGE = 'Marmara'
const N = KPI_META.length

const fill = (v: number): number[] => Array(N).fill(v)

const allHigher: KpiDefinitionRow[] = KPI_META.map(m => ({ ...m, is_lower_better: false, source: 'fallback' }))
const allLower: KpiDefinitionRow[] = KPI_META.map(m => ({ ...m, is_lower_better: true, source: 'fallback' }))

function cube(segKpis: number[], refKpis?: number[]): CubeRow[] {
  const rows: CubeRow[] = [['Premium', BOLGE, 'Tümü', PERIOD, segKpis, 50, 50]]
  if (refKpis) rows.unshift(['', BOLGE, 'Tümü', PERIOD, refKpis, 100, 100])
  return rows
}

function runtime(cubeRows: CubeRow[], opts: { weights?: ActiveWeightRow[]; kpiDefinitions?: KpiDefinitionRow[] } = {}): KpiRuntimeData {
  return {
    cubeRows,
    markaRows: [],
    dimensions: { segments: ['Premium'], regions: [BOLGE], ageGroups: ['Tümü'], periods: [PERIOD] },
    weights: opts.weights,
    kpiDefinitions: opts.kpiDefinitions,
  } as unknown as KpiRuntimeData
}

const score = (rt: KpiRuntimeData) =>
  createRuntimeCalculator(rt).getScore('Premium', BOLGE, 'Tümü', PERIOD)?.genel ?? null

describe('runtime engine — KPI yönü (Prompt 9)', () => {
  it('higher_is_better: değer referansın üzerindeyse skor > 100', () => {
    expect(score(runtime(cube(fill(110), fill(100)), { kpiDefinitions: allHigher }))).toBe(110)
  })

  it('lower_is_better: aynı veride yön ters çevrilince skor < 100', () => {
    // 100/110 ≈ 0.909 -> 91
    expect(score(runtime(cube(fill(110), fill(100)), { kpiDefinitions: allLower }))).toBe(91)
  })
})

describe('runtime engine — dinamik ağırlık (Prompt 5)', () => {
  // Sadece müşteri kategorisi (KPI 0-2) 120, kalanlar 100; referans 100; tümü higher.
  const seg = fill(100)
  seg[0] = 120; seg[1] = 120; seg[2] = 120
  const base = cube(seg, fill(100))

  it('varsayılan ağırlıklarla genel = 105', () => {
    // müşteri 120 * .25 + (diğerleri 100) * .75 = 105
    expect(score(runtime(base, { kpiDefinitions: allHigher }))).toBe(105)
  })

  it('müşteri ağırlığı %100 yapılınca genel = 120', () => {
    const weights: ActiveWeightRow[] = [
      { categoryKey: 'musteri', weight: 100, source: 'fallback' },
      { categoryKey: 'ticari', weight: 0, source: 'fallback' },
      { categoryKey: 'operasyonel', weight: 0, source: 'fallback' },
      { categoryKey: 'bayi', weight: 0, source: 'fallback' },
      { categoryKey: 'kapsam', weight: 0, source: 'fallback' },
    ]
    expect(score(runtime(base, { kpiDefinitions: allHigher, weights }))).toBe(120)
  })
})

describe('runtime engine — referans davranışı', () => {
  it('referans hücresi yoksa skor 100 (nötr) olur', () => {
    // sadece segment satırı; "" referans satırı yok
    expect(score(runtime(cube(fill(110)), { kpiDefinitions: allHigher }))).toBe(100)
  })

  it('düz CubeRow[] (statik metodoloji) ile de sonlu skor üretir', () => {
    const calc = createRuntimeCalculator(cube(fill(110), fill(100)))
    const genel = calc.getScore('Premium', BOLGE, 'Tümü', PERIOD)?.genel
    expect(typeof genel).toBe('number')
    expect(Number.isFinite(genel)).toBe(true)
  })

  it('getKpisFromCube ve getN ham cube değerlerini döndürür', () => {
    const calc = createRuntimeCalculator(cube(fill(110), fill(100)))
    expect(calc.getKpisFromCube('Premium', BOLGE, 'Tümü', PERIOD)[0]).toBe(110)
    expect(calc.getN('Premium', BOLGE, 'Tümü', PERIOD)).toBe(50)
  })
})
