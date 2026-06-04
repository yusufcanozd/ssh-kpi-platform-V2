import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CommentaryRequestBody = {
  prompt?: unknown
  cacheKey?: unknown
  params?: unknown
}

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>
  error?: { message?: string }
}

type ProfileAuthRow = {
  id: string
  role?: string | null
  is_active?: boolean | null
}

const MAX_PROMPT_LENGTH = 4000
const MAX_CACHE_KEY_LENGTH = 180
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 10

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  current.count += 1
  return true
}


function normalizeCacheKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const key = value.trim()
  if (!key || key.length > MAX_CACHE_KEY_LENGTH) return null
  if (!/^[a-zA-Z0-9:_-]+$/.test(key)) return null
  return key
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function readCachedCommentary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cacheKey: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('report_cache')
      .select('content')
      .eq('user_id', userId)
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (error) return null

    const content = (data as { content?: unknown } | null)?.content
    if (!isJsonObject(content)) return null
    return typeof content.text === 'string' ? content.text : null
  } catch {
    // Migration henüz çalıştırılmadıysa cache sessizce devre dışı kalır.
    return null
  }
}

async function writeCachedCommentary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cacheKey: string,
  params: unknown,
  text: string
): Promise<void> {
  try {
    await supabase
      .from('report_cache')
      .upsert({
        user_id: userId,
        cache_key: cacheKey,
        params: isJsonObject(params) ? params : {},
        content: { text },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cache_key' })
  } catch {
    // Cache yazılamazsa AI yanıtı yine kullanıcıya döndürülür.
  }
}

async function parseRequestBody(req: NextRequest): Promise<CommentaryRequestBody | null> {
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    return body as CommentaryRequestBody
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .single<ProfileAuthRow>()

    if (profileError || !profile?.is_active) {
      return NextResponse.json({ error: 'Bu işlem için aktif kullanıcı gerekli.' }, { status: 403 })
    }

    const rateLimitKey = `${user.id}:${getClientIp(req)}`

    // Basit in-memory rate limit. Serverless ortamlarda instance bazlı çalışır;
    // production için Upstash Redis veya benzeri merkezi bir rate limit önerilir.
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    const body = await parseRequestBody(req)
    if (!body) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
    }

    const prompt = body.prompt
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: 'prompt too long' }, { status: 413 })
    }

    const normalizedCacheKey = normalizeCacheKey(body.cacheKey)
    const cacheKey = normalizedCacheKey ? `${user.id}:${normalizedCacheKey}` : null
    if (cacheKey) {
      const cachedText = await readCachedCommentary(supabase, user.id, cacheKey)
      if (cachedText !== null) {
        return NextResponse.json({ text: cachedText, cached: true })
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('Commentary endpoint configuration error: ANTHROPIC_API_KEY is missing')
      return NextResponse.json({ error: 'AI yorum servisi yapılandırılmamış.' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: `Sen Türkiye otomotiv sektörü SSH (Satış Sonrası Hizmet) rekabet analizi uzmanısın.
Verilen veriyi otomobil sektörü dergisi yazı stilinde, akıcı ve profesyonel Türkçe ile yorumlayacaksın.
Yanıtın maksimum 3-4 cümle, direkt editorial yorum olacak. Madde işareti veya başlık kullanma.`,
        messages: [{ role: 'user', content: prompt.trim() }],
      }),
    })

    let data: AnthropicResponse | null = null
    try {
      data = (await res.json()) as AnthropicResponse
    } catch {
      data = null
    }

    if (!res.ok) {
      console.error('Commentary provider error:', res.status)
      return NextResponse.json({ error: 'AI yorum servisi şu anda yanıt veremiyor.' }, { status: 502 })
    }

    const text = data?.content?.find((item) => typeof item.text === 'string')?.text ?? ''
    if (cacheKey && text) {
      await writeCachedCommentary(supabase, user.id, cacheKey, body.params, text)
    }
    return NextResponse.json({ text, cached: false })
  } catch (err) {
    console.error('Commentary route unexpected error:', err instanceof Error ? err.name : 'unknown')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
