import { describe, expect, it, vi } from 'vitest'

const refKpis = Array(12).fill(100) as number[]
const regionalKpis = [84, 100, 100, 100, 90, 95, 105, 80, 100, 110, 90, 95] as number[]

const fullRawKpis = [
  90, 100, 110,
  8, 80, 95,
  8, 75,
  100, 120,
  80, 110,
] as number[]

const missingRawKpis = [
  null, 100, 110,
  8, null, 95,
  8, 75,
  100, 120,
  80, 110,
] as Array<number | null>

vi.mock('../lib/kpi/data', () => ({
  getKpisFromCube: vi.fn((seg = '', bolge = '') => {
    if (seg === 'MISSING') return missingRawKpis
    if (bolge === 'Akdeniz') return regionalKpis
    if (seg === '') return refKpis
    return fullRawKpis
  }),
  isZeroVarianceKpi: vi.fn((idx: number) => idx === 1),
  getExcludedKpiIdxs: vi.fn(() => [1]),
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
  overallScoreFromKpis,
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

  it('zero-variance KPI için normalizeKpi geriye dönük uyumlu 100 döner', () => {
    expect(normalizeKpi(0, 0, 1)).toBe(100)
  })
})

describe('kategori ve genel skor hesaplama', () => {
  it('kategori skorlarını coverage-aware hesaplar', () => {
    const score = hesaplaKatveGenelSkor(fullRawKpis, refKpis)
    expect(score.musteri).toBe(100) // KPI 2 zero-variance hariç: (90 + 110) / 2
    expect(score.ticari).toBe(100)
    expect(score.operasyonel).toBe(100)
    expect(score.bayi).toBe(110)
    expect(score.kapsam).toBe(95)
  })

  it('genel skorda kategori ağırlıklarını uygular', () => {
    const score = hesaplaKatveGenelSkor(fullRawKpis, refKpis)
    expect(score.genel).toBe(101)
  })
})

describe('coverage ve detaylı skorlar', () => {
  it('zero-variance KPI coverage dışında kalır', () => {
    const detailed = getScoreDetailed('Mass')
    expect(detailed).not.toBeNull()
    expect(detailed?.coverageRatio).toBeCloseTo(11 / 12, 5)
    expect(detailed?.availableKpiCount).toBe(11)
    expect(detailed?.missingKpis).toEqual([1])
  })

  it('eksik KPI varsa coverage düşer ve eksikler kategori ortalamasından çıkarılır', () => {
    const detailed = getScoreDetailed('MISSING')
    expect(detailed).not.toBeNull()
    expect(detailed?.coverageRatio).toBeCloseTo(9 / 12, 5)
    expect(detailed?.availableKpiCount).toBe(9)
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
})

describe('bölge national referans mantığı', () => {
  it('same-filter mod aynı bölge referansında 100 üretebilir', () => {
    const same = getScoreWithReferenceMode({ seg: '', bolge: 'Akdeniz', yas: 'Tümü', donem: '', referenceMode: 'same-filter' })
    expect(same?.genel).toBe(100)
  })

  it('national mod bölgeyi Türkiye geneline göre farklılaştırır', () => {
    const regional = getRegionalScore('', 'Akdeniz', 'Tümü', '')
    expect(regional).not.toBeNull()
    expect(regional?.genel).not.toBe(100)
  })

  it('precise regional skor ondalıklı değeri koruyabilir', () => {
    const precise = getRegionalScorePrecise('', 'Akdeniz', 'Tümü', '')
    expect(typeof precise?.genel).toBe('number')
    expect(precise?.genel).not.toBe(100)
  })
})

describe('overallScoreFromKpis migration', () => {
  it('deprecated fonksiyon coverage-aware helper ile aynı sonucu döndürür', () => {
    expect(overallScoreFromKpis(fullRawKpis)).toBe(overallScoreFromKpisDetailed(fullRawKpis))
  })
})
