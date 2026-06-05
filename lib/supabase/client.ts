import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    const { url, anonKey } = getSupabaseEnv()
    client = createBrowserClient(
      url,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )
  }
  return client
}
