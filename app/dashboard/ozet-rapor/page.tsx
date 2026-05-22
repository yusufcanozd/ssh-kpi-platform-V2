'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG,
  BOLGELER, YAS_GRUPLARI, DONEMLER, CAT_COLORS,
  fmtKpi, getKpisFromCube, getScore, getKpiScores, getMarkaRanking,
  isLowerBetter, heatColor,
} from '@/lib/kpi'
import styles from './page.module.css'

// ── Dönem yardımcıları ────────────────────────────────────────────────────────
function donemTip(d: string): 'ay' | 'Q' | 'FY' {
  if (d.includes('-FY')) return 'FY'
  if (d.includes('-Q'))  return 'Q'
  return 'ay'
}
function donemSira(d: string): number {
  const y = parseInt(d.split('-')[0])
  if (d.includes('-FY')) return y * 1000 + 999
  if (d.includes('-Q'))  return y * 1000 + parseInt(d.split('-Q')[1]) * 10
  return y * 1000 + parseInt(d.split('-')[1] ?? '0')
}
const AYLIK  = DONEMLER.filter(d => donemTip(d) === 'ay').sort((a,b) => donemSira(a)-donemSira(b))
const Q_LIST = DONEMLER.filter(d => donemTip(d) === 'Q').sort((a,b) => donemSira(a)-donemSira(b))
const FY_LIST= DONEMLER.filter(d => donemTip(d) === 'FY').sort((a,b) => donemSira(a)-donemSira(b))
const TUM_YILLAR = Array.from(new Set(DONEMLER.map(d => parseInt(d.split('-')[0])))).sort()

type DonemPeriyot = 'ay' | 'Q' | 'FY'
interface DonemSec { yil: number; periyot: DonemPeriyot; alt: string }
function getAltlar(p: DonemPeriyot): string[] {
  if (p === 'FY') return ['FY']
  if (p === 'Q')  return ['1','2','3','4']
  return ['01','02','03','04','05','06','07','08','09','10','11','12']
}
function donemSecToStr(s: DonemSec): string {
  if (s.periyot === 'FY') return `${s.yil}-FY`
  if (s.periyot === 'Q')  return `${s.yil}-Q${s.alt}`
  return `${s.yil}-${s.alt.padStart(2,'0')}`
}

const KATEGORILER = [
  { key:'musteri',     label:'Müşteri',    color: CAT_COLORS['Müşteri']     || '#10b981' },
  { key:'ticari',      label:'Ticari',      color: CAT_COLORS['Ticari']      || '#3b82f6' },
  { key:'operasyonel', label:'Operasyonel', color: CAT_COLORS['Operasyonel'] || '#f59e0b' },
  { key:'bayi',        label:'Bayi Ağı',    color: CAT_COLORS['Bayi Ağı']   || '#8b5cf6' },
  { key:'kapsam',      label:'Kapsam',      color: CAT_COLORS['Kapsam']      || '#ef4444' },
]

// ── Veri hazırlama ────────────────────────────────────────────────────────────
function buildData(baz: string, cmp: string | null, bolge: string, yas: string) {
  const trKpis     = getKpisFromCube('', bolge, yas, baz)
  const trKpisCmp  = cmp ? getKpisFromCube('', bolge, yas, cmp) : null
  const trScore    = getScore('', bolge, yas, baz)
  const trScoreCmp = cmp ? getScore('', bolge, yas, cmp) : null

  const segData = SEGMENTLER.map(seg => ({
    seg,
    kpis:     getKpisFromCube(seg, bolge, yas, baz),
    kpisCmp:  cmp ? getKpisFromCube(seg, bolge, yas, cmp) : null,
    score:    getScore(seg, bolge, yas, baz),
    scoreCmp: cmp ? getScore(seg, bolge, yas, cmp) : null,
    kpiScores: getKpiScores(seg, bolge, yas, baz),
    markalar: getMarkaRanking(seg, bolge, yas, baz).slice(0, 5),
    markalaCmp: cmp ? getMarkaRanking(seg, bolge, yas, cmp).slice(0, 5) : null,
  }))

  const bolgeData = BOLGELER.slice(0, 8).map(b => ({
    bolge: b,
    score:    getScore('', b, yas, baz),
    scoreCmp: cmp ? getScore('', b, yas, cmp) : null,
    kpis:     getKpisFromCube('', b, yas, baz),
  }))

  const yasData = YAS_GRUPLARI.filter(y => y !== 'Tümü').map(y => ({
    yas: y,
    score:    getScore('', bolge, y, baz),
    scoreCmp: cmp ? getScore('', bolge, y, cmp) : null,
    kpis:     getKpisFromCube('', bolge, y, baz),
  }))

  const trendDonemler = Q_LIST.slice(-6)
  const kpiTrend = KPI_META.map((k, i) => ({
    ...k, i,
    values: trendDonemler.map(d => getKpisFromCube('', bolge, yas, d)[i] ?? 0),
  }))

  const katData = KATEGORILER.map(k => ({
    ...k,
    trVal:   trScore ? (trScore as any)[k.key] ?? 0 : 0,
    cmpVal:  trScoreCmp ? (trScoreCmp as any)[k.key] ?? 0 : null,
    segVals: SEGMENTLER.map(seg => {
      const sc = getScore(seg, bolge, yas, baz)
      const scCmp = cmp ? getScore(seg, bolge, yas, cmp) : null
      return { seg, val: sc ? (sc as any)[k.key] ?? 0 : 0, cmpVal: scCmp ? (scCmp as any)[k.key] ?? 0 : null }
    }),
  }))

  const kayiplar = KPI_META.map((k, i) => {
    if (!cmp) return null
    const curr = trKpis[i] ?? 0
    const prv  = trKpisCmp?.[i] ?? 0
    if (!prv || !curr) return null
    const pct = ((curr - prv) / Math.abs(prv)) * 100
    const kotu = isLowerBetter(i) ? pct > 3 : pct < -3
    if (!kotu) return null
    return { ...k, i, curr, prev: prv, pct: Math.round(pct * 10) / 10 }
  }).filter(Boolean) as any[]

  const tumMarkalar = SEGMENTLER.flatMap(seg =>
    getMarkaRanking(seg, bolge, yas, baz).map(m => ({
      ...m,
      cmpScore: cmp ? getMarkaRanking(seg, bolge, yas, cmp).find(x => x.marka === m.marka)?.score ?? null : null,
      kpiScores: getKpiScores(seg, bolge, yas, baz),
    }))
  ).sort((a,b) => b.score - a.score)

  return { baz, cmp, trKpis, trKpisCmp, trScore, trScoreCmp, segData, bolgeData, yasData, kpiTrend, trendDonemler, katData, kayiplar, tumMarkalar }
}

