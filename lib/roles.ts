export const USER_ROLES = ['superadmin', 'admin', 'analyst', 'viewer'] as const
export type UserRole = typeof USER_ROLES[number]

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

export function isAdminRole(value: unknown): boolean {
  return value === 'superadmin' || value === 'admin'
}

export function defaultRole(): UserRole {
  return 'viewer'
}
