// lib/auth/permissions.ts
// Prompt 7 (2. parça) — Giriş yapan kullanıcının veri görünürlük kısıtları.
// FAIL-OPEN: hata olursa veya kısıt yoksa boş diziler döner (= kısıt yok).

import type { SupabaseClient } from '@supabase/supabase-js'

export interface DataPermissions {
  loaded: boolean
  isSuperadmin: boolean
  /** Boş dizi = kısıt yok (hepsi görünür) */
  allowedSegments: string[]
  allowedRegions: string[]
  allowedBrandIds: string[]
}

export const EMPTY_PERMISSIONS: DataPermissions = {
  loaded: false,
  isSuperadmin: false,
  allowedSegments: [],
  allowedRegions: [],
  allowedBrandIds: [],
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export async function loadCurrentUserPermissions(supabase: SupabaseClient): Promise<DataPermissions> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return { ...EMPTY_PERMISSIONS, loaded: true }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
    const role = typeof profile?.role === 'string' ? profile.role : 'viewer'
    const isSuperadmin = role === 'superadmin'

    if (isSuperadmin) {
      return { loaded: true, isSuperadmin: true, allowedSegments: [], allowedRegions: [], allowedBrandIds: [] }
    }

    const { data: perm } = await supabase
      .from('user_data_permissions')
      .select('allowed_segments, allowed_regions, allowed_brand_ids')
      .eq('user_id', uid)
      .maybeSingle()

    return {
      loaded: true,
      isSuperadmin: false,
      allowedSegments: asStringArray(perm?.allowed_segments),
      allowedRegions: asStringArray(perm?.allowed_regions),
      allowedBrandIds: asStringArray(perm?.allowed_brand_ids),
    }
  } catch {
    return { ...EMPTY_PERMISSIONS, loaded: true } // fail-open
  }
}

/**
 * Geçerli kullanıcının izin verilen marka ADLARINI döndürür (marka kırılımı filtresi için).
 * Boş dizi = kısıt yok / superadmin / hata (fail-open).
 */
export async function resolveAllowedBrandNames(supabase: SupabaseClient): Promise<string[]> {
  try {
    const perm = await loadCurrentUserPermissions(supabase)
    if (perm.isSuperadmin || perm.allowedBrandIds.length === 0) return []
    const { data } = await supabase.from('brands').select('name').in('id', perm.allowedBrandIds)
    if (!Array.isArray(data)) return []
    return data
      .map(row => (row && typeof (row as { name?: unknown }).name === 'string' ? (row as { name: string }).name : ''))
      .filter(Boolean)
  } catch {
    return []
  }
}
