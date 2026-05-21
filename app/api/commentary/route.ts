import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Sen Türkiye otomotiv sektörü SSH (Satış Sonrası Hizmet) rekabet analizi uzmanısın.
Verilen veriyi otomobil sektörü dergisi yazı stilinde, akıcı ve profesyonel Türkçe ile yorumlayacaksın.
Yanıtın maksimum 3-4 cümle, direkt editorial yorum olacak. Madde işareti veya başlık kullanma.`,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err: any) {
    console.error('Commentary API error:', err)
    return NextResponse.json({ error: err.message ?? 'API error' }, { status: 500 })
  }
}
