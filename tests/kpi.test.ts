import { describe, expect, it, vi } from 'vitest'

const refKpis = Array(12).fill(100) as number[]
const nationalAll = Array(12).fill(100) as number[]
const nationalMass = Array(12).fill(100) as number[]

const fullRawKpis = [90, 100, 110, 8, 80, 95, 8, 75, 100, 120, 80, 110] as number[]
const regionalAkdeniz = [92, 0, 111, 9, 83, 98, 9, 77, 101, 122, 82, 111] as number[]
const regionalEge = [101, 0, 108, 8.5, 90, 102, 8.7, 82, 110, 117, 85, 105] as number[]
const missingRawKpis = [null, 100, 110, 8, null, 95, 8, 75, 100, 120, 80, 110] as Array<number | null>

vi.mock('../lib/kpi/data', () => ({
  getKpisFromCube: vi.fn((seg = '', bolge = '') => {
    if (seg === 'MISSING') return missingRawKpis
    if (bolge === 'Akdeniz') return regionalAkdeniz
    if (bolge === 'Ege') return regionalEge
    if (seg === 'Mass' && bolge === '') return nationalMass
    if (seg === '' && bolge === '') return nationalAll
    if (seg === '') return refKpis
    return fullRawKpis
  }),
  isZeroVarianceKpi: vi.fn((idx: number) => idx === 1),
  getZeroVarianceKpiIndexes: vi.fn(() => [1]),
}))

import {
  getRegionalScore,
  getRegionalScorePrecise,
  getScore,
  getScoreDetailed,
  getScoreWithReferenceMode,
  hesaplaKatveGenelSkor,
  isLowerBetterByIndex,
  isLowerBetterByNo,
  normalizeKpi,
  normalizeKpiPrecise,
  overallScoreFromKpisDetailed,
} from '../lib/kpi/formula'

describe('normalizeKpi', () => {
  it('yüksek daha iyi KPI için değer / referans × 100 hesaplar', () => {
    expect(normalizeKpi(120, 100, 0)).toBe(120)
    expect(normalizeKpi(80, 100, 0)).toBe(80)
  })

  it('düşük daha iyi KPI için referans / değer × 100 hesaplar', () => {
    expect(isLowerBetterByIndex(3)).toBe(true)
    expect(isLowerBetterByNo(4)).toBe(true)
    expect(normalizeKpi(8, 10, 3)).toBe(125)
    expect(normalizeKpi(12, 10, 3)).toBe(83)
  })

  it('KPI 7 için lower-is-better yönünü doğru kullanır', () => {
    expect(isLowerBetterByIndex(6)).toBe(true)
    expect(isLowerBetterByNo(7)).toBe(true)
    expect(normalizeKpi(8, 10, 6)).toBe(125)
  })

  it('skoru 0-200 bandında tutar', () => {
    expect(normalizeKpi(300, 100, 0)).toBe(200)
    expect(normalizeKpi(-10, 100, 0)).toBe(0)
  })

  it('eksik değer veya eksik referans için geriye dönük uyumlu nötr 100 döner', () => {
    expect(normalizeKpi(null, 100, 0)).toBe(100)
    expect(normalizeKpi(100, null, 0)).toBe(100)
    expect(normalizeKpi(undefined, 100, 0)).toBe(100)
  })

  it('precise normalizasyon ondalık değeri korur', () => {
    expect(normalizeKpiPrecise(100.4, 100, 0)).toBe(100.4)
  })
})

describe('kategori, genel skor ve coverage', () => {
  it('kategori skorlarını doğru KPI gruplarından hesaplar ve KPI 2 sıfır-varyans olduğu için coverage dışına alır', () => {
    const score = hesaplaKatveGenelSkor(fullRawKpis, refKpis)
    expect(score.musteri).toBe(100) // KPI 1 ve 3: (90 + 110) / 2; KPI 2 hariç
    expect(score.ticari).toBe(100)
    expect(score.operasyonel).toBe(100)
    expect(score.bayi).toBe(110)
    expect(score.kapsam).toBe(95)
    expect(score.genel).toBe(101)
  })

  it('eksik KPI varsa coverage düşer ve eksikler kategori ortalamasından çıkarılır', () => {
    const detailed = getScoreDetailed('MISSING')
    expect(detailed).not.toBeNull()
    expect(detailed?.coverageRatio).toBeCloseTo(9 / 12, 5)
    expect(detailed?.missingKpis).toEqual([0, 1, 4])
    expect(detailed?.musteri).toBe(110)
    expect(detailed?.ticari).toBe(110)
  })

  it('getScore ile getScoreDetailed skorları tutarlıdır', () => {
    const score = getScore('Mass')
    const detailed = getScoreDetailed('Mass')
    expect(score?.genel).toBe(detailed?.genel)
    expect(score?.musteri).toBe(detailed?.musteri)
    expect(score?.ticari).toBe(detailed?.ticari)
  })

  it('overallScoreFromKpisDetailed eksik değerleri kategori ortalamasından çıkarır', () => {
    const score = overallScoreFromKpisDetailed([100, null, 120, 100, 100, 100, 100, 100, 100, 100, 100, 100])
    expect(score.musteri).toBe(110)
  })
})

describe('bölge referans modu', () => {
  it('same-filter mevcut getScore davranışını korur', () => {
    expect(getScoreWithReferenceMode('Mass', 'Akdeniz', 'Tümü', '', 'same-filter')?.genel)
      .toBe(getScore('Mass', 'Akdeniz')?.genel)
  })

  it('national mod bölgeyi Tüm Türkiye benchmarkına göre hesaplar', () => {
    const same = getScore('Mass', 'Akdeniz')?.genel
    const national = getRegionalScore('Mass', 'Akdeniz')?.genel
    expect(national).toBeDefined()
    expect(national).not.toBe(same)
  })

  it('precise regional skor ondalık değer koruyabilir', () => {
    const precise = getRegionalScorePrecise('', 'Ege')
    expect(precise?.genel).toEqual(expect.any(Number))
    expect(Number.isInteger(precise?.genel ?? 0)).toBe(false)
  })
})
