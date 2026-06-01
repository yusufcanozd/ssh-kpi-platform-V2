'use client'

import { useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG,
  BOLGELER, YAS_GRUPLARI, DONEMLER, CAT_COLORS,
  fmtKpi, getKpisFromCube, getScore, getKpiScores, getMarkaRanking,
  isLowerBetter, heatColor,
} from '@/lib/kpi'
import styles from './page.module.css'

const Q_LIST  = DONEMLER.filter(d => d.includes('-Q')).sort()
const FY_LIST = DONEMLER.filter(d => d.includes('-FY')).sort()
const TUM_YILLAR = Array.from(new Set(DONEMLER.map(d => parseInt(d.split('-')[0])))).sort()

type DonemPeriyot = 'Q' | 'FY'
interface DonemSec { yil: number; periyot: DonemPeriyot; alt: string }

function toStr(s: DonemSec): string {
  return s.periyot === 'FY' ? s.yil + '-FY' : s.yil + '-Q' + s.alt
}
function getAltlar(p: DonemPeriyot): string[] {
  return p === 'FY' ? ['FY'] : ['1','2','3','4']
}

const KATS = [
  { key:'musteri',     label:'Müşteri Sadakati ve Deneyimi',    color: CAT_COLORS['Müşteri Sadakati ve Deneyimi']     || '#10b981' },
  { key:'ticari',      label:'Finansal Verimlilik ve Rasyo Analizi',      color: CAT_COLORS['Finansal Verimlilik ve Rasyo Analizi']      || '#3b82f6' },
  { key:'operasyonel', label:'Süreç ve Operasyonel Akış', color: CAT_COLORS['Süreç ve Operasyonel Akış'] || '#f59e0b' },
  { key:'bayi',        label:'Bayi Ağı Kapasite Yönetimi',    color: CAT_COLORS['Bayi Ağı Kapasite Yönetimi']   || '#8b5cf6' },
  { key:'kapsam',      label:'Stratejik Kapsam Dağılımı',      color: CAT_COLORS['Stratejik Kapsam Dağılımı']      || '#ef4444' },
]

async function callAI(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.text || ''
  } catch { return '' }
}

