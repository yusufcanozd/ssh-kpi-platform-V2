import { describe, expect, it, vi } from 'vitest'

// permissions.ts içindeki supabase client import'u test ortamında yüklenmesin.
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))

import {
  filterAllowedBrandNames,
  filterAllowedBrands,
  filterAllowedValues,
  isSuperAdminRole,
  shouldApplyUserRestrictions,
} from '../lib/auth/permissions'
import { createDefaultPermissionDraft } from '../types/permissions'

describe('isSuperAdminRole (Prompt 7)', () => {
  it('yalnızca superadmin true döner', () => {
    expect(isSuperAdminRole('superadmin')).toBe(true)
    expect(isSuperAdminRole('admin')).toBe(false)
    expect(isSuperAdminRole(null)).toBe(false)
  })
})

describe('shouldApplyUserRestrictions', () => {
  it('superadmin için kısıt uygulanmaz', () => {
    const p = createDefaultPermissionDraft({ allowed_segments: ['Premium'] })
    expect(shouldApplyUserRestrictions('superadmin', p)).toBe(false)
  })

  it('kısıt yoksa false, en az bir kısıt varsa true', () => {
    expect(shouldApplyUserRestrictions('admin', createDefaultPermissionDraft())).toBe(false)
    expect(shouldApplyUserRestrictions('admin', createDefaultPermissionDraft({ allowed_regions: ['Ege'] }))).toBe(true)
  })
})

describe('filterAllowedValues', () => {
  it('kısıt aktifse yalnızca izinli değerler kalır', () => {
    expect(filterAllowedValues(['Premium', 'Mass', 'Value'], ['Premium', 'Value'], true)).toEqual(['Premium', 'Value'])
  })

  it('kısıt kapalıysa tümü döner', () => {
    expect(filterAllowedValues(['Premium', 'Mass'], ['Premium'], false)).toEqual(['Premium', 'Mass'])
  })

  it('izin listesi boşsa tümü döner', () => {
    expect(filterAllowedValues(['Premium', 'Mass'], [], true)).toEqual(['Premium', 'Mass'])
  })
})

describe('filterAllowedBrands', () => {
  it('id bazlı filtreler', () => {
    const brands = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(filterAllowedBrands(brands, ['a', 'c'], true).map(b => b.id)).toEqual(['a', 'c'])
  })
})

describe('filterAllowedBrandNames', () => {
  it('originalMarka (maskeleme öncesi ad) önceliklidir', () => {
    const rows = [{ marka: 'Gizli Teşebbüs 1', originalMarka: 'GerçekMarka' }, { marka: 'Diğer' }]
    const filtered = filterAllowedBrandNames(rows, ['GerçekMarka'], true)
    expect(filtered.map(r => r.marka)).toEqual(['Gizli Teşebbüs 1'])
  })

  it('kısıt kapalıysa tüm satırlar kalır', () => {
    const rows = [{ marka: 'X' }, { marka: 'Y' }]
    expect(filterAllowedBrandNames(rows, ['X'], false)).toHaveLength(2)
  })
})
