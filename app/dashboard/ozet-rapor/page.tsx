'use client'

import { useMemo, useState, useEffect } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG,
  BOLGELER, YAS_GRUPLARI, DONEMLER, CAT_COLORS,
  fmtKpi, getKpisFromCube, getScore, getKpiScores, getMarkaRanking,
  isLowerBetter, heatColor,
} from '@/lib/kpi'
import styles from './page.module.css'

// ── Yardımcı: dönem listesi ───────────────────────────────────────────────────
const Q_DONEMLER  = DONEMLER.filter(d => d.includes('-Q')).sort()
const FY_DONEMLER = DONEMLER.filter(d => d.includes('-FY')).sort()

function prevDonem(d: string): string | null {
  if (!d) return null
  if (d.endsWith('-FY')) { const y = parseInt(d); return `${y-1}-FY` }
  const [y, q] = d.split('-Q').map(Number)
  if (q === 1) return `${y-1}-Q4`
  return `${y}-Q${q-1}`
}

// ── Veri hazırlama ────────────────────────────────────────────────────────────
function buildReportData(donem: string, bolge: string, yas: string) {
  const prev = prevDonem(donem)

  // Genel TR
  const trKpis     = getKpisFromCube('', bolge, yas, donem)
  const trKpisPrev = prev ? getKpisFromCube('', bolge, yas, prev) : null
  const trScore    = getScore('', bolge, yas, donem)
  const trScorePrev = prev ? getScore('', bolge, yas, prev) : null

  // Segmentler
  const segData = SEGMENTLER.map(seg => ({
    seg,
    kpis:     getKpisFromCube(seg, bolge, yas, donem),
    kpisPrev: prev ? getKpisFromCube(seg, bolge, yas, prev) : null,
    score:    getScore(seg, bolge, yas, donem),
    scorePrev: prev ? getScore(seg, bolge, yas, prev) : null,
    kpiScores: getKpiScores(seg, bolge, yas, donem),
    markalar: getMarkaRanking(seg, bolge, yas, donem).slice(0, 5),
  }))

  // Bölgeler (top 5)
  const bolgeData = BOLGELER.slice(0, 6).map(b => ({
    bolge: b,
    score: getScore('', b, yas, donem),
    kpis:  getKpisFromCube('', b, yas, donem),
  }))

  // Yaş kırılımı
  const yasData = YAS_GRUPLARI.filter(y => y !== 'Tümü').map(y => ({
    yas: y,
    score: getScore('', bolge, y, donem),
    kpis:  getKpisFromCube('', bolge, y, donem),
  }))

  // KPI trend (son 4 Q)
  const trendDonemler = Q_DONEMLER.slice(-4)
  const kpiTrend = KPI_META.map((k, i) => ({
    ...k, i,
    values: trendDonemler.map(d => getKpisFromCube('', bolge, yas, d)[i] ?? 0),
  }))

  // Kategori skorları
  const katData = [
    { key: 'musteri', label: 'Müşteri', color: CAT_COLORS['Müşteri'] || '#10b981' },
    { key: 'ticari', label: 'Ticari', color: CAT_COLORS['Ticari'] || '#3b82f6' },
    { key: 'operasyonel', label: 'Operasyonel', color: CAT_COLORS['Operasyonel'] || '#f59e0b' },
    { key: 'bayi', label: 'Bayi Ağı', color: CAT_COLORS['Bayi Ağı'] || '#8b5cf6' },
    { key: 'kapsam', label: 'Kapsam', color: CAT_COLORS['Kapsam'] || '#ef4444' },
  ].map(k => ({
    ...k,
    trVal:   trScore ? (trScore as any)[k.key] ?? 0 : 0,
    prevVal: trScorePrev ? (trScorePrev as any)[k.key] ?? 0 : null,
    segVals: SEGMENTLER.map(seg => ({
      seg,
      val: (() => { const sc = getScore(seg, bolge, yas, donem); return sc ? (sc as any)[k.key] ?? 0 : 0 })(),
    })),
  }))

  // Puan kaybeden KPI'lar
  const kayiplar = KPI_META.map((k, i) => {
    const curr = trKpis[i] ?? 0
    const prv  = trKpisPrev?.[i] ?? 0
    if (!prv || !curr) return null
    const pct = ((curr - prv) / Math.abs(prv)) * 100
    return { ...k, i, curr, prev: prv, pct: Math.round(pct * 10) / 10 }
  }).filter(Boolean).filter(k => {
    if (!k) return false
    return isLowerBetter(k.i) ? k.pct > 3 : k.pct < -3
  }) as NonNullable<ReturnType<typeof KPI_META.map> extends (infer T)[] ? T : never>[]

  return {
    donem, prev, trKpis, trKpisPrev, trScore, trScorePrev,
    segData, bolgeData, yasData, kpiTrend, trendDonemler,
    katData, kayiplar,
  }
}

