import type { UserRole } from '@/types'

export type PermissionRole = UserRole

export interface UserDataPermission {
  id?: string
  user_id: string
  allowed_segments: string[]
  allowed_brand_ids: string[]
  allowed_regions: string[]
  can_download_reports: boolean
  can_import_data: boolean
  can_access_admin: boolean
  created_at?: string
  updated_at?: string
}

export interface UserPermissionDraft {
  allowed_segments: string[]
  allowed_brand_ids: string[]
  allowed_regions: string[]
  can_download_reports: boolean
  can_import_data: boolean
  can_access_admin: boolean
}

export const DEFAULT_USER_PERMISSION_DRAFT: UserPermissionDraft = {
  allowed_segments: [],
  allowed_brand_ids: [],
  allowed_regions: [],
  can_download_reports: true,
  can_import_data: false,
  can_access_admin: false,
}

export function createDefaultPermissionDraft(overrides?: Partial<UserPermissionDraft>): UserPermissionDraft {
  return {
    ...DEFAULT_USER_PERMISSION_DRAFT,
    ...overrides,
    allowed_segments: overrides?.allowed_segments ?? [],
    allowed_brand_ids: overrides?.allowed_brand_ids ?? [],
    allowed_regions: overrides?.allowed_regions ?? [],
  }
}

export function permissionRowToDraft(row?: Partial<UserDataPermission> | null): UserPermissionDraft {
  return createDefaultPermissionDraft({
    allowed_segments: Array.isArray(row?.allowed_segments) ? row.allowed_segments : [],
    allowed_brand_ids: Array.isArray(row?.allowed_brand_ids) ? row.allowed_brand_ids : [],
    allowed_regions: Array.isArray(row?.allowed_regions) ? row.allowed_regions : [],
    can_download_reports: typeof row?.can_download_reports === 'boolean' ? row.can_download_reports : true,
    can_import_data: typeof row?.can_import_data === 'boolean' ? row.can_import_data : false,
    can_access_admin: typeof row?.can_access_admin === 'boolean' ? row.can_access_admin : false,
  })
}

export function hasAnyDataRestriction(permission?: Pick<UserPermissionDraft, 'allowed_segments' | 'allowed_brand_ids' | 'allowed_regions'> | null): boolean {
  return Boolean(
    permission && (
      permission.allowed_segments.length > 0 ||
      permission.allowed_brand_ids.length > 0 ||
      permission.allowed_regions.length > 0
    )
  )
}

export function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)))
}
