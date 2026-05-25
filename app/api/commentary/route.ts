import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }
    if (prompt.length > 8000) {
      return NextResponse.json({ error: 'prompt too long' }, { status: 413 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: `Sen Türkiye otomotiv sektörü SSH (Satış Sonrası Hizmet) rekabet analizi uzmanısın.
Verilen veriyi otomobil sektörü dergisi yazı stilinde, akıcı ve profesyonel Türkçe ile yorumlayacaksın.
Yanıtın maksimum 3-4 cümle, direkt editorial yorum olacak. Madde işareti veya başlık kullanma.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Anthropic API error:', res.status, JSON.stringify(data))
      return NextResponse.json({ error: data.error?.message ?? 'Anthropic API error' }, { status: res.status })
    }

    const text = data.content?.[0]?.text ?? ''
    return NextResponse.json({ text })
  } catch (err: any) {
    console.error('Commentary route error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