// ── Mini SVG grafikler ────────────────────────────────────────────────────────
function MiniBarChart({ data, colors, labels, height = 60 }: {
  data: number[]; colors: string[]; labels: string[]; height?: number
}) {
  const max = Math.max(...data, 1)
  const w = 280, barW = Math.floor(w / data.length) - 4
  return (
    <svg width={w} height={height + 20} style={{ overflow: 'visible' }}>
      {data.map((v, i) => {
        const bh = Math.round((v / max) * height)
        const x = i * (barW + 4) + 2
        return (
          <g key={i}>
            <rect x={x} y={height - bh} width={barW} height={bh}
              rx={2} fill={colors[i % colors.length] + 'cc'} />
            <text x={x + barW/2} y={height + 14} textAnchor="middle"
              fontSize={7} fill="#6b7280">{labels[i]}</text>
            <text x={x + barW/2} y={height - bh - 3} textAnchor="middle"
              fontSize={7} fill={colors[i % colors.length]} fontWeight="700">
              {Math.round(v)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MiniLineChart({ values, color, width = 160, height = 40, labels }: {
  values: number[]; color: string; width?: number; height?: number; labels?: string[]
}) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height * 0.8 - height * 0.1,
  }))
  const d = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height + 16} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          {labels && <text x={p.x} y={height + 13} textAnchor="middle" fontSize={7} fill="#9ca3af">{labels[i]}</text>}
          <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize={7} fill={color} fontWeight="700">
            {values[i].toLocaleString('tr-TR', {maximumFractionDigits: 0})}
          </text>
        </g>
      ))}
    </svg>
  )
}

function ScoreBadge({ val, size = 'md' }: { val: number; size?: 'sm'|'md'|'lg' }) {
  const c = val >= 100 ? '#10b981' : val >= 90 ? '#f59e0b' : '#ef4444'
  const bg = val >= 100 ? '#d1fae5' : val >= 90 ? '#fef3c7' : '#fee2e2'
  const fs = size === 'lg' ? 28 : size === 'md' ? 18 : 13
  const pad = size === 'lg' ? '8px 16px' : size === 'md' ? '4px 10px' : '2px 6px'
  return (
    <span style={{ background: bg, color: c, borderRadius: 8, padding: pad,
      fontSize: fs, fontWeight: 800, fontFamily: 'var(--font-dm-mono)',
      border: `1px solid ${c}44` }}>
      {val}
    </span>
  )
}

function Kart({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)',
      borderRadius: 10, padding: '14px 16px', ...style }}>
      {children}
    </div>
  )
}

function KartBaslik({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: color || 'var(--tx2)',
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  )
}

function DeltaBadge({ val, lob = false }: { val: number; lob?: boolean }) {
  const better = lob ? val < 0 : val > 0
  const c = better ? '#10b981' : val === 0 ? '#9ca3af' : '#ef4444'
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: c }}>
      {val > 0 ? `▲ +${val}%` : val < 0 ? `▼ ${val}%` : '→ 0%'}
    </span>
  )
}

