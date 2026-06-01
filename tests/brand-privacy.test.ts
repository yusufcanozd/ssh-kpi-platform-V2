import { describe, expect, it } from 'vitest'
import { applyBrandPrivacyRule, getBrandPrivacyInfo } from '../lib/kpi'

describe('applyBrandPrivacyRule', () => {
  it('masks 1-3 brands deterministically', () => {
    const rows = [
      { marka: 'A', segment: 'Mass', score: 90 },
      { marka: 'B', segment: 'Mass', score: 80 },
      { marka: 'C', segment: 'Mass', score: 70 },
    ]

    const masked = applyBrandPrivacyRule(rows)

    expect(masked.map(r => r.marka)).toEqual([
      'Gizli Teşebbüs 1',
      'Gizli Teşebbüs 2',
      'Gizli Teşebbüs 3',
    ])
    expect(masked.every(r => r.isMasked === true)).toBe(true)
  })

  it('does not mask 4 or more brands', () => {
    const rows = [
      { marka: 'A' },
      { marka: 'B' },
      { marka: 'C' },
      { marka: 'D' },
    ]

    const result = applyBrandPrivacyRule(rows)

    expect(result.map(r => r.marka)).toEqual(['A', 'B', 'C', 'D'])
    expect(result.every(r => r.isMasked === false)).toBe(true)
  })

  it('returns privacy info for rule of 3', () => {
    expect(getBrandPrivacyInfo(3)).toEqual({ isMasked: true, totalBrands: 3, rule: 'rule-of-3' })
    expect(getBrandPrivacyInfo(4)).toEqual({ isMasked: false, totalBrands: 4, rule: 'none' })
  })
})
