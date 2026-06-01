import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CommentaryRequestBody = {
  prompt?: unknown
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
    return NextResponse.json({ text })
  } catch (err) {
    console.error('Commentary route unexpected error:', err instanceof Error ? err.name : 'unknown')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