// ── Yorum üretici (Next.js API route üzerinden) ───────────────────────────────
async function generateCommentary(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('Commentary API error:', res.status, data)
      return ''
    }
    return data.text ?? ''
  } catch (err) {
    console.error('Commentary fetch error:', err)
    return ''
  }
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function OzetRaporPage() {
  const { selBolge, selYas } = useDashboardCtx()
  const [mounted, setMounted] = useState(false)
  const [seciliDonem, setSeciliDonem] = useState(Q_DONEMLER[Q_DONEMLER.length - 1] ?? '')
  const [generating, setGenerating] = useState(false)
  const [raporData, setRaporData] = useState<ReturnType<typeof buildReportData> | null>(null)
  const [yorumlar, setYorumlar] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  async function handleGenerate() {
    setGenerating(true)
    setProgress(10)
    const data = buildReportData(seciliDonem, selBolge, selYas)
    setRaporData(data)
    setProgress(30)

    // Claude API ile yorumlar üret
    const trGenel = data.trScore?.genel ?? 0
    const trPrevGenel = data.trScorePrev?.genel ?? 0
    const delta = trPrevGenel ? Math.round((trGenel - trPrevGenel)) : 0

    const prompts: Record<string, string> = {
      genel: `Türkiye SSH sektörü ${seciliDonem} dönemi genel skor: ${trGenel} puan${delta ? `, önceki döneme göre ${delta > 0 ? '+' : ''}${delta} puan` : ''}. Segment ortalamaları: ${data.segData.map(s => `${s.seg}: ${s.score?.genel ?? 0}`).join(', ')}. Bu tabloyu yorumla.`,
      
      segment: `SSH rekabet skorları: ${data.segData.map(s => `${s.seg} segmenti ${s.score?.genel ?? 0} puan (Müşteri: ${s.score?.musteri ?? 0}, Ticari: ${s.score?.ticari ?? 0}, Operasyonel: ${s.score?.operasyonel ?? 0})`).join('; ')}. Segment dinamiklerini ve rekabeti analiz et.`,
      
      kpi: `En kritik KPI performansları: ${KPI_META.slice(0, 5).map((k, i) => `${k.ad}: ${fmtKpi(data.trKpis[i], k.fmt)}`).join(', ')}. ${data.kayiplar.length > 0 ? `Dikkat: ${data.kayiplar.slice(0,2).map((k: any) => `${k.ad} ${k.pct}% ${isLowerBetter(k.i) ? 'kötüleşti' : 'geriledi'}`).join(', ')}.` : ''} KPI performansını yorumla.`,
      
      bolge: `Bölgesel SSH skorları: ${data.bolgeData.slice(0,4).map(b => `${b.bolge}: ${b.score?.genel ?? 0}`).join(', ')}. Coğrafi dağılımı ve bölgesel farklılıkları değerlendir.`,
      
      oneri: `SSH rekabetinde ${seciliDonem} döneminde öne çıkan 3 kritik aksiyon alanını ve sektöre önerileri belirt. Veri: Genel skor ${trGenel}, en zayıf kategori ${data.katData.sort((a,b)=>a.trVal-b.trVal)[0]?.label} (${data.katData.sort((a,b)=>a.trVal-b.trVal)[0]?.trVal} puan).`,
    }

    const yeni: Record<string, string> = {}
    const keys = Object.keys(prompts)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      yeni[key] = await generateCommentary(prompts[key])
      setProgress(30 + Math.round((i + 1) / keys.length * 60))
    }

    setYorumlar(yeni)
    setProgress(100)
    setGenerating(false)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="Özet Rapor" subtitle="Türkiye Otomotiv Sektörü SSH Rekabet Analizi" />
      <div className={styles.content}>

        {/* ── Kontrol Paneli ── */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--bd)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 16,
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>

          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx3)',
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              Rapor Dönemi
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[...Q_DONEMLER, ...FY_DONEMLER].map(d => (
                <button key={d} onClick={() => setSeciliDonem(d)}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${seciliDonem === d ? 'var(--blue)' : 'var(--bd)'}`,
                    background: seciliDonem === d ? 'rgba(59,130,246,.12)' : 'var(--surf)',
                    color: seciliDonem === d ? 'var(--blue)' : 'var(--tx2)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {raporData && (
              <button onClick={handlePrint}
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid var(--bd)',
                  background: 'var(--surf)', color: 'var(--tx2)' }}>
                🖨 Yazdır / PDF
              </button>
            )}
            <button onClick={handleGenerate} disabled={generating || !seciliDonem}
              style={{ padding: '8px 22px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: generating ? 'wait' : 'pointer',
                border: 'none', background: generating ? '#6b9fc4' : 'var(--blue)',
                color: '#fff', opacity: !seciliDonem ? .5 : 1 }}>
              {generating ? `Oluşturuluyor… %${progress}` : '✦ Rapor Oluştur'}
            </button>
          </div>
        </div>

        {/* ── Rapor içeriği ── */}
        {!raporData && !generating && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--tx3)' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Dönem seçin ve raporu oluşturun</div>
            <div style={{ fontSize: 11 }}>Yapay zeka destekli editorial analiz + 360° KPI raporu</div>
          </div>
        )}

        {generating && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--tx3)' }}>
            <div style={{ fontSize: 42, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⚙️</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Rapor hazırlanıyor…</div>
            <div style={{ width: 300, margin: '0 auto', background: 'var(--surf3)',
              borderRadius: 20, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--blue)',
                borderRadius: 20, transition: 'width .4s ease' }} />
            </div>
            <div style={{ fontSize: 10, marginTop: 8 }}>AI yorumlar üretiliyor…</div>
          </div>
        )}

        {raporData && !generating && (
          <div id="rapor-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ══ SAYFA 1 ══════════════════════════════════════════════════════ */}

            {/* Kapak bandı */}
            <div style={{ background: 'linear-gradient(135deg, #0f1c2e 0%, #1e3a5f 50%, #0f2744 100%)',
              borderRadius: 12, padding: '28px 32px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              {/* Dekoratif daireler */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180,
                borderRadius: '50%', background: 'rgba(59,130,246,.15)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 80, width: 100, height: 100,
                borderRadius: '50%', background: 'rgba(16,185,129,.1)' }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em',
                  color: '#60a5fa', textTransform: 'uppercase', marginBottom: 8 }}>
                  TÜRKİYE OTOMOTİV SEKTÖRÜ
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
                  SSH Rekabet Analizi
                </div>
                <div style={{ fontSize: 14, color: '#93c5fd', marginBottom: 20 }}>
                  {raporData.donem} Dönemi Kapsamlı Raporu
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#93c5fd', marginBottom: 4 }}>GENEL SKOR</div>
                    <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-dm-mono)',
                      color: (raporData.trScore?.genel ?? 0) >= 100 ? '#34d399' : (raporData.trScore?.genel ?? 0) >= 90 ? '#fbbf24' : '#f87171' }}>
                      {raporData.trScore?.genel ?? '—'}
                    </div>
                    <div style={{ fontSize: 9, color: '#93c5fd' }}>/ 100 puan</div>
                  </div>
                  {raporData.trScorePrev && (
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,.15)', paddingLeft: 24 }}>
                      <div style={{ fontSize: 9, color: '#93c5fd', marginBottom: 4 }}>ÖNCEKİ DÖNEM</div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: '#e2e8f0' }}>
                        {raporData.trScorePrev.genel}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {(() => {
                          const d = (raporData.trScore?.genel ?? 0) - raporData.trScorePrev!.genel
                          return <span style={{ color: d >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                            {d >= 0 ? `▲ +${d}` : `▼ ${d}`} puan
                          </span>
                        })()}
                      </div>
                    </div>
                  )}
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,.15)', paddingLeft: 24 }}>
                    <div style={{ fontSize: 9, color: '#93c5fd', marginBottom: 4 }}>KAPSAM</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{SEGMENTLER.length} Segment</div>
                    <div style={{ fontSize: 9, color: '#93c5fd' }}>{KPI_META.length} KPI · {BOLGELER.length} Bölge</div>
                  </div>
                </div>

                {yorumlar.genel && (
                  <div style={{ marginTop: 20, padding: '12px 16px',
                    background: 'rgba(255,255,255,.06)', borderRadius: 8,
                    borderLeft: '3px solid #60a5fa', fontSize: 11, lineHeight: 1.7, color: '#e2e8f0' }}>
                    {yorumlar.genel}
                  </div>
                )}
              </div>
            </div>

            {/* Kategori Skorları özeti */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {raporData.katData.map(k => {
                const delta = k.prevVal !== null ? k.trVal - k.prevVal : null
                return (
                  <Kart key={k.key} style={{ textAlign: 'center', borderTop: `3px solid ${k.color}` }}>
                    <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 6, fontWeight: 600 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: k.color }}>
                      {k.trVal}
                    </div>
                    {delta !== null && (
                      <div style={{ fontSize: 9, marginTop: 3 }}>
                        <span style={{ color: delta >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                          {delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`}
                        </span>
                      </div>
                    )}
                  </Kart>
                )
              })}
            </div>

            {/* ══ Segment Analizi ══════════════════════════════════════════════ */}
            <Kart>
              <KartBaslik>🔷 Segment Analizi</KartBaslik>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                {raporData.segData.map(s => (
                  <div key={s.seg} style={{ background: SEGMENT_BG[s.seg],
                    border: `1px solid ${SEGMENT_HEX[s.seg]}55`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENT_HEX[s.seg] }}>{s.seg}</span>
                      <ScoreBadge val={s.score?.genel ?? 0} size="sm" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 9, marginBottom: 8 }}>
                      {(['musteri','ticari','operasyonel','bayi','kapsam'] as const).map(k => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--tx3)' }}>
                          <span style={{ textTransform: 'capitalize' }}>{k === 'bayi' ? 'Bayi' : k === 'musteri' ? 'Müşteri' : k === 'ticari' ? 'Ticari' : k === 'operasyonel' ? 'Ops.' : 'Kapsam'}</span>
                          <span style={{ fontWeight: 700, color: 'var(--tx2)' }}>{s.score ? (s.score as any)[k] ?? 0 : 0}</span>
                        </div>
                      ))}
                    </div>
                    {s.markalar.length > 0 && (
                      <div style={{ fontSize: 8, color: 'var(--tx3)', borderTop: `1px solid ${SEGMENT_HEX[s.seg]}33`, paddingTop: 6 }}>
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>Top 3 Marka</div>
                        {s.markalar.slice(0,3).map((m, i) => (
                          <div key={m.marka} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span>{i+1}. {m.marka}</span>
                            <span style={{ fontWeight: 700, color: SEGMENT_HEX[s.seg] }}>{m.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {yorumlar.segment && (
                <div style={{ background: 'var(--surf2)', borderRadius: 8, padding: '10px 14px',
                  fontSize: 10, lineHeight: 1.7, color: 'var(--tx2)', borderLeft: '3px solid #3b82f6' }}>
                  {yorumlar.segment}
                </div>
              )}
            </Kart>

            {/* ══ KPI Analizi ══════════════════════════════════════════════════ */}
            <Kart>
              <KartBaslik>📊 KPI Performans Analizi</KartBaslik>
              <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: 'var(--surf2)' }}>
                      <th style={thS}>KPI</th>
                      <th style={thS}>Tüm TR</th>
                      {SEGMENTLER.map(seg => <th key={seg} style={{ ...thS, color: SEGMENT_HEX[seg] }}>{seg}</th>)}
                      <th style={thS}>Δ Dönem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KPI_META.map((k, i) => {
                      const trV = raporData.trKpis[i] ?? 0
                      const prevV = raporData.trKpisPrev?.[i] ?? 0
                      const pct = prevV ? ((trV - prevV) / Math.abs(prevV) * 100) : 0
                      const lob = isLowerBetter(i)
                      const hc = heatColor(trV, raporData.trKpis[i] ?? 1, !lob)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                          <td style={{ ...tdS, fontSize: 9, color: 'var(--tx2)', maxWidth: 160 }}>{k.ad}</td>
                          <td style={{ ...tdS, fontFamily: 'var(--font-dm-mono)', fontWeight: 700, color: hc.color, textAlign: 'center' }}>
                            {fmtKpi(trV, k.fmt)}
                          </td>
                          {raporData.segData.map(s => {
                            const sv = s.kpis[i] ?? 0
                            const shc = heatColor(sv, trV, !lob)
                            return (
                              <td key={s.seg} style={{ ...tdS, fontFamily: 'var(--font-dm-mono)', fontSize: 9, textAlign: 'center', color: shc.color }}>
                                {fmtKpi(sv, k.fmt)}
                              </td>
                            )
                          })}
                          <td style={{ ...tdS, textAlign: 'center' }}>
                            {prevV ? <DeltaBadge val={Math.round(pct * 10)/10} lob={lob} /> : <span style={{ color: 'var(--tx3)' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {yorumlar.kpi && (
                <div style={{ background: 'var(--surf2)', borderRadius: 8, padding: '10px 14px',
                  fontSize: 10, lineHeight: 1.7, color: 'var(--tx2)', borderLeft: '3px solid #f59e0b' }}>
                  {yorumlar.kpi}
                </div>
              )}
            </Kart>

            {/* ══ Bölgesel + Yaş ══════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

              <Kart>
                <KartBaslik>🗺 Bölgesel Dağılım</KartBaslik>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {raporData.bolgeData.map(b => {
                    const sc = b.score?.genel ?? 0
                    const max = Math.max(...raporData.bolgeData.map(x => x.score?.genel ?? 0), 1)
                    const c = sc >= 100 ? '#10b981' : sc >= 90 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={b.bolge} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, color: 'var(--tx2)', width: 80, flexShrink: 0 }}>{b.bolge || 'Tüm TR'}</span>
                        <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${(sc/max)*100}%`, height: '100%', background: c, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: c, fontFamily: 'var(--font-dm-mono)', width: 28, textAlign: 'right' }}>{sc}</span>
                      </div>
                    )
                  })}
                </div>
                {yorumlar.bolge && (
                  <div style={{ background: 'var(--surf2)', borderRadius: 8, padding: '8px 12px',
                    fontSize: 9, lineHeight: 1.7, color: 'var(--tx2)', borderLeft: '3px solid #8b5cf6' }}>
                    {yorumlar.bolge}
                  </div>
                )}
              </Kart>

              <Kart>
                <KartBaslik>👤 Yaş Kırılımı</KartBaslik>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {raporData.yasData.map(y => {
                    const sc = y.score?.genel ?? 0
                    const cats = (['musteri','ticari','operasyonel'] as const)
                    return (
                      <div key={y.yas} style={{ background: 'var(--surf2)', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx2)' }}>{y.yas} Yıl</span>
                          <ScoreBadge val={sc} size="sm" />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {cats.map(c => (
                            <div key={c} style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 2 }}>
                                {c === 'musteri' ? 'Müşteri' : c === 'ticari' ? 'Ticari' : 'Ops.'}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-dm-mono)',
                                color: (y.score as any)?.[c] >= 100 ? '#10b981' : (y.score as any)?.[c] >= 90 ? '#f59e0b' : '#ef4444' }}>
                                {y.score ? (y.score as any)[c] ?? '—' : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Kart>
            </div>

            {/* ══ Dönemsel Trend ═══════════════════════════════════════════════ */}
            <Kart>
              <KartBaslik>📈 Dönemsel KPI Trend ({raporData.trendDonemler.join(' → ')})</KartBaslik>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {raporData.kpiTrend.slice(0, 8).map(k => {
                  const vals = k.values
                  const last = vals[vals.length - 1]
                  const first = vals[0]
                  const trend = first ? ((last - first) / Math.abs(first) * 100) : 0
                  const lob = isLowerBetter(k.i)
                  const trendOk = lob ? trend < 0 : trend > 0
                  const tc = trendOk ? '#10b981' : Math.abs(trend) < 2 ? '#9ca3af' : '#ef4444'
                  return (
                    <div key={k.i} style={{ background: 'var(--surf2)', borderRadius: 8, padding: '10px' }}>
                      <div style={{ fontSize: 8, color: 'var(--tx3)', marginBottom: 6, lineHeight: 1.3, minHeight: 24 }}>{k.ad}</div>
                      <MiniLineChart
                        values={vals}
                        color={tc}
                        width={130}
                        height={36}
                        labels={raporData.trendDonemler.map(d => d.split('-')[1])}
                      />
                      <div style={{ fontSize: 8, fontWeight: 700, color: tc, marginTop: 4 }}>
                        {trend > 0 ? `▲ +` : trend < 0 ? `▼ ` : '→ '}{Math.abs(Math.round(trend * 10)/10)}% trend
                      </div>
                    </div>
                  )
                })}
              </div>
            </Kart>

            {/* ══ Puan Kayıpları ═══════════════════════════════════════════════ */}
            {raporData.kayiplar.length > 0 && (
              <Kart style={{ borderLeft: '4px solid #ef4444' }}>
                <KartBaslik color="#ef4444">⚠ Puan Kayıpları & Kritik Gerileme Alanları</KartBaslik>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {raporData.kayiplar.slice(0, 6).map((k: any) => (
                    <div key={k.i} style={{ background: 'rgba(239,68,68,.06)',
                      border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--tx2)', marginBottom: 6, lineHeight: 1.3 }}>{k.ad}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: 7, color: 'var(--tx3)' }}>Mevcut</div>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: '#ef4444' }}>
                            {fmtKpi(k.curr, k.fmt)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 7, color: 'var(--tx3)' }}>Önceki</div>
                          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx3)' }}>
                            {fmtKpi(k.prev, k.fmt)}
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444' }}>
                            {k.pct > 0 ? `+${k.pct}` : k.pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Kart>
            )}

            {/* ══ Öneriler & Sonuç ═════════════════════════════════════════════ */}
            <div style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)',
              borderRadius: 12, padding: '24px 28px', color: '#fff' }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: '#93c5fd' }}>
                💡 Stratejik Değerlendirme & Öneriler
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>
                    GÜÇLÜ YÖNLER
                  </div>
                  {raporData.katData.sort((a,b) => b.trVal - a.trVal).slice(0,2).map(k => (
                    <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 6, background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#e2e8f0' }}>{k.label}: <strong>{k.trVal} puan</strong></span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>
                    GELİŞİM ALANLARI
                  </div>
                  {raporData.katData.sort((a,b) => a.trVal - b.trVal).slice(0,2).map(k => (
                    <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 6, background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#e2e8f0' }}>{k.label}: <strong>{k.trVal} puan</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {yorumlar.oneri && (
                <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 8,
                  padding: '14px 16px', fontSize: 11, lineHeight: 1.8, color: '#e2e8f0',
                  borderLeft: '3px solid #34d399' }}>
                  {yorumlar.oneri}
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.1)',
                fontSize: 8, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                <span>SSH Rekabet Analizi · {raporData.donem} · {selBolge || 'Tüm Türkiye'}</span>
                <span>Oluşturuldu: {new Date().toLocaleDateString('tr-TR')}</span>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #rapor-icerik, #rapor-icerik * { visibility: visible !important; }
          #rapor-icerik { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}

const thS: React.CSSProperties = { padding: '7px 10px', textAlign: 'left', fontSize: 9,
  fontWeight: 700, color: 'var(--tx3)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
const tdS: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--bd)' }
