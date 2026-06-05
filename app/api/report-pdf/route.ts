import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Sunucu tarafi PDF uretimi tam Node runtime + uzun sure gerektirir.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type ProfileAuthRow = { id: string; role?: string | null; is_active?: boolean | null }

// Faz 1a: yalnizca pipeline kanitidir — gercek rapor HTML'i Faz 1b'de uretilecek.
// Amac: @sparticuz/chromium'in Vercel'de PDF urettigini dogrulamak.
function buildProofHtml(periodLabel: string): string {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 210mm; height: 297mm; font-family: Arial, Helvetica, sans-serif; }
  .page { position: relative; width: 210mm; height: 297mm; padding: 18mm 16mm; overflow: hidden; background: #fff; }
  .topbar { display: flex; align-items: center; gap: 10px; border-top: 4px solid #c0392b; border-bottom: 1px solid #1a1a1a; padding: 8px 0; }
  .topbar .logo { width: 54px; height: 30px; background: #1a1a1a; color: #fff; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; clip-path: polygon(0 0, 86% 0, 100% 50%, 86% 100%, 0 100%); }
  .topbar .ttl { font-size: 13px; font-weight: 800; letter-spacing: .12em; color: #1a1a1a; text-transform: uppercase; }
  .chev { margin-left: auto; display: flex; gap: 4px; }
  .chev span { width: 0; height: 0; border-top: 7px solid transparent; border-bottom: 7px solid transparent; border-left: 11px solid #c0392b; }
  .chev span:nth-child(2){ border-left-color:#1a1a1a } .chev span:nth-child(3){ border-left-color:#1a1a1a }
  .hero { margin-top: 26mm; position: relative; }
  .stripes { position: absolute; left: 0; top: -10mm; width: 60mm; height: 16mm; background: repeating-linear-gradient(135deg,#c0392b 0 6px,#fff 6px 12px); }
  .hero h1 { font-size: 52px; font-weight: 900; color: #1a1a1a; line-height: 1.02; letter-spacing: -1px; }
  .hero .sub { margin-top: 8px; font-size: 16px; color: #c0392b; font-weight: 700; }
  .hex { position: absolute; right: 0; top: 30mm; width: 70mm; height: 70mm; background: #1a1a1a; clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%); }
  .hex .score { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
  .hex .score b { font-size: 64px; font-weight: 900; }
  .hex .score em { font-style: normal; font-size: 11px; letter-spacing: .2em; color: #e74c3c; }
  .meta { position: absolute; left: 16mm; bottom: 22mm; }
  .meta .k { font-size: 10px; letter-spacing: .18em; color: #7a7a7a; text-transform: uppercase; }
  .meta .v { font-size: 22px; font-weight: 800; color: #1a1a1a; }
  .footer { position: absolute; left: 16mm; right: 16mm; bottom: 12mm; display: flex; justify-content: space-between; border-top: 1px solid #d6dde6; padding-top: 6px; font-size: 9px; color: #64748b; }
</style></head>
<body>
  <div class="page">
    <div class="topbar">
      <div class="logo">SSH</div>
      <div class="ttl">Türkiye Otomotiv Sektörü</div>
      <div class="chev"><span></span><span></span><span></span></div>
    </div>

    <div class="hero">
      <div class="stripes"></div>
      <h1>SSH Rekabet<br/>Analizi</h1>
      <div class="sub">Satış Sonrası Hizmet KPI Performans Raporu</div>
      <div class="hex"><div class="score"><em>GENEL SKOR</em><b>100</b></div></div>
    </div>

    <div class="meta">
      <div class="k">Rapor Dönemi</div>
      <div class="v">${periodLabel}</div>
    </div>

    <div class="footer">
      <span>SSH Rekabet Analizi · Pipeline Proof (Faz 1a)</span>
      <span>${periodLabel}</span>
    </div>
  </div>
</body></html>`
}

async function launchBrowser() {
  const isProd = process.env.NODE_ENV === 'production'
  const puppeteer = await import('puppeteer-core')

  if (isProd) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  // Yerel gelistirme: sistemde kurulu Chrome/Chromium kullanilir.
  return puppeteer.launch({ channel: 'chrome', headless: true })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', userData.user.id)
      .single()

    const authRow = profile as ProfileAuthRow | null
    if (!authRow || authRow.is_active === false) {
      return NextResponse.json({ error: 'Bu işlem için aktif kullanıcı gerekli.' }, { status: 403 })
    }

    let periodLabel = '2025-FY'
    try {
      const body = await req.json()
      if (body && typeof body.periodLabel === 'string') periodLabel = body.periodLabel.slice(0, 40)
    } catch {
      // gövde opsiyonel
    }

    const html = buildProofHtml(periodLabel)

    const browser = await launchBrowser()
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'load' })
      const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })

      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="ssh-rapor-proof.pdf"',
          'Cache-Control': 'no-store',
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF üretilemedi.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