// ── Claude API yorumu ─────────────────────────────────────────────────────────
async function getYorum(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.text ?? ''
  } catch { return '' }
}

// ── Dönem seçici ──────────────────────────────────────────────────────────────
function DonemSecici({ label, value, onChange }: { label: string; value: DonemSec; onChange: (v: DonemSec) => void }) {
  const altlar = getAltlar(value.periyot)
  const altSec = altlar.includes(value.alt) ? value.alt : altlar[0]
  return (
    <div>
      <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</div>
      <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
        <select value={value.yil} onChange={e => onChange({...value, yil:parseInt(e.target.value)})} style={selSt}>
          {TUM_YILLAR.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display:'flex', gap:2 }}>
          {(['ay','Q','FY'] as DonemPeriyot[]).map(p => {
            const dis = p==='ay'?AYLIK.length===0:p==='Q'?Q_LIST.length===0:FY_LIST.length===0
            return (
              <button key={p} disabled={dis} onClick={() => onChange({...value, periyot:p, alt:p==='FY'?'FY':p==='Q'?'1':'01'})}
                style={{ padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:600, cursor:dis?'not-allowed':'pointer',
                  border:`1px solid ${value.periyot===p?'var(--blue)':'var(--bd)'}`,
                  background:value.periyot===p?'rgba(59,130,246,.12)':'var(--surf)',
                  color:dis?'var(--tx3)':value.periyot===p?'var(--blue)':'var(--tx2)', opacity:dis?0.5:1 }}>
                {p==='ay'?'Aylık':p==='Q'?'Çeyreklik':'Yıllık'}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
          {altlar.map(a => (
            <button key={a} onClick={() => onChange({...value, alt:a})}
              style={{ padding:'2px 6px', borderRadius:3, fontSize:9, cursor:'pointer',
                border:`1px solid ${altSec===a?'var(--blue)':'var(--bd)'}`,
                background:altSec===a?'rgba(59,130,246,.15)':'var(--surf3)',
                color:altSec===a?'var(--blue)':'var(--tx3)', fontWeight:altSec===a?700:400 }}>
              {value.periyot==='Q'?`Q${a}`:value.periyot==='FY'?'FY':a}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── UI Yardımcıları ───────────────────────────────────────────────────────────
function Sayfa({ children, son }: { children: React.ReactNode; son?: boolean }) {
  return (
    <div className="rapor-sayfa" style={{ marginBottom: son ? 0 : 40, display:'flex', flexDirection:'column', gap:14 }}>
      {children}
    </div>
  )
}
function Kart({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px', ...style }}>{children}</div>
}
function Baslik({ icon, children, color }: { icon: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:800, color:color||'var(--tx)', letterSpacing:'-.01em' }}>{children}</span>
    </div>
  )
}
function YorumBlok({ text, color = '#3b82f6' }: { text: string; color?: string }) {
  if (!text) return null
  return (
    <div style={{ background:'var(--surf2)', borderRadius:8, padding:'10px 14px', marginTop:10,
      fontSize:10, lineHeight:1.8, color:'var(--tx2)', borderLeft:`3px solid ${color}` }}>
      {text}
    </div>
  )
}
function Delta({ curr, prev, lob = false, fmt = '' }: { curr: number; prev: number; lob?: boolean; fmt?: string }) {
  if (!prev) return <span style={{ color:'var(--tx3)' }}>—</span>
  const pct = Math.round((curr - prev) / Math.abs(prev) * 1000) / 10
  const better = lob ? pct < 0 : pct > 0
  const c = better ? '#10b981' : Math.abs(pct) < 1 ? '#9ca3af' : '#ef4444'
  return <span style={{ fontSize:9, fontWeight:700, color:c }}>{pct > 0 ? `▲ +${pct}%` : `▼ ${pct}%`}</span>
}
function ScoreBand({ val }: { val: number }) {
  const c = val >= 100 ? '#10b981' : val >= 90 ? '#f59e0b' : '#ef4444'
  const bg = val >= 100 ? '#d1fae5' : val >= 90 ? '#fef3c7' : '#fee2e2'
  return <span style={{ background:bg, color:c, borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:800, fontFamily:'var(--font-dm-mono)', border:`1px solid ${c}44` }}>{val}</span>
}

// ── Rapor oluşturma fonksiyonu — component dışında ──────────────────────────
async function buildRapor(
  bazStr: string,
  cmpStr: string | null,
  selBolge: string,
  selYas: string,
  setGenerating: (v: boolean) => void,
  setProgress: (v: number) => void,
  setRapor: (v: ReturnType<typeof buildData>) => void,
  setYorumlar: (v: Record<string,string>) => void,
) {
  setGenerating(true)
  setProgress(5)
  const data = buildData(bazStr, cmpStr, selBolge, selYas)
  setRapor(data)
  setProgress(20)

  const trG = data.trScore?.genel ?? 0
  const trGCmp = data.trScoreCmp?.genel ?? 0
  const deltaPuan = cmpStr ? trG - trGCmp : null
  const katSirali = [...data.katData].sort((a,b) => b.trVal - a.trVal)
  const katEn = katSirali[0]
  const katZayif = [...data.katData].sort((a,b) => a.trVal - b.trVal)[0]

  const deltaPuanStr = deltaPuan !== null
    ? 'onceki doneme (' + cmpStr + ') gore ' + (deltaPuan > 0 ? '+' : '') + deltaPuan + ' puan.'
    : ''

  const genelBakis = [
    'Turkiye SSH sektoru', bazStr, 'donemi genel skor:', String(trG),
    deltaPuanStr,
    'Segment skorlari:', data.segData.map(s => s.seg + ':' + (s.score?.genel ?? 0)).join(', '),
    'Genel tabloyu 3-4 cumle editorial yorumla.',
  ].filter(Boolean).join(' ')

  const markaStr = data.tumMarkalar.slice(0,6).map((m,i) =>
    (i+1) + '.' + m.marka + '(' + m.segment + ') ' + m.score + ' puan' +
    (m.cmpScore !== null ? ' onceki:' + m.cmpScore : '')
  ).join('; ')

  const kpiStr = KPI_META.slice(0,6).map((k,i) =>
    k.ad + ': ' + fmtKpi(data.trKpis[i], k.fmt) +
    (data.trKpisCmp ? ' (onceki:' + fmtKpi(data.trKpisCmp[i], k.fmt) + ')' : '')
  ).join('; ')

  const bolgeStr = data.bolgeData.slice(0,5).map(b =>
    (b.bolge || 'TR') + ':' + (b.score?.genel ?? 0) +
    (b.scoreCmp ? ' (onceki:' + b.scoreCmp.genel + ')' : '')
  ).join(', ')

  const trendStr = data.trendDonemler.map(dt => {
    const sc = getScore('', selBolge, selYas, dt)
    return dt + ':' + (sc?.genel ?? 0)
  }).join(', ')

  const katDegisimStr = KATEGORILER.map(k => {
    const kat = data.katData.find(x => x.key === k.key)
    return k.label + ':' + (kat?.cmpVal ?? 0) + '->' + (kat?.trVal ?? 0)
  }).join(', ')

  const kayipStr = data.kayiplar.length > 0
    ? 'Kritik gerileme: ' + data.kayiplar.slice(0,3).map((x:any) => x.ad + ' ' + x.pct + '%').join(', ') + '.'
    : ''

  let karsilastirma = ''
  if (cmpStr) {
    karsilastirma = [
      bazStr, 'vs', cmpStr, 'karsılastırması: Genel skor', trGCmp + '->' + trG,
      '(' + (deltaPuan !== null && deltaPuan > 0 ? '+' : '') + deltaPuan + ' puan).',
      'Kategori degisimleri:', katDegisimStr + '.',
      kayipStr,
      'Kapsamlı donem karsılastırması yap.',
    ].filter(Boolean).join(' ')
  }

  const strateji = [
    'SSH rekabet analizi', bazStr, 'stratejik degerlendirme:',
    'Genel skor', String(trG) + ',',
    'en guclu kategori', (katEn?.label ?? '') + '(' + (katEn?.trVal ?? 0) + '),',
    'en zayif', (katZayif?.label ?? '') + '(' + (katZayif?.trVal ?? 0) + ').',
    data.kayiplar.length > 0 ? data.kayiplar.length + ' KPI gerileme gosterdi.' : '',
    cmpStr ? (cmpStr + ' doneminden bu yana genel skor ' + (deltaPuan !== null && deltaPuan > 0 ? 'artti' : 'geriledi') + '.') : '',
    '3 kritik stratejik oneri ver.',
  ].filter(Boolean).join(' ')

  const prompts: Record<string,string> = {
    genelBakis,
    marka: 'SSH marka sıralaması ' + bazStr + ': ' + markaStr + '. Marka dinamiklerini yorumla.',
    kpiDetay: 'KPI analizi ' + bazStr + ': ' + kpiStr + '. En kritik KPI bulgularını yorumla.',
    bolge: 'Bolgesel SSH skorları ' + bazStr + ': ' + bolgeStr + '. Cografi farklılıkları yorumla.',
    trend: 'Son ' + data.trendDonemler.length + ' donem SSH trend: ' + trendStr + '. Trendi yorumla.',
    karsilastirma,
    strateji,
  }

  const keys = Object.keys(prompts).filter(k => prompts[k])
  const yeni: Record<string,string> = {}
  for (let i = 0; i < keys.length; i++) {
    yeni[keys[i]] = await getYorum(prompts[keys[i]])
    setProgress(20 + Math.round((i+1)/keys.length * 75))
  }
  setYorumlar(yeni)
  setProgress(100)
  setGenerating(false)
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function OzetRaporPage() {
  const { selBolge, selYas } = useDashboardCtx()

  const sonYil = TUM_YILLAR[TUM_YILLAR.length-1] ?? 2024

  const [baz, setBaz] = useState<DonemSec>({ yil:sonYil, periyot:'Q', alt:'4' })
  const [cmp, setCmp] = useState<DonemSec>({ yil:sonYil-1, periyot:'Q', alt:'4' })
  const [cmpAktif, setCmpAktif] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [rapor, setRapor]           = useState<ReturnType<typeof buildData> | null>(null)
  const [yorumlar, setYorumlar]     = useState<Record<string,string>>({})

  const bazStr = donemSecToStr(baz)
  const cmpStr = cmpAktif ? donemSecToStr(cmp) : null
  const d = rapor

  const olustur = () => buildRapor(
    bazStr, cmpStr, selBolge, selYas,
    setGenerating, setProgress,
    setRapor as any, setYorumlar
  )

  return (
    <div className={styles.wrap}>
      <Topbar title="Özet Rapor" subtitle="Türkiye Otomotiv Sektörü SSH Rekabet Analizi" />
      <div className={styles.content}>

        {/* ── Dönem Seçici ── */}
        <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
            <DonemSecici label="Baz Dönem" value={baz} onChange={v => {
              // Periyot tipi değişince cmp'yi de aynı periyota sync et
              if (v.periyot !== baz.periyot) {
                const cmpAlt = v.periyot === 'FY' ? 'FY' : v.periyot === 'Q' ? '4' : '12'
                setCmp(prev => ({ ...prev, periyot: v.periyot, alt: cmpAlt, yil: prev.yil }))
              }
              setBaz(v)
            }} />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Karşılaştırma Dönemi</span>
                <button onClick={() => setCmpAktif(v=>!v)}
                  style={{ padding:'2px 8px', borderRadius:10, fontSize:8, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${cmpAktif?'var(--blue)':'var(--bd)'}`,
                    background:cmpAktif?'rgba(59,130,246,.1)':'var(--surf)',
                    color:cmpAktif?'var(--blue)':'var(--tx3)' }}>
                  {cmpAktif ? '✓ Aktif' : 'Ekle'}
                </button>
              </div>
              {cmpAktif && <DonemSecici label="" value={cmp} onChange={setCmp} />}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
              {d && <button onClick={() => {
                // Sidebar ve diğer UI'ı geçici olarak gizle
                const sidebar = document.querySelector('aside') as HTMLElement | null
                const topbar = document.querySelector('header') as HTMLElement | null
                if (sidebar) sidebar.style.display = 'none'
                if (topbar) topbar.style.display = 'none'
                window.print()
                // Print sonrası geri getir
                setTimeout(() => {
                  if (sidebar) sidebar.style.display = ''
                  if (topbar) topbar.style.display = ''
                }, 500)
              }}
                style={{ padding:'8px 16px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer',
                  border:'1px solid var(--bd)', background:'var(--surf)', color:'var(--tx2)' }}>🖨 PDF</button>}
              <button onClick={olustur} disabled={generating}
                style={{ padding:'8px 22px', borderRadius:8, fontSize:11, fontWeight:700, cursor:generating?'wait':'pointer',
                  border:'none', background:generating?'#6b9fc4':'var(--blue)', color:'#fff' }}>
                {generating ? `Oluşturuluyor… %${progress}` : '✦ Rapor Oluştur'}
              </button>
            </div>
          </div>
          {generating && (
            <div style={{ marginTop:12 }}>
              <div style={{ width:'100%', background:'var(--surf3)', borderRadius:20, height:5, overflow:'hidden' }}>
                <div style={{ width:`${progress}%`, height:'100%', background:'var(--blue)', borderRadius:20, transition:'width .4s' }}/>
              </div>
              <div style={{ fontSize:9, color:'var(--tx3)', marginTop:4 }}>AI yorumlar üretiliyor…</div>
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
          <>
          <div id="rapor-print-wrapper" style={{ display: 'block' }}>
          <div id="rapor-icerik">

            {/* ══════════════════════════════════════════════════════════════════
                SAYFA 1 — KAPAK + GENEL BAKIŞ
            ══════════════════════════════════════════════════════════════════ */}
            <Sayfa>
              {/* Kapak */}
              <div style={{ background:'linear-gradient(135deg, #0f1c2e 0%, #1a3353 60%, #0d2240 100%)',
                borderRadius:12, padding:'32px 36px', color:'#fff', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'rgba(59,130,246,.1)' }}/>
                <div style={{ position:'absolute', bottom:-40, right:100, width:130, height:130, borderRadius:'50%', background:'rgba(16,185,129,.08)' }}/>
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.2em', color:'#60a5fa', textTransform:'uppercase', marginBottom:6 }}>
                        Türkiye Otomotiv Sektörü
                      </div>
                      <div style={{ fontSize:28, fontWeight:900, lineHeight:1.15, marginBottom:4, letterSpacing:'-.02em' }}>
                        SSH Rekabet Analizi
                      </div>
                      <div style={{ fontSize:13, color:'#93c5fd', fontWeight:500 }}>
                        Satış Sonrası Hizmet KPI Performans Raporu
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>BAZ DÖNEM</div>
                      <div style={{ fontSize:16, fontWeight:800, color:'#e2e8f0', fontFamily:'var(--font-dm-mono)' }}>{d.baz}</div>
                      {d.cmp && (
                        <div style={{ marginTop:6 }}>
                          <div style={{ fontSize:9, color:'#93c5fd', marginBottom:2, textTransform:'uppercase', letterSpacing:'.1em' }}>KARŞILAŞTIRMA DÖNEMİ</div>
                          <div style={{ fontSize:14, fontWeight:700, color:'#94a3b8', fontFamily:'var(--font-dm-mono)' }}>{d.cmp}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Genel Skor</div>
                      <div style={{ fontSize:48, fontWeight:900, fontFamily:'var(--font-dm-mono)', lineHeight:1,
                        color:(d.trScore?.genel??0)>=100?'#34d399':(d.trScore?.genel??0)>=90?'#fbbf24':'#f87171' }}>
                        {d.trScore?.genel??'—'}
                      </div>
                    </div>
                    {d.trScoreCmp && (
                      <div style={{ borderLeft:'1px solid rgba(255,255,255,.12)', paddingLeft:28 }}>
                        <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Önceki Dönem</div>
                        <div style={{ fontSize:26, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'#94a3b8', lineHeight:1 }}>
                          {d.trScoreCmp.genel}
                        </div>
                        <div style={{ marginTop:6 }}>
                          {(() => { const diff=(d.trScore?.genel??0)-d.trScoreCmp.genel; return (
                            <span style={{ fontSize:13, fontWeight:700, color:diff>=0?'#34d399':'#f87171' }}>
                              {diff>=0?`▲ +${diff} puan`:`▼ ${diff} puan`}
                            </span>
                          )})()}
                        </div>
                      </div>
                    )}
                    <div style={{ borderLeft:'1px solid rgba(255,255,255,.12)', paddingLeft:28 }}>
                      <div style={{ fontSize:9, color:'#93c5fd', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Kapsam</div>
                      {[`${SEGMENTLER.length} Segment`, `${KPI_META.length} KPI`, `${BOLGELER.length} Bölge`].map(t => (
                        <div key={t} style={{ fontSize:11, color:'#cbd5e1', marginBottom:3 }}>· {t}</div>
                      ))}
                    </div>
                  </div>

                  {yorumlar.genelBakis && (
                    <div style={{ marginTop:22, padding:'12px 16px', background:'rgba(255,255,255,.05)',
                      borderRadius:8, borderLeft:'3px solid #60a5fa', fontSize:11, lineHeight:1.8, color:'#e2e8f0' }}>
                      {yorumlar.genelBakis}
                    </div>
                  )}
                </div>
              </div>

              {/* Kategori özeti */}
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${KATEGORILER.length},1fr)`, gap:10 }}>
                {d.katData.map(k => {
                  const delta = k.cmpVal !== null ? k.trVal - k.cmpVal : null
                  return (
                    <Kart key={k.key} style={{ textAlign:'center', borderTop:`3px solid ${k.color}`, padding:'12px' }}>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, fontWeight:600 }}>{k.label}</div>
                      <div style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:k.color }}>{k.trVal}</div>
                      {delta !== null && (
                        <div style={{ fontSize:9, marginTop:3, fontWeight:700, color:delta>=0?'#10b981':'#ef4444' }}>
                          {delta>=0?`▲ +${delta}`:`▼ ${delta}`}
                        </div>
                      )}
                    </Kart>
                  )
                })}
              </div>
            </Sayfa>

            {/* ══════════════════════════════════════════════════════════════════
                SAYFA 2 — MARKA SIRALAMASI
            ══════════════════════════════════════════════════════════════════ */}
            <Sayfa>
              <Kart>
                <Baslik icon="🏆">Marka Sıralaması</Baslik>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr style={{ background:'var(--surf2)' }}>
                        <th style={thS}>#</th>
                        <th style={thS}>Marka</th>
                        <th style={thS}>Segment</th>
                        <th style={thS}>Skor</th>
                        {d.cmp && <th style={thS}>Önceki</th>}
                        {d.cmp && <th style={thS}>Δ</th>}
                        {KATEGORILER.map(k => <th key={k.key} style={{ ...thS, color:k.color }}>{k.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {d.tumMarkalar.slice(0,20).map((m,i) => {
                        const segSc = getScore(m.segment, selBolge, selYas, d.baz)
                        return (
                          <tr key={m.marka} style={{ borderBottom:'1px solid var(--bd)' }}>
                            <td style={{ ...tdS, color:'var(--tx3)', fontFamily:'var(--font-dm-mono)', fontSize:9 }}>{i+1}</td>
                            <td style={{ ...tdS, fontWeight:700, color:SEGMENT_HEX[m.segment]||'var(--tx)' }}>{m.marka}</td>
                            <td style={tdS}>
                              <span style={{ background:SEGMENT_BG[m.segment], color:SEGMENT_HEX[m.segment],
                                padding:'1px 6px', borderRadius:20, fontSize:8, fontWeight:700, border:`1px solid ${SEGMENT_HEX[m.segment]}44` }}>
                                {m.segment}
                              </span>
                            </td>
                            <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontWeight:700,
                              color:m.score>=100?'#10b981':m.score>=90?'#f59e0b':'#ef4444' }}>{m.score}</td>
                            {d.cmp && <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)', fontSize:9 }}>{m.cmpScore??'—'}</td>}
                            {d.cmp && <td style={tdS}>{m.cmpScore!==null?<Delta curr={m.score} prev={m.cmpScore}/>:<span style={{color:'var(--tx3)'}}>—</span>}</td>}
                            {KATEGORILER.map(k => {
                              const v = segSc ? (segSc as any)[k.key] ?? 0 : 0
                              return <td key={k.key} style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontSize:9,
                                color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</td>
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <YorumBlok text={yorumlar.marka} color="#f59e0b" />
              </Kart>
            </Sayfa>

            {/* ══════════════════════════════════════════════════════════════════
                SAYFA 3 — KPI DETAY
            ══════════════════════════════════════════════════════════════════ */}
            <Sayfa>
              <Kart>
                <Baslik icon="📊">KPI Detay Analizi</Baslik>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr style={{ background:'var(--surf2)' }}>
                        <th style={thS}>KPI</th>
                        <th style={thS}>Tüm TR</th>
                        {d.cmp && <th style={thS}>Önceki</th>}
                        {d.cmp && <th style={thS}>Δ</th>}
                        {SEGMENTLER.map(seg => <th key={seg} style={{ ...thS, color:SEGMENT_HEX[seg] }}>{seg}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {KPI_META.map((k,i) => {
                        const trV = d.trKpis[i] ?? 0
                        const cmpV = d.trKpisCmp?.[i] ?? 0
                        const lob = isLowerBetter(i)
                        return (
                          <tr key={i} style={{ borderBottom:'1px solid var(--bd)' }}>
                            <td style={{ ...tdS, fontSize:9 }}>{k.ad}</td>
                            <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontWeight:700, textAlign:'center' }}>
                              {fmtKpi(trV, k.fmt)}
                            </td>
                            {d.cmp && <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)', textAlign:'center', fontSize:9 }}>{fmtKpi(cmpV, k.fmt)}</td>}
                            {d.cmp && <td style={{ ...tdS, textAlign:'center' }}>{cmpV ? <Delta curr={trV} prev={cmpV} lob={lob}/> : '—'}</td>}
                            {d.segData.map(s => {
                              const sv = s.kpis[i] ?? 0
                              const hc = heatColor(sv, trV, !lob)
                              return (
                                <td key={s.seg} style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontSize:9, textAlign:'center', color:hc.color, background:hc.bg }}>
                                  {fmtKpi(sv, k.fmt)}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <YorumBlok text={yorumlar.kpiDetay} color="#f59e0b" />
              </Kart>
            </Sayfa>

            {/* ══════════════════════════════════════════════════════════════════
                SAYFA 4 — BÖLGE ANALİZİ
            ══════════════════════════════════════════════════════════════════ */}
            <Sayfa>
              <Kart>
                <Baslik icon="🗺">Bölge Analizi</Baslik>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--tx2)', marginBottom:10 }}>Bölgesel Skor Dağılımı</div>
                    {d.bolgeData.map(b => {
                      const sc = b.score?.genel ?? 0
                      const scCmp = b.scoreCmp?.genel ?? null
                      const maxSc = Math.max(...d.bolgeData.map(x => x.score?.genel ?? 0), 1)
                      const c = sc>=100?'#10b981':sc>=90?'#f59e0b':'#ef4444'
                      return (
                        <div key={b.bolge} style={{ marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                            <span style={{ fontSize:9, color:'var(--tx2)', fontWeight:600 }}>{b.bolge||'Tüm TR'}</span>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              {scCmp !== null && <Delta curr={sc} prev={scCmp}/>}
                              <span style={{ fontSize:10, fontWeight:700, color:c, fontFamily:'var(--font-dm-mono)' }}>{sc}</span>
                            </div>
                          </div>
                          <div style={{ background:'var(--surf3)', borderRadius:4, height:8, overflow:'hidden' }}>
                            <div style={{ width:`${(sc/maxSc)*100}%`, height:'100%', background:c, borderRadius:4 }}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--tx2)', marginBottom:10 }}>Yaş Kırılımı</div>
                    {d.yasData.map(y => {
                      const sc = y.score?.genel ?? 0
                      const scCmp = y.scoreCmp?.genel ?? null
                      return (
                        <div key={y.yas} style={{ background:'var(--surf2)', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)' }}>{y.yas} Yıl</span>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              {scCmp !== null && <Delta curr={sc} prev={scCmp}/>}
                              <ScoreBand val={sc}/>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:`repeat(${KATEGORILER.length},1fr)`, gap:4 }}>
                            {KATEGORILER.map(k => {
                              const v = y.score ? (y.score as any)[k.key] ?? 0 : 0
                              return (
                                <div key={k.key} style={{ textAlign:'center' }}>
                                  <div style={{ fontSize:7, color:'var(--tx3)', marginBottom:2 }}>{k.label}</div>
                                  <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--font-dm-mono)',
                                    color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <YorumBlok text={yorumlar.bolge} color="#8b5cf6" />
              </Kart>

              {/* Segment analizi */}
              <Kart>
                <Baslik icon="🔷">Segment Analizi</Baslik>
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${SEGMENTLER.length},1fr)`, gap:12 }}>
                  {d.segData.map(s => (
                    <div key={s.seg} style={{ background:SEGMENT_BG[s.seg], border:`1px solid ${SEGMENT_HEX[s.seg]}55`, borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${SEGMENT_HEX[s.seg]}33` }}>
                        <span style={{ fontSize:13, fontWeight:800, color:SEGMENT_HEX[s.seg] }}>{s.seg}</span>
                        <ScoreBand val={s.score?.genel??0}/>
                      </div>
                      {/* Genel + Kategoriler */}
                      <div style={{ marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, padding:'4px 6px', background:`${SEGMENT_HEX[s.seg]}15`, borderRadius:5 }}>
                          <span style={{ fontSize:9, fontWeight:800, color:SEGMENT_HEX[s.seg] }}>Genel</span>
                          <span style={{ fontSize:10, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:SEGMENT_HEX[s.seg] }}>
                            {s.score?.genel??0}
                            {s.scoreCmp && <span style={{ fontSize:8, color:'var(--tx3)', marginLeft:4 }}>({s.scoreCmp.genel})</span>}
                          </span>
                        </div>
                        {KATEGORILER.map(k => {
                          const v = s.score ? (s.score as any)[k.key] ?? 0 : 0
                          const vc = s.scoreCmp ? (s.scoreCmp as any)[k.key] ?? 0 : null
                          return (
                            <div key={k.key} style={{ display:'flex', justifyContent:'space-between', marginBottom:3, padding:'2px 4px' }}>
                              <span style={{ fontSize:8, color:'var(--tx3)' }}>{k.label}</span>
                              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                                {vc !== null && <Delta curr={v} prev={vc}/>}
                                <span style={{ fontSize:9, fontWeight:700, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Top markalar */}
                      <div style={{ borderTop:`1px solid ${SEGMENT_HEX[s.seg]}33`, paddingTop:8 }}>
                        <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:4 }}>Top 3 Marka</div>
                        {s.markalar.slice(0,3).map((m,i) => {
                          const cmpM = s.markalaCmp?.find(x=>x.marka===m.marka)
                          return (
                            <div key={m.marka} style={{ display:'flex', justifyContent:'space-between', marginBottom:2, fontSize:8 }}>
                              <span style={{ color:'var(--tx2)' }}>{i+1}. {m.marka}</span>
                              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                {cmpM && <Delta curr={m.score} prev={cmpM.score}/>}
                                <span style={{ fontWeight:700, color:SEGMENT_HEX[s.seg] }}>{m.score}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Kart>
            </Sayfa>

            {/* ══════════════════════════════════════════════════════════════════
                SAYFA 5 — DÖNEMSEl TREND
            ══════════════════════════════════════════════════════════════════ */}
            <Sayfa>
              <Kart>
                <Baslik icon="📈">Dönemsel Trend Analizi ({d.trendDonemler.join(' → ')})</Baslik>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
                  {d.kpiTrend.slice(0,8).map(k => {
                    const vals = k.values
                    const last = vals[vals.length-1], first = vals[0]
                    const trend = first ? ((last-first)/Math.abs(first)*100) : 0
                    const lob = isLowerBetter(k.i)
                    const tc = (lob?trend<0:trend>0) ? '#10b981' : Math.abs(trend)<2 ? '#9ca3af' : '#ef4444'
                    const minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV-minV||1
                    const W=130, H=40
                    const pts = vals.map((v,i) => ({
                      x: (i/(vals.length-1))*W,
                      y: H-((v-minV)/range)*H*.8-H*.1
                    }))
                    const pathD = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
                    return (
                      <div key={k.i} style={{ background:'var(--surf2)', borderRadius:8, padding:10 }}>
                        <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:6, lineHeight:1.3, minHeight:24 }}>{k.ad}</div>
                        <svg width={W} height={H+16} style={{ overflow:'visible' }}>
                          <path d={pathD} fill="none" stroke={tc} strokeWidth={1.5} strokeLinecap="round"/>
                          {pts.map((p,pi) => (
                            <g key={pi}>
                              <circle cx={p.x} cy={p.y} r={2.5} fill={tc}/>
                              <text x={p.x} y={H+13} textAnchor="middle" fontSize={7} fill="#9ca3af">
                                {d.trendDonemler[pi]?.split('-')[1]}
                              </text>
                            </g>
                          ))}
                        </svg>
                        <div style={{ fontSize:8, fontWeight:700, color:tc, marginTop:4 }}>
                          {trend>0?`▲ +`:trend<0?`▼ `:'→ '}{Math.abs(Math.round(trend*10)/10)}% trend
                        </div>
                      </div>
                    )
                  })}
                </div>
                <YorumBlok text={yorumlar.trend} color="#06b6d4" />
              </Kart>
            </Sayfa>

            {/* ══════════════════════════════════════════════════════════════════
                SAYFA 6 — DÖNEM KARŞILAŞTIRMASI (sadece cmp varsa)
            ══════════════════════════════════════════════════════════════════ */}
            {d.cmp && (
              <Sayfa>
                <Kart>
                  <Baslik icon="⚖️">Dönem Karşılaştırması: {d.baz} vs {d.cmp}</Baslik>

                  {/* Genel skor karşılaştırması */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                    <div style={{ background:'var(--surf2)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.08em' }}>Baz Dönem ({d.baz})</div>
                      <div style={{ fontSize:36, fontWeight:900, fontFamily:'var(--font-dm-mono)',
                        color:(d.trScore?.genel??0)>=100?'#10b981':(d.trScore?.genel??0)>=90?'#f59e0b':'#ef4444' }}>
                        {d.trScore?.genel??'—'}
                      </div>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginTop:4 }}>Genel Skor</div>
                    </div>
                    <div style={{ background:'var(--surf2)', borderRadius:10, padding:'14px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                      {(() => { const diff=(d.trScore?.genel??0)-(d.trScoreCmp?.genel??0); return (
                        <>
                          <div style={{ fontSize:28, fontWeight:900, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?`▲ +${diff}`:`▼ ${diff}`}</div>
                          <div style={{ fontSize:9, color:'var(--tx3)', marginTop:4 }}>puan değişim</div>
                        </>
                      )})()}
                    </div>
                    <div style={{ background:'var(--surf2)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.08em' }}>Karş. Dönem ({d.cmp})</div>
                      <div style={{ fontSize:36, fontWeight:900, fontFamily:'var(--font-dm-mono)',
                        color:(d.trScoreCmp?.genel??0)>=100?'#10b981':(d.trScoreCmp?.genel??0)>=90?'#f59e0b':'#ef4444' }}>
                        {d.trScoreCmp?.genel??'—'}
                      </div>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginTop:4 }}>Genel Skor</div>
                    </div>
                  </div>

                  {/* Kategori karşılaştırma */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--tx2)', marginBottom:8 }}>Kategori Bazlı Değişim</div>
                    <div style={{ display:'grid', gridTemplateColumns:`repeat(${KATEGORILER.length},1fr)`, gap:8 }}>
                      {d.katData.map(k => {
                        const diff = k.cmpVal !== null ? k.trVal - k.cmpVal : null
                        return (
                          <div key={k.key} style={{ background:'var(--surf2)', borderRadius:8, padding:'10px', textAlign:'center', borderTop:`2px solid ${k.color}` }}>
                            <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:6 }}>{k.label}</div>
                            <div style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:k.color }}>{k.trVal}</div>
                            {k.cmpVal !== null && <div style={{ fontSize:9, color:'var(--tx3)', margin:'3px 0' }}>{k.cmpVal}</div>}
                            {diff !== null && (
                              <div style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>
                                {diff>=0?`▲ +${diff}`:`▼ ${diff}`}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Segment karşılaştırma */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--tx2)', marginBottom:8 }}>Segment Skor Değişimi</div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead>
                        <tr style={{ background:'var(--surf2)' }}>
                          <th style={thS}>Segment</th>
                          <th style={{ ...thS, textAlign:'center' }}>{d.baz}</th>
                          <th style={{ ...thS, textAlign:'center' }}>{d.cmp}</th>
                          <th style={{ ...thS, textAlign:'center' }}>Δ</th>
                          {KATEGORILER.map(k => <th key={k.key} style={{ ...thS, color:k.color, textAlign:'center' }}>{k.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {d.segData.map(s => {
                          const diff = s.scoreCmp ? (s.score?.genel??0) - s.scoreCmp.genel : null
                          return (
                            <tr key={s.seg} style={{ borderBottom:'1px solid var(--bd)' }}>
                              <td style={{ ...tdS, fontWeight:700, color:SEGMENT_HEX[s.seg] }}>{s.seg}</td>
                              <td style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700,
                                color:(s.score?.genel??0)>=100?'#10b981':(s.score?.genel??0)>=90?'#f59e0b':'#ef4444' }}>
                                {s.score?.genel??'—'}
                              </td>
                              <td style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', color:'var(--tx3)' }}>
                                {s.scoreCmp?.genel??'—'}
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                {diff !== null ? <span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?`▲ +${diff}`:`▼ ${diff}`}</span> : '—'}
                              </td>
                              {KATEGORILER.map(k => {
                                const v = s.score ? (s.score as any)[k.key]??0 : 0
                                const vc = s.scoreCmp ? (s.scoreCmp as any)[k.key]??0 : null
                                const dv = vc !== null ? v - vc : null
                                return (
                                  <td key={k.key} style={{ ...tdS, textAlign:'center', fontSize:9 }}>
                                    <div style={{ fontFamily:'var(--font-dm-mono)', fontWeight:700, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</div>
                                    {dv !== null && <div style={{ fontSize:7, color:dv>=0?'#10b981':'#ef4444' }}>{dv>=0?`+${dv}`:dv}</div>}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Puan kayıpları */}
                  {d.kayiplar.length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#ef4444', marginBottom:8 }}>⚠ Kritik Gerileme Alanları</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                        {d.kayiplar.slice(0,6).map((k:any) => (
                          <div key={k.i} style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 12px' }}>
                            <div style={{ fontSize:9, color:'var(--tx2)', marginBottom:5, lineHeight:1.3 }}>{k.ad}</div>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <div>
                                <div style={{ fontSize:7, color:'var(--tx3)' }}>{d.baz}</div>
                                <div style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'#ef4444' }}>{fmtKpi(k.curr,k.fmt)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize:7, color:'var(--tx3)' }}>{d.cmp}</div>
                                <div style={{ fontSize:11, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)' }}>{fmtKpi(k.prev,k.fmt)}</div>
                              </div>
                              <div style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'#ef4444' }}>
                                {k.pct>0?`+${k.pct}`:k.pct}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <YorumBlok text={yorumlar.karsilastirma} color="#8b5cf6" />
                </Kart>
              </Sayfa>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SON SAYFA — STRATEJİK DEĞERLENDİRME & ÖNERİLER
            ══════════════════════════════════════════════════════════════════ */}
            <Sayfa son>
              <div style={{ background:'linear-gradient(135deg, #0f2744 0%, #1a3a5c 50%, #0f2040 100%)',
                borderRadius:12, padding:'28px 32px', color:'#fff' }}>
                <div style={{ fontSize:14, fontWeight:800, marginBottom:20, letterSpacing:'-.01em' }}>
                  💡 360° Stratejik Değerlendirme & Öneriler
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Güçlü Yönler</div>
                    {[...d.katData].sort((a,b)=>b.trVal-a.trVal).slice(0,2).map(k => (
                      <div key={k.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7,
                        background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', flexShrink:0 }}/>
                        <div>
                          <span style={{ fontSize:10, color:'#e2e8f0', fontWeight:600 }}>{k.label}</span>
                          <span style={{ fontSize:11, fontFamily:'var(--font-dm-mono)', fontWeight:800, color:'#34d399', marginLeft:8 }}>{k.trVal}</span>
                          {k.cmpVal !== null && <span style={{ fontSize:8, color:'#64748b', marginLeft:4 }}>(önceki: {k.cmpVal})</span>}
                        </div>
                      </div>
                    ))}
                    {[...d.segData].sort((a,b)=>(b.score?.genel??0)-(a.score?.genel??0)).slice(0,1).map(s => (
                      <div key={s.seg} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7,
                        background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#60a5fa', flexShrink:0 }}/>
                        <span style={{ fontSize:10, color:'#e2e8f0' }}>Lider segment: <strong>{s.seg}</strong> ({s.score?.genel??0} puan)</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#f87171', marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Gelişim Alanları</div>
                    {[...d.katData].sort((a,b)=>a.trVal-b.trVal).slice(0,2).map(k => (
                      <div key={k.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7,
                        background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#f87171', flexShrink:0 }}/>
                        <div>
                          <span style={{ fontSize:10, color:'#e2e8f0', fontWeight:600 }}>{k.label}</span>
                          <span style={{ fontSize:11, fontFamily:'var(--font-dm-mono)', fontWeight:800, color:'#f87171', marginLeft:8 }}>{k.trVal}</span>
                          {k.cmpVal !== null && <span style={{ fontSize:8, color:'#64748b', marginLeft:4 }}>(önceki: {k.cmpVal})</span>}
                        </div>
                      </div>
                    ))}
                    {d.kayiplar.length > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7,
                        background:'rgba(239,68,68,.1)', borderRadius:7, padding:'8px 12px', border:'1px solid rgba(239,68,68,.2)' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', flexShrink:0 }}/>
                        <span style={{ fontSize:10, color:'#fca5a5' }}>{d.kayiplar.length} KPI kritik gerileme gösterdi</span>
                      </div>
                    )}
                  </div>
                </div>

                {yorumlar.strateji && (
                  <div style={{ background:'rgba(255,255,255,.07)', borderRadius:8, padding:'16px 18px',
                    fontSize:11, lineHeight:1.9, color:'#e2e8f0', borderLeft:'3px solid #34d399' }}>
                    {yorumlar.strateji}
                  </div>
                )}

                <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.1)',
                  fontSize:8, color:'#475569', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>SSH Rekabet Analizi · Baz: {d.baz}{d.cmp?` · Karş: ${d.cmp}`:''}</span>
                  <span>{selBolge||'Tüm Türkiye'} · {new Date().toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </Sayfa>

          </div>{/* rapor-icerik sonu */}
          </div>{/* rapor-print-wrapper sonu */}
          </>
        )}
      </div>

      <style>{`
        .rapor-sayfa {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }

          /* Her şeyi gizle */
          body > * { display: none !important; }

          /* Sadece rapor içeriğini göster */
          #rapor-print-wrapper {
            display: block !important;
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            z-index: 99999;
          }

          .rapor-sayfa {
            page-break-after: always;
            break-after: page;
          }
          .rapor-sayfa:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .rapor-sayfa > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}

const selSt: React.CSSProperties = { padding:'3px 7px', borderRadius:5, fontSize:9, fontWeight:600, background:'var(--surf)', border:'1px solid var(--bd)', color:'var(--tx2)', cursor:'pointer' }
const thS: React.CSSProperties = { padding:'7px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
const tdS: React.CSSProperties = { padding:'6px 10px', borderBottom:'1px solid var(--bd)' }
