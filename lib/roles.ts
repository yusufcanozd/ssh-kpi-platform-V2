export const USER_ROLES = ['superadmin', 'admin', 'analyst', 'viewer'] as const
export type UserRole = typeof USER_ROLES[number]

export const ADMIN_ROLES: readonly UserRole[] = ['superadmin', 'admin']

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

export function isAdminRole(value: unknown): boolean {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value)
}

export function isSuperAdminRole(value: unknown): boolean {
  return value === 'superadmin'
}
