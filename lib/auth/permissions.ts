import { createClient } from '@/lib/supabase/client'
import type { UserDataPermission, UserPermissionDraft } from '@/types/permissions'
import { createDefaultPermissionDraft, hasAnyDataRestriction, permissionRowToDraft } from '@/types/permissions'

export interface PermissionLoadResult {
  permission: UserPermissionDraft
  source: 'supabase' | 'default'
  hasRestrictions: boolean
  error?: string
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === 'superadmin'
}

export function shouldApplyUserRestrictions(role?: string | null, permission?: UserPermissionDraft | null): boolean {
  if (isSuperAdminRole(role)) return false
  return hasAnyDataRestriction(permission)
}

export function filterAllowedValues<T extends string>(allValues: readonly T[], allowedValues: readonly string[], applyRestriction: boolean): T[] {
  if (!applyRestriction || allowedValues.length === 0) return [...allValues]
  const allowedSet = new Set(allowedValues)
  return allValues.filter(value => allowedSet.has(value))
}

export function filterAllowedBrands<T extends { id: string }>(brands: readonly T[], allowedBrandIds: readonly string[], applyRestriction: boolean): T[] {
  if (!applyRestriction || allowedBrandIds.length === 0) return [...brands]
  const allowedSet = new Set(allowedBrandIds)
  return brands.filter(brand => allowedSet.has(brand.id))
}

export async function fetchUserDataPermission(userId: string): Promise<PermissionLoadResult> {
  if (!userId) {
    return {
      permission: createDefaultPermissionDraft(),
      source: 'default',
      hasRestrictions: false,
      error: 'Kullanıcı kimliği bulunamadı.',
    }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_data_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<UserDataPermission>()

    if (error) {
      return {
        permission: createDefaultPermissionDraft(),
        source: 'default',
        hasRestrictions: false,
        error: error.message,
      }
    }

    const permission = permissionRowToDraft(data)
    return {
      permission,
      source: data ? 'supabase' : 'default',
      hasRestrictions: hasAnyDataRestriction(permission),
    }
  } catch (error) {
    return {
      permission: createDefaultPermissionDraft(),
      source: 'default',
      hasRestrictions: false,
      error: error instanceof Error ? error.message : 'Permission okunamadı.',
    }
  }
}
