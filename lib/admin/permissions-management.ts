// lib/admin/permissions-management.ts
// Prompt 7 (1. parça) — Kullanıcı veri görünürlüğü kısıtları.
// profiles + user_data_permissions okunur/yazılır. Seçenekler segments/brands/BOLGELER'den gelir.

import type { SupabaseClient } from '@supabase/supabase-js'
import { BOLGELER } from '@/lib/kpi'
import { getActiveSegmentNames } from '@/lib/admin/segments-management'
import { loadBrands } from '@/lib/admin/brands-management'

export interface AdminUserPermission {
  userId: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  allowedSegments: string[]
  allowedBrandIds: string[]
  allowedRegions: string[]
  canDownloadReports: boolean
  canImportData: boolean
  canAccessAdmin: boolean
  /** user_data_permissions satırı var mı (yoksa rol bazlı default geçerli) */
  hasRow: boolean
}

export interface PermissionOptions {
  segments: string[]
  brands: Array<{ id: string; name: string }>
  regions: string[]
}

export interface PersistResult<T> {
  data?: T
  error?: string
}

export const REGION_OPTIONS: string[] = BOLGELER ?? []

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}
function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/** Kullanıcı + izin kayıtlarını birleştirip döndürür. */
export async function loadUserPermissions(supabase: SupabaseClient): Promise<{ users: AdminUserPermission[]; warning?: string }> {
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .order('full_name', { ascending: true })

  if (profileError) {
    return { users: [], warning: 'profiles okunamadı: ' + profileError.message }
  }

  const { data: permRows } = await supabase.from('user_data_permissions').select('*')
  const permByUser = new Map<string, Record<string, unknown>>()
  if (Array.isArray(permRows)) {
    permRows.forEach(row => {
      const record = toRecord(row)
      if (record && typeof record.user_id === 'string') permByUser.set(record.user_id, record)
    })
  }

  const users: AdminUserPermission[] = (Array.isArray(profileRows) ? profileRows : []).map(row => {
    const record = toRecord(row) ?? {}
    const userId = asString(record.id)
    const perm = permByUser.get(userId)
    return {
      userId,
      fullName: asString(record.full_name, '—'),
      email: asString(record.email),
      role: asString(record.role, 'viewer'),
      isActive: asBoolean(record.is_active, true),
      allowedSegments: perm ? asStringArray(perm.allowed_segments) : [],
      allowedBrandIds: perm ? asStringArray(perm.allowed_brand_ids) : [],
      allowedRegions: perm ? asStringArray(perm.allowed_regions) : [],
      canDownloadReports: perm ? asBoolean(perm.can_download_reports, true) : true,
      canImportData: perm ? asBoolean(perm.can_import_data, false) : false,
      canAccessAdmin: perm ? asBoolean(perm.can_access_admin, false) : false,
      hasRow: Boolean(perm),
    }
  })

  return { users }
}

/** Kısıt formundaki seçenek kaynakları. */
export async function loadPermissionOptions(supabase: SupabaseClient): Promise<PermissionOptions> {
  const [segments, brandResult] = await Promise.all([
    getActiveSegmentNames(supabase),
    loadBrands(supabase),
  ])
  const brands = brandResult.brands
    .filter(brand => brand.isActive && isUuid(brand.id)) // sadece DB'de uuid'i olan markalar kısıtlanabilir
    .map(brand => ({ id: brand.id, name: brand.name }))
  return { segments, brands, regions: REGION_OPTIONS }
}

/** İzinleri user_data_permissions tablosuna upsert eder. */
export async function saveUserPermission(supabase: SupabaseClient, perm: AdminUserPermission): Promise<PersistResult<true>> {
  const row = {
    user_id: perm.userId,
    allowed_segments: perm.allowedSegments,
    allowed_brand_ids: perm.allowedBrandIds,
    allowed_regions: perm.allowedRegions,
    can_download_reports: perm.canDownloadReports,
    can_import_data: perm.canImportData,
    can_access_admin: perm.canAccessAdmin,
  }
  const { error } = await supabase.from('user_data_permissions').upsert(row, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      actor_id: data.user?.id ?? null,
      action: 'update',
      entity: 'user_data_permission',
      entity_id: perm.userId,
      summary: `${perm.fullName} izinleri güncellendi`,
      metadata: { segments: perm.allowedSegments.length, brands: perm.allowedBrandIds.length, regions: perm.allowedRegions.length },
    })
  } catch { /* audit kritik değil */ }
  return { data: true }
}

/** Tüm kısıtları temizler (rol bazlı default'a döner). */
export async function clearUserPermission(supabase: SupabaseClient, userId: string): Promise<PersistResult<true>> {
  const { error } = await supabase.from('user_data_permissions').delete().eq('user_id', userId)
  if (error) return { error: error.message }
  return { data: true }
}
