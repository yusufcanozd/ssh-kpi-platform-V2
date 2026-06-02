export const SESSION_MARKER_KEY = 'ssh-kpi-active-browser-session'

export function clearSupabaseBrowserSession() {
  if (typeof window === 'undefined') return

  const clear = (storage: Storage) => {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i)
      if (!key) continue
      if (
        key === SESSION_MARKER_KEY ||
        key.startsWith('sb-') ||
        key.includes('supabase.auth')
      ) {
        storage.removeItem(key)
      }
    }
  }

  try { clear(window.localStorage) } catch {}
  try { clear(window.sessionStorage) } catch {}
}

export function establishBrowserSession() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_MARKER_KEY, String(Date.now()))
  } catch {}
}

export function hasActiveBrowserSession() {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(window.sessionStorage.getItem(SESSION_MARKER_KEY))
  } catch {
    return false
  }
}

export function clearBrowserSessionMarker() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(SESSION_MARKER_KEY) } catch {}
}

export function clearSupabaseAuthCookies() {
  if (typeof document === 'undefined') return

  const hostname = window.location.hostname
  const domainParts = hostname.split('.')
  const domainCandidates = [undefined, hostname]

  if (domainParts.length > 2) {
    domainCandidates.push(`.${domainParts.slice(-2).join('.')}`)
  }

  document.cookie
    .split(';')
    .map(cookie => cookie.split('=')[0]?.trim())
    .filter(Boolean)
    .filter(name => name.startsWith('sb-') || name.includes('supabase-auth-token'))
    .forEach(name => {
      domainCandidates.forEach(domain => {
        const domainPart = domain ? `; domain=${domain}` : ''
        document.cookie = `${name}=; Max-Age=0; path=/${domainPart}; SameSite=Lax`
      })
    })
}
