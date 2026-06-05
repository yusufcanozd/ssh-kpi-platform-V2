const REQUIRED_SUPABASE_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export function getSupabaseEnv() {
  const missing = REQUIRED_SUPABASE_ENV.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `[env] Eksik Supabase env degiskeni: ${missing.join(', ')}. ` +
      'Build/deploy oncesi .env.local veya Vercel Environment Variables icinde ' +
      'NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanimlanmali.'
    )
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  }
}
