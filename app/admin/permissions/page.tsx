import { redirect } from 'next/navigation'

// Legacy route kept intentionally so old bookmarks do not break.
// Canonical route for this module is /admin/user-permissions.
export default function LegacyPermissionsRedirectPage() {
  redirect('/admin/user-permissions')
}
