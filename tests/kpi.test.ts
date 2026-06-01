import { describe, expect, it, vi } from 'vitest'

const refKpis = [
  100,
  100,
  100,
  10,  // KPI 4 lower-is-better referansı
  100,
  100,
  10,  // KPI 7 lower-is-better referansı
  100,
  100,
  100,
  100,
  100,
] as number[]

const fullRawKpis = [
  90,   // KPI 1  -> 90
  100,  // KPI 2  -> 100
  110,  // KPI 3  -> 110
  8,    // KPI 4  -> lower better: 10 / 8 * 100 = 125
  80,   // KPI 5  -> 80
  95,   // KPI 6  -> 95
  8,    // KPI 7  -> lower better: 10 / 8 * 100 = 125
  75,   // KPI 8  -> 75
  100,  // KPI 9  -> 100
  120,  // KPI 10 -> 120
  80,   // KPI 11 -> 80
  110,  // KPI 12 -> 110
] as number[]

const missingRawKpis = [
  null, // KPI 1 missing; must not be included in category average
  100,
  110,
  8,
  null, // KPI 5 missing; must not be included in category average
  95,
  8,
  75,
  100,
  120,
  80,
  110,
] as Array<number | null>

vi.mock('../lib/kpi/data', () => ({
  getKpisFromCube: vi.fn((seg = '') => {
    if (seg === '') return refKpis
    if (seg === 'MISSING') return missingRawKpis
    return fullRawKpis
  }),
}))

import {
  getScore,
  getScoreDetailed,
  hesaplaKatveGenelSkor,
  isLowerBetterByIndex,
  isLowerBetterByNo,
  normalizeKpi,
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

  it('sıfır değer davranışını korur', () => {
    expect(normalizeKpi(0, 100, 0)).toBe(0)
    expect(normalizeKpi(0, 100, 3)).toBe(100)
    expect(normalizeKpi(0, 0, 0)).toBe(100)
  })
})

describe('kategori ve genel skor hesaplama', () => {
  it('kategori skorlarını doğru KPI gruplarından hesaplar', () => {
    const score = hesaplaKatveGenelSkor(fullRawKpis, refKpis)

    expect(score.musteri).toBe(100)     // KPI 1,2,3: (90 + 100 + 110) / 3
    expect(score.ticari).toBe(100)      // KPI 4,5,6: (125 + 80 + 95) / 3
    expect(score.operasyonel).toBe(100) // KPI 7,8: (125 + 75) / 2
    expect(score.bayi).toBe(110)        // KPI 9,10: (100 + 120) / 2
    expect(score.kapsam).toBe(95)       // KPI 11,12: (80 + 110) / 2
  })

  it('genel skorda kategori ağırlıklarını uygular', () => {
    const score = hesaplaKatveGenelSkor(fullRawKpis, refKpis)

    // 100×0.25 + 100×0.25 + 100×0.25 + 110×0.15 + 95×0.10 = 101
    expect(score.genel).toBe(101)
  })
})

describe('coverage ve detaylı skorlar', () => {
  it('tüm KPI verileri varsa coverage 1 döner', () => {
    const detailed = getScoreDetailed('Mass')

    expect(detailed).not.toBeNull()
    expect(detailed?.coverageRatio).toBe(1)
    expect(detailed?.availableKpiCount).toBe(12)
    expect(detailed?.totalKpiCount).toBe(12)
    expect(detailed?.missingKpis).toEqual([])
  })

  it('eksik KPI varsa coverage düşer ve eksikler kategori ortalamasından çıkarılır', () => {
    const detailed = getScoreDetailed('MISSING')

    expect(detailed).not.toBeNull()
    expect(detailed?.coverageRatio).toBeCloseTo(10 / 12, 5)
    expect(detailed?.availableKpiCount).toBe(10)
    expect(detailed?.missingKpis).toEqual([0, 4])

    // musteri kategorisinde KPI 1 eksik: (100 + 110) / 2 = 105
    expect(detailed?.musteri).toBe(105)

    // ticari kategorisinde KPI 5 eksik: (125 + 95) / 2 = 110
    expect(detailed?.ticari).toBe(110)
  })

  it('getScore ile getScoreDetailed skorları tutarlıdır', () => {
    const score = getScore('Mass')
    const detailed = getScoreDetailed('Mass')

    expect(score).not.toBeNull()
    expect(detailed).not.toBeNull()

    expect(score?.genel).toBe(detailed?.genel)
    expect(score?.musteri).toBe(detailed?.musteri)
    expect(score?.ticari).toBe(detailed?.ticari)
    expect(score?.operasyonel).toBe(detailed?.operasyonel)
    expect(score?.bayi).toBe(detailed?.bayi)
    expect(score?.kapsam).toBe(detailed?.kapsam)
  })
})