function DonemSec2({ label, value, onChange }: {
  label: string
  value: DonemSec
  onChange: (v: DonemSec) => void
}) {
  const altlar = getAltlar(value.periyot)
  const altSec = altlar.includes(value.alt) ? value.alt : altlar[0]
  return (
    <div>
      {label && <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</div>}
      <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
        <select value={value.yil} onChange={e => onChange({ ...value, yil: parseInt(e.target.value) })}
          style={{ padding:'3px 7px', borderRadius:5, fontSize:9, fontWeight:600, background:'var(--surf)', border:'1px solid var(--bd)', color:'var(--tx2)', cursor:'pointer' }}>
          {TUM_YILLAR.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display:'flex', gap:2 }}>
          {(['Q','FY'] as DonemPeriyot[]).map(p => {
            const dis = p === 'Q' ? Q_LIST.length === 0 : FY_LIST.length === 0
            return (
              <button key={p} disabled={dis}
                onClick={() => onChange({ ...value, periyot:p, alt:p==='FY'?'FY':'1' })}
                style={{ padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:600, cursor:dis?'not-allowed':'pointer',
                  border:'1px solid ' + (value.periyot===p?'var(--blue)':'var(--bd)'),
                  background:value.periyot===p?'rgba(59,130,246,.12)':'var(--surf)',
                  color:dis?'var(--tx3)':value.periyot===p?'var(--blue)':'var(--tx2)', opacity:dis?0.5:1 }}>
                {p === 'Q' ? 'Çeyreklik' : 'Yıllık'}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:2 }}>
          {altlar.map(a => (
            <button key={a} onClick={() => onChange({ ...value, alt:a })}
              style={{ padding:'2px 6px', borderRadius:3, fontSize:9, cursor:'pointer',
                border:'1px solid ' + (altSec===a?'var(--blue)':'var(--bd)'),
                background:altSec===a?'rgba(59,130,246,.15)':'var(--surf3)',
                color:altSec===a?'var(--blue)':'var(--tx3)', fontWeight:altSec===a?700:400 }}>
              {value.periyot === 'Q' ? 'Q' + a : 'FY'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function YorumBlok({ text, color }: { text: string; color?: string }) {
  if (!text) return null
  return (
    <div style={{ background:'var(--surf2)', borderRadius:8, padding:'12px 16px', marginTop:10,
      fontSize:12, lineHeight:1.9, color:'var(--tx2)', borderLeft:'3px solid ' + (color || '#3b82f6') }}>
      {text}
    </div>
  )
}

const thS: React.CSSProperties = { padding:'7px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
const tdS: React.CSSProperties = { padding:'6px 10px', borderBottom:'1px solid var(--bd)' }

export default function OzetRaporPage() {
  const { selBolge, selYas } = useDashboardCtx()

  const sonYil = TUM_YILLAR[TUM_YILLAR.length - 1] || 2024

  const [baz, setBaz] = useState<DonemSec>({ yil: sonYil, periyot:'Q', alt:'4' })
  const [cmp, setCmp] = useState<DonemSec>({ yil: sonYil - 1, periyot:'Q', alt:'4' })
  const [cmpAktif, setCmpAktif] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rapor, setRapor] = useState<any>(null)
  const [yorumlar, setYorumlar] = useState<Record<string,string>>({})

  const bazStr = toStr(baz)
  const cmpStr = cmpAktif ? toStr(cmp) : null

  function handleBazChange(v: DonemSec) {
    if (v.periyot !== baz.periyot) {
      setCmp({ ...cmp, periyot: v.periyot, alt: v.periyot === 'FY' ? 'FY' : '4' })
    }
    setBaz(v)
  }

  async function handleOlustur() {
    setGenerating(true)
    setProgress(10)

    const trKpis     = getKpisFromCube('', selBolge, selYas, bazStr)
    const trKpisCmp  = cmpStr ? getKpisFromCube('', selBolge, selYas, cmpStr) : null
    const trScore    = getScore('', selBolge, selYas, bazStr)
    const trScoreCmp = cmpStr ? getScore('', selBolge, selYas, cmpStr) : null

    const segData = SEGMENTLER.map(seg => ({
      seg,
      kpis: getKpisFromCube(seg, selBolge, selYas, bazStr),
      kpisCmp: cmpStr ? getKpisFromCube(seg, selBolge, selYas, cmpStr) : null,
      score: getScore(seg, selBolge, selYas, bazStr),
      scoreCmp: cmpStr ? getScore(seg, selBolge, selYas, cmpStr) : null,
      markalar: getMarkaRanking(seg, selBolge, selYas, bazStr).slice(0, 5),
    }))

    const bolgeData = BOLGELER.slice(0, 8).map(b => ({
      bolge: b,
      score: getScore('', b, selYas, bazStr),
      scoreCmp: cmpStr ? getScore('', b, selYas, cmpStr) : null,
    }))

    const yasData = YAS_GRUPLARI.filter(y => y !== 'Tümü').map(y => ({
      yas: y,
      score: getScore('', selBolge, y, bazStr),
      kpis: getKpisFromCube('', selBolge, y, bazStr),
    }))

    const katData = KATS.map(k => ({
      ...k,
      trVal: trScore ? (trScore as any)[k.key] ?? 0 : 0,
      cmpVal: trScoreCmp ? (trScoreCmp as any)[k.key] ?? 0 : null,
    }))

    const kayiplar = KPI_META.map((k, i) => {
      if (!cmpStr) return null
      const curr = trKpis[i] ?? 0
      const prev = trKpisCmp?.[i] ?? 0
      if (!prev || !curr) return null
      const pct = ((curr - prev) / Math.abs(prev)) * 100
      const kotu = isLowerBetter(i) ? pct > 3 : pct < -3
      if (!kotu) return null
      return { ...k, i, curr, prev, pct: Math.round(pct * 10) / 10 }
    }).filter(Boolean)

    const tumMarkalar = SEGMENTLER.flatMap(seg =>
      getMarkaRanking(seg, selBolge, selYas, bazStr).map(m => ({
        ...m,
        cmpScore: cmpStr ? (getMarkaRanking(seg, selBolge, selYas, cmpStr).find(x => x.marka === m.marka)?.score ?? null) : null,
      }))
    ).sort((a, b) => b.score - a.score)

    const trendDonemler = Q_LIST.slice(-6)

    setRapor({ trKpis, trKpisCmp, trScore, trScoreCmp, segData, bolgeData, yasData, katData, kayiplar, tumMarkalar, trendDonemler })
    setProgress(30)

    const trG = trScore?.genel ?? 0
    const trGCmp = trScoreCmp?.genel ?? 0
    const delta = cmpStr ? trG - trGCmp : null

    const p1 = 'Turkiye SSH sektoru ' + bazStr + ' donemi skor: ' + trG +
      (delta !== null ? ', onceki doneme gore ' + (delta >= 0 ? '+' : '') + delta + ' puan.' : '.') +
      ' Segmentler: ' + segData.map(s => s.seg + ':' + (s.score?.genel ?? 0)).join(', ') +
      '. 3-4 cumle editorial yorum yap.'

    const p2 = 'SSH marka siralamasi ' + bazStr + ': ' +
      tumMarkalar.slice(0, 6).map((m, i) => (i+1) + '.' + m.marka + '(' + m.segment + ') ' + m.score + 'p').join('; ') +
      '. Marka dinamiklerini yorumla.'

    const p3 = 'KPI analizi ' + bazStr + ': ' +
      KPI_META.slice(0, 6).map((k, i) => k.ad + ':' + fmtKpi(trKpis[i], k.fmt)).join('; ') +
      '. KPI performansini yorumla.'

    const p4 = 'Bolgesel SSH skorlari ' + bazStr + ': ' +
      bolgeData.slice(0, 5).map(b => (b.bolge || 'TR') + ':' + (b.score?.genel ?? 0)).join(', ') +
      '. Bolgesel farkliliklari yorumla.'

    const p5 = 'Son donem SSH trend: ' +
      trendDonemler.map(dt => { const sc = getScore('', selBolge, selYas, dt); return dt + ':' + (sc?.genel ?? 0) }).join(', ') +
      '. Donemesel trendi yorumla.'

    const p6 = cmpStr ? (bazStr + ' vs ' + cmpStr + ': Skor ' + trGCmp + '->' + trG +
      ', delta: ' + (delta !== null ? (delta >= 0 ? '+' : '') + delta : '0') + ' puan.' +
      ' Kategoriler: ' + katData.map(k => k.label + ':' + k.cmpVal + '->' + k.trVal).join(', ') +
      '. Kapsamli donem karsılastirmasi yap.') : ''

    const enGuclu = [...katData].sort((a, b) => b.trVal - a.trVal)[0]
    const enZayif = [...katData].sort((a, b) => a.trVal - b.trVal)[0]
    const p7 = 'SSH stratejik degerlendirme ' + bazStr + ': Skor ' + trG +
      ', en guclu ' + (enGuclu?.label || '') + '(' + (enGuclu?.trVal || 0) + ')' +
      ', en zayif ' + (enZayif?.label || '') + '(' + (enZayif?.trVal || 0) + ')' +
      (kayiplar.length > 0 ? ', ' + kayiplar.length + ' KPI geriledi' : '') +
      '. 3 stratejik oneri ver.'

    const prompts = [
      ['genelBakis', p1], ['marka', p2], ['kpiDetay', p3],
      ['bolge', p4], ['trend', p5], ['karsilastirma', p6], ['strateji', p7],
    ].filter(([, v]) => v)

    const yeni: Record<string,string> = {}
    for (let i = 0; i < prompts.length; i++) {
      yeni[prompts[i][0]] = await callAI(prompts[i][1])
      setProgress(30 + Math.round((i + 1) / prompts.length * 65))
    }
    setYorumlar(yeni)
    setProgress(100)
    setGenerating(false)
  }

  const d = rapor

  return (
    <div className={styles.wrap}>
      <Topbar title="Özet Rapor" subtitle="Türkiye Otomotiv Sektörü SSH Rekabet Analizi" />
      <div className={styles.content}>

        <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:24, alignItems:'start' }}>

            {/* Baz Dönem */}
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Baz Dönem</div>
              <DonemSec2 label="" value={baz} onChange={handleBazChange} />
            </div>

            {/* Karşılaştırma Dönemi */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, height:20 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Karşılaştırma Dönemi</div>
                <button onClick={() => setCmpAktif(v => !v)}
                  style={{ padding:'2px 8px', borderRadius:10, fontSize:8, fontWeight:600, cursor:'pointer',
                    border:'1px solid ' + (cmpAktif ? 'var(--blue)' : 'var(--bd)'),
                    background:cmpAktif ? 'rgba(59,130,246,.1)' : 'var(--surf)',
                    color:cmpAktif ? 'var(--blue)' : 'var(--tx3)' }}>
                  {cmpAktif ? '✓ Aktif' : 'Ekle'}
                </button>
              </div>
              {cmpAktif && <DonemSec2 label="" value={cmp} onChange={setCmp} />}
            </div>

            {/* Butonlar */}
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', paddingBottom:2 }}>
              {d && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <button onClick={() => {
                    const prev = document.title
                    document.title = 'SSH Platform _ Türkiye Otomotiv Sektörü SSH Raporu'
                    setTimeout(() => {
                      window.print()
                      setTimeout(() => { document.title = prev }, 1000)
                    }, 100)
                  }}
                    style={{ padding:'8px 16px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf)', color:'var(--tx2)' }}>
                    🖨 PDF
                  </button>
                  <div style={{ fontSize:8, color:'var(--tx3)', textAlign:'right', maxWidth:160, lineHeight:1.4 }}>
                    Print dialog'da "Üstbilgi ve altbilgi" seçeneğini kapatın
                  </div>
                </div>
              )}
              <button onClick={handleOlustur} disabled={generating}
                style={{ padding:'8px 22px', borderRadius:8, fontSize:11, fontWeight:700,
                  cursor:generating ? 'wait' : 'pointer', border:'none',
                  background:generating ? '#6b9fc4' : 'var(--blue)', color:'#fff' }}>
                {generating ? ('Oluşturuluyor ' + progress + '%') : '✦ Rapor Oluştur'}
              </button>
            </div>
          </div>
          {generating && (
            <div style={{ marginTop:12 }}>
              <div style={{ width:'100%', background:'var(--surf3)', borderRadius:20, height:5, overflow:'hidden' }}>
                <div style={{ width:progress + '%', height:'100%', background:'var(--blue)', borderRadius:20, transition:'width .4s' }} />
              </div>
            </div>
          )}
        </div>

        {!d && !generating && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--tx3)' }}>
            <div style={{ fontSize:42, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Dönem seçin ve raporu oluşturun</div>
            <div style={{ fontSize:11 }}>AI destekli 360° SSH rekabet analizi</div>
          </div>
        )}

        {d && !generating && (
          <div id="rapor-print-wrapper">
          <div id="rapor-icerik">

            <div className="rapor-sayfa">
              <div style={{ background:'linear-gradient(135deg,#0f1c2e,#1a3353,#0d2240)', borderRadius:12, padding:'32px 36px', color:'#fff', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'rgba(59,130,246,.1)' }} />
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.2em', color:'#60a5fa', textTransform:'uppercase', marginBottom:6 }}>Türkiye Otomotiv Sektörü</div>
                      <div style={{ fontSize:28, fontWeight:900, lineHeight:1.15, marginBottom:4 }}>SSH Rekabet Analizi</div>
                      <div style={{ fontSize:13, color:'#93c5fd' }}>Satış Sonrası Hizmet KPI Performans Raporu</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Baz Dönem</div>
                      <div style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', fontFamily:'var(--font-dm-mono)' }}>{bazStr}</div>
                      {cmpStr && (
                        <div style={{ marginTop:6 }}>
                          <div style={{ fontSize:9, color:'#93c5fd', marginBottom:2, textTransform:'uppercase', letterSpacing:'.1em' }}>Karşılaştırma Dönemi</div>
                          <div style={{ fontSize:14, fontWeight:700, color:'#94a3b8', fontFamily:'var(--font-dm-mono)' }}>{cmpStr}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Genel Skor</div>
                      <div style={{ fontSize:48, fontWeight:900, fontFamily:'var(--font-dm-mono)', lineHeight:1, color:(d.trScore?.genel??0)>=100?'#34d399':(d.trScore?.genel??0)>=90?'#fbbf24':'#f87171' }}>{d.trScore?.genel??'—'}</div>
                    </div>
                    {d.trScoreCmp && (
                      <div style={{ borderLeft:'1px solid rgba(255,255,255,.12)', paddingLeft:28 }}>
                        <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Önceki Dönem</div>
                        <div style={{ fontSize:26, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'#94a3b8', lineHeight:1 }}>{d.trScoreCmp.genel}</div>
                        <div style={{ marginTop:6 }}>
                          {(function() { const diff = (d.trScore?.genel??0) - d.trScoreCmp.genel; return <span style={{ fontSize:13, fontWeight:700, color:diff>=0?'#34d399':'#f87171' }}>{diff>=0?'▲ +':'▼ '}{diff} puan</span> })()}
                        </div>
                      </div>
                    )}
                    <div style={{ borderLeft:'1px solid rgba(255,255,255,.12)', paddingLeft:28 }}>
                      <div style={{ fontSize:9, color:'#93c5fd', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Kapsam</div>
                      {[SEGMENTLER.length + ' Segment', KPI_META.length + ' KPI', BOLGELER.length + ' Bölge'].map(t => (
                        <div key={t} style={{ fontSize:11, color:'#cbd5e1', marginBottom:3 }}>· {t}</div>
                      ))}
                    </div>
                  </div>
                  <YorumBlok text={yorumlar.genelBakis} color="#60a5fa" />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(' + KATS.length + ',1fr)', gap:10 }}>
                {d.katData.map((k: any) => {
                  const delta = k.cmpVal !== null ? k.trVal - k.cmpVal : null
                  return (
                    <div key={k.key} style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'12px', textAlign:'center', borderTop:'3px solid ' + k.color }}>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, fontWeight:600 }}>{k.label}</div>
                      <div style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:k.color }}>{k.trVal}</div>
                      {delta !== null && <div style={{ fontSize:9, marginTop:3, fontWeight:700, color:delta>=0?'#10b981':'#ef4444' }}>{delta>=0?'▲ +':'▼ '}{delta}</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rapor-sayfa">
              <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
                  <span style={{ fontSize:16 }}>🏆</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'var(--tx)' }}>Marka Sıralaması</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr style={{ background:'var(--surf2)' }}>
                        <th style={thS}>#</th>
                        <th style={thS}>Marka</th>
                        <th style={thS}>Segment</th>
                        <th style={thS}>Skor</th>
                        {cmpStr && <th style={thS}>Önceki</th>}
                        {cmpStr && <th style={thS}>Δ</th>}
                        {KATS.map(k => <th key={k.key} style={{ ...thS, color:k.color }}>{k.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {d.tumMarkalar.slice(0,20).map((m: any, i: number) => {
                        const segSc = getScore(m.segment, selBolge, selYas, bazStr)
                        const diff = m.cmpScore !== null ? m.score - m.cmpScore : null
                        return (
                          <tr key={m.marka} style={{ borderBottom:'1px solid var(--bd)' }}>
                            <td style={{ ...tdS, color:'var(--tx3)', fontSize:9 }}>{i+1}</td>
                            <td style={{ ...tdS, fontWeight:700, color:SEGMENT_HEX[m.segment]||'var(--tx)' }}>{m.marka}</td>
                            <td style={tdS}><span style={{ background:SEGMENT_BG[m.segment], color:SEGMENT_HEX[m.segment], padding:'1px 6px', borderRadius:20, fontSize:8, fontWeight:700, border:'1px solid ' + SEGMENT_HEX[m.segment] + '44' }}>{m.segment}</span></td>
                            <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontWeight:700, color:m.score>=100?'#10b981':m.score>=90?'#f59e0b':'#ef4444' }}>{m.score}</td>
                            {cmpStr && <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)', fontSize:9 }}>{m.cmpScore??'—'}</td>}
                            {cmpStr && <td style={tdS}>{diff!==null?<span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</span>:'—'}</td>}
                            {KATS.map(k => {
                              const v = segSc ? (segSc as any)[k.key]??0 : 0
                              return <td key={k.key} style={{ ...tdS, textAlign:'center', fontSize:9, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</td>
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <YorumBlok text={yorumlar.marka} color="#f59e0b" />
              </div>
            </div>

            <div className="rapor-sayfa">
              <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
                  <span style={{ fontSize:16 }}>📊</span>
                  <span style={{ fontSize:12, fontWeight:800 }}>KPI Detay Analizi</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr style={{ background:'var(--surf2)' }}>
                        <th style={thS}>KPI</th>
                        <th style={thS}>Tüm TR</th>
                        {cmpStr && <th style={thS}>Önceki</th>}
                        {cmpStr && <th style={thS}>Δ</th>}
                        {SEGMENTLER.map(seg => <th key={seg} style={{ ...thS, color:SEGMENT_HEX[seg] }}>{seg}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {KPI_META.map((k, i) => {
                        const trV = d.trKpis[i]??0
                        const cV  = d.trKpisCmp?.[i]??0
                        const lob = isLowerBetter(i)
                        const pct = cV ? ((trV-cV)/Math.abs(cV)*100) : 0
                        return (
                          <tr key={i} style={{ borderBottom:'1px solid var(--bd)' }}>
                            <td style={{ ...tdS, fontSize:9 }}>{k.ad}</td>
                            <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontWeight:700, textAlign:'center' }}>{fmtKpi(trV, k.fmt)}</td>
                            {cmpStr && <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)', textAlign:'center', fontSize:9 }}>{fmtKpi(cV, k.fmt)}</td>}
                            {cmpStr && <td style={{ ...tdS, textAlign:'center' }}>{cV?<span style={{ fontSize:9, fontWeight:700, color:(lob?pct<0:pct>0)?'#10b981':Math.abs(pct)<1?'#9ca3af':'#ef4444' }}>{pct>0?'▲ +':'▼ '}{Math.abs(Math.round(pct*10)/10)}%</span>:'—'}</td>}
                            {d.segData.map((s: any) => {
                              const sv = s.kpis[i]??0
                              const hc = heatColor(sv, trV, !lob)
                              return <td key={s.seg} style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontSize:9, textAlign:'center', color:hc.color, background:hc.bg }}>{fmtKpi(sv, k.fmt)}</td>
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <YorumBlok text={yorumlar.kpiDetay} color="#f59e0b" />
              </div>
            </div>

            <div className="rapor-sayfa">
              <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
                  <span style={{ fontSize:16 }}>🗺</span>
                  <span style={{ fontSize:12, fontWeight:800 }}>Bölge Analizi</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:12 }}>
                  <div>
                    {d.bolgeData.map((b: any) => {
                      const sc = b.score?.genel??0
                      const scC = b.scoreCmp?.genel??null
                      const maxSc = Math.max(...d.bolgeData.map((x: any) => x.score?.genel??0), 1)
                      const c = sc>=100?'#10b981':sc>=90?'#f59e0b':'#ef4444'
                      const diff = scC !== null ? sc - scC : null
                      return (
                        <div key={b.bolge} style={{ marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                            <span style={{ fontSize:9, color:'var(--tx2)', fontWeight:600 }}>{b.bolge||'Tüm TR'}</span>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              {diff !== null && <span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</span>}
                              <span style={{ fontSize:10, fontWeight:700, color:c, fontFamily:'var(--font-dm-mono)' }}>{sc}</span>
                            </div>
                          </div>
                          <div style={{ background:'var(--surf3)', borderRadius:4, height:8, overflow:'hidden' }}>
                            <div style={{ width:Math.round(sc/maxSc*100)+'%', height:'100%', background:c, borderRadius:4 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div>
                    {d.yasData.map((y: any) => {
                      const sc = y.score?.genel??0
                      return (
                        <div key={y.yas} style={{ background:'var(--surf2)', borderRadius:8, padding:'8px 10px', marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                            <span style={{ fontSize:10, fontWeight:700 }}>{y.yas} Yıl</span>
                            <span style={{ background:sc>=100?'#d1fae5':sc>=90?'#fef3c7':'#fee2e2', color:sc>=100?'#10b981':sc>=90?'#f59e0b':'#ef4444', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:800, fontFamily:'var(--font-dm-mono)' }}>{sc}</span>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
                            {KATS.map(k => {
                              const v = y.score ? (y.score as any)[k.key]??0 : 0
                              return <div key={k.key} style={{ textAlign:'center' }}>
                                <div style={{ fontSize:7, color:'var(--tx3)', marginBottom:2 }}>{k.label}</div>
                                <div style={{ fontSize:10, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</div>
                              </div>
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <YorumBlok text={yorumlar.bolge} color="#8b5cf6" />
              </div>

              <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
                  <span style={{ fontSize:16 }}>🔷</span>
                  <span style={{ fontSize:12, fontWeight:800 }}>Segment Analizi</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(' + SEGMENTLER.length + ',1fr)', gap:12 }}>
                  {d.segData.map((s: any) => (
                    <div key={s.seg} style={{ background:SEGMENT_BG[s.seg], border:'1px solid ' + SEGMENT_HEX[s.seg] + '55', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:'1px solid ' + SEGMENT_HEX[s.seg] + '33' }}>
                        <span style={{ fontSize:13, fontWeight:800, color:SEGMENT_HEX[s.seg] }}>{s.seg}</span>
                        <span style={{ background:s.score?.genel>=100?'#d1fae5':s.score?.genel>=90?'#fef3c7':'#fee2e2', color:s.score?.genel>=100?'#10b981':s.score?.genel>=90?'#f59e0b':'#ef4444', borderRadius:6, padding:'2px 7px', fontSize:11, fontWeight:800 }}>{s.score?.genel??0}</span>
                      </div>
                      <div style={{ marginBottom:8, padding:'4px 6px', background:SEGMENT_HEX[s.seg]+'15', borderRadius:5 }}>
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                          <span style={{ fontSize:9, fontWeight:800, color:SEGMENT_HEX[s.seg] }}>Genel</span>
                          <span style={{ fontSize:10, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:SEGMENT_HEX[s.seg] }}>
                            {s.score?.genel??0}
                            {s.scoreCmp && <span style={{ fontSize:8, color:'var(--tx3)', marginLeft:4 }}>({s.scoreCmp.genel})</span>}
                          </span>
                        </div>
                      </div>
                      {KATS.map(k => {
                        const v = s.score ? (s.score as any)[k.key]??0 : 0
                        const vc = s.scoreCmp ? (s.scoreCmp as any)[k.key]??0 : null
                        const dv = vc !== null ? v - vc : null
                        return (
                          <div key={k.key} style={{ display:'flex', justifyContent:'space-between', marginBottom:3, padding:'1px 4px' }}>
                            <span style={{ fontSize:8, color:'var(--tx3)' }}>{k.label}</span>
                            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                              {dv !== null && <span style={{ fontSize:7, fontWeight:700, color:dv>=0?'#10b981':'#ef4444' }}>{dv>=0?'+':''}{dv}</span>}
                              <span style={{ fontSize:9, fontWeight:700, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</span>
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ borderTop:'1px solid ' + SEGMENT_HEX[s.seg] + '33', paddingTop:6, marginTop:6 }}>
                        <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:3 }}>Top 3 Marka</div>
                        {s.markalar.slice(0,3).map((m: any, i: number) => (
                          <div key={m.marka} style={{ display:'flex', justifyContent:'space-between', marginBottom:2, fontSize:8 }}>
                            <span style={{ color:'var(--tx2)' }}>{i+1}. {m.marka}</span>
                            <span style={{ fontWeight:700, color:SEGMENT_HEX[s.seg] }}>{m.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rapor-sayfa">
              <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
                  <span style={{ fontSize:16 }}>📈</span>
                  <span style={{ fontSize:12, fontWeight:800 }}>Dönemsel Trend ({d.trendDonemler.join(' → ')})</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {KPI_META.slice(0,8).map((k, idx) => {
                    const vals = d.trendDonemler.map((dt: string) => getKpisFromCube('', selBolge, selYas, dt)[idx]??0)
                    const lob = isLowerBetter(idx)
                    const first = vals[0], last = vals[vals.length-1]
                    const trend = first ? ((last-first)/Math.abs(first)*100) : 0
                    const tc = (lob?trend<0:trend>0)?'#10b981':Math.abs(trend)<2?'#9ca3af':'#ef4444'
                    const minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV-minV||1
                    const W = 130, H = 40
                    const pts = vals.map((v: number, i: number) => ({ x: (i/(vals.length-1))*W, y: H-((v-minV)/range)*H*.8-H*.1 }))
                    const pathD = pts.map((p: any, i: number) => (i===0?'M':'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
                    return (
                      <div key={idx} style={{ background:'var(--surf2)', borderRadius:8, padding:10 }}>
                        <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:6, lineHeight:1.3, minHeight:24 }}>{k.ad}</div>
                        <svg width={W} height={H+16} style={{ overflow:'visible' }}>
                          <path d={pathD} fill="none" stroke={tc} strokeWidth={1.5} strokeLinecap="round" />
                          {pts.map((p: any, pi: number) => (
                            <g key={pi}>
                              <circle cx={p.x} cy={p.y} r={2.5} fill={tc} />
                              <text x={p.x} y={H+13} textAnchor="middle" fontSize={7} fill="#9ca3af">{d.trendDonemler[pi]?.split('-')[1]}</text>
                            </g>
                          ))}
                        </svg>
                        <div style={{ fontSize:8, fontWeight:700, color:tc, marginTop:4 }}>{trend>0?'▲ +':trend<0?'▼ ':'→ '}{Math.abs(Math.round(trend*10)/10)}% trend</div>
                      </div>
                    )
                  })}
                </div>
                <YorumBlok text={yorumlar.trend} color="#06b6d4" />
              </div>
            </div>

            {cmpStr && (
              <div className="rapor-sayfa">
                <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
                    <span style={{ fontSize:16 }}>⚖️</span>
                    <span style={{ fontSize:12, fontWeight:800 }}>{'Dönem Karşılaştırması: ' + bazStr + ' vs ' + cmpStr}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                    {[
                      { label:'Baz Dönem (' + bazStr + ')', val:d.trScore?.genel??0, color:'var(--blue)' },
                      { label:'Değişim', val:null as null, color:'var(--tx2)' },
                      { label:'Karş. Dönem (' + cmpStr + ')', val:d.trScoreCmp?.genel??0, color:'var(--tx2)' },
                    ].map((item, ii) => (
                      <div key={ii} style={{ background:'var(--surf2)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                        <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.08em' }}>{item.label}</div>
                        {ii === 1 ? (function() {
                          const diff = (d.trScore?.genel??0) - (d.trScoreCmp?.genel??0)
                          return <div style={{ fontSize:28, fontWeight:900, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</div>
                        })() : (
                          <div style={{ fontSize:36, fontWeight:900, fontFamily:'var(--font-dm-mono)', color:item.color }}>{item.val}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX:'auto', marginBottom:14 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead>
                        <tr style={{ background:'var(--surf2)' }}>
                          <th style={thS}>Segment</th>
                          <th style={{ ...thS, textAlign:'center' }}>{bazStr}</th>
                          <th style={{ ...thS, textAlign:'center' }}>{cmpStr}</th>
                          <th style={{ ...thS, textAlign:'center' }}>Δ</th>
                          {KATS.map(k => <th key={k.key} style={{ ...thS, color:k.color, textAlign:'center' }}>{k.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {d.segData.map((s: any) => {
                          const diff = s.scoreCmp ? (s.score?.genel??0) - s.scoreCmp.genel : null
                          return (
                            <tr key={s.seg} style={{ borderBottom:'1px solid var(--bd)' }}>
                              <td style={{ ...tdS, fontWeight:700, color:SEGMENT_HEX[s.seg] }}>{s.seg}</td>
                              <td style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:(s.score?.genel??0)>=100?'#10b981':(s.score?.genel??0)>=90?'#f59e0b':'#ef4444' }}>{s.score?.genel??'—'}</td>
                              <td style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', color:'var(--tx3)' }}>{s.scoreCmp?.genel??'—'}</td>
                              <td style={{ ...tdS, textAlign:'center' }}>{diff!==null?<span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</span>:'—'}</td>
                              {KATS.map(k => {
                                const v = s.score?(s.score as any)[k.key]??0:0
                                const vc = s.scoreCmp?(s.scoreCmp as any)[k.key]??0:null
                                const dv = vc!==null?v-vc:null
                                return (
                                  <td key={k.key} style={{ ...tdS, textAlign:'center', fontSize:9 }}>
                                    <div style={{ fontFamily:'var(--font-dm-mono)', fontWeight:700, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</div>
                                    {dv!==null&&<div style={{ fontSize:7, color:dv>=0?'#10b981':'#ef4444' }}>{dv>=0?'+':''}{dv}</div>}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {d.kayiplar.length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#ef4444', marginBottom:8 }}>⚠ Kritik Gerileme Alanları</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                        {d.kayiplar.slice(0,6).map((k: any) => (
                          <div key={k.i} style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 12px' }}>
                            <div style={{ fontSize:9, color:'var(--tx2)', marginBottom:5, lineHeight:1.3 }}>{k.ad}</div>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <div>
                                <div style={{ fontSize:7, color:'var(--tx3)' }}>{bazStr}</div>
                                <div style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'#ef4444' }}>{fmtKpi(k.curr, k.fmt)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize:7, color:'var(--tx3)' }}>{cmpStr}</div>
                                <div style={{ fontSize:11, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)' }}>{fmtKpi(k.prev, k.fmt)}</div>
                              </div>
                              <div style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'#ef4444' }}>{k.pct>0?'+':''}{k.pct}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <YorumBlok text={yorumlar.karsilastirma} color="#8b5cf6" />
                </div>
              </div>
            )}

            <div className="rapor-sayfa">
              <div style={{ background:'linear-gradient(135deg,#0f2744,#1a3a5c,#0f2040)', borderRadius:12, padding:'28px 32px', color:'#fff' }}>
                <div style={{ fontSize:14, fontWeight:800, marginBottom:20 }}>💡 360° Stratejik Değerlendirme ve Öneriler</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Güçlü Yönler</div>
                    {[...d.katData].sort((a: any, b: any) => b.trVal - a.trVal).slice(0,2).map((k: any) => (
                      <div key={k.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', flexShrink:0, display:'inline-block' }} />
                        <span style={{ fontSize:10, color:'#e2e8f0', fontWeight:600 }}>{k.label}: <strong>{k.trVal}</strong> puan{k.cmpVal!==null?' (önceki: '+k.cmpVal+')':''}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#f87171', marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Gelişim Alanları</div>
                    {[...d.katData].sort((a: any, b: any) => a.trVal - b.trVal).slice(0,2).map((k: any) => (
                      <div key={k.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#f87171', flexShrink:0, display:'inline-block' }} />
                        <span style={{ fontSize:10, color:'#e2e8f0', fontWeight:600 }}>{k.label}: <strong>{k.trVal}</strong> puan{k.cmpVal!==null?' (önceki: '+k.cmpVal+')':''}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {yorumlar.strateji && (
                  <div style={{ background:'rgba(255,255,255,.07)', borderRadius:8, padding:'16px 18px', fontSize:11, lineHeight:1.9, color:'#e2e8f0', borderLeft:'3px solid #34d399' }}>
                    {yorumlar.strateji}
                  </div>
                )}
                <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.1)', fontSize:8, color:'#475569', display:'flex', justifyContent:'space-between' }}>
                  <span>{'SSH Rekabet Analizi · Baz: ' + bazStr + (cmpStr?' · Karş: '+cmpStr:'')}</span>
                  <span>{(selBolge||'Tüm Türkiye') + ' · ' + new Date().toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </div>

          </div>
          </div>
        )}
      </div>

      <style>{`
        .rapor-sayfa {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 32px;
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm 12mm;
          }

          /* Sadece rapor görünür */
          body * { visibility: hidden !important; }
          #rapor-print-wrapper,
          #rapor-print-wrapper * { visibility: visible !important; }
          #rapor-print-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }

          /* Sayfa kırılımı */
          .rapor-sayfa {
            page-break-after: always;
            break-after: page;
            margin-bottom: 0 !important;
            /* Boşlukları önle — min-height kaldırıldı */
          }
          .rapor-sayfa:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .rapor-sayfa > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Renkleri koru */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
