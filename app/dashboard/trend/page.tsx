'use client'

import { useMemo, useRef, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, CAT_COLORS,
  fmtKpi, getKpisFromCube, getScore, DONEMLER,
} from '@/lib/kpi'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Legend,
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

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

const AYLIK_DONEMLER = DONEMLER.filter(d => donemTip(d) === 'ay').sort((a,b) => donemSira(a)-donemSira(b))
const Q_DONEMLER     = DONEMLER.filter(d => donemTip(d) === 'Q').sort((a,b) => donemSira(a)-donemSira(b))
const FY_DONEMLER    = DONEMLER.filter(d => donemTip(d) === 'FY').sort((a,b) => donemSira(a)-donemSira(b))
const TUM_YILLAR     = Array.from(new Set(DONEMLER.map(d => parseInt(d.split('-')[0])))).sort()

// ── Sabitler ──────────────────────────────────────────────────────────────────
const KATEGORILER = [
  { key: 'musteri',     label: 'Müşteri',    color: CAT_COLORS['Müşteri']     || '#10b981' },
  { key: 'ticari',      label: 'Ticari',      color: CAT_COLORS['Ticari']      || '#3b82f6' },
  { key: 'operasyonel', label: 'Operasyonel', color: CAT_COLORS['Operasyonel'] || '#f59e0b' },
  { key: 'bayi',        label: 'Bayi Ağı',    color: CAT_COLORS['Bayi Ağı']   || '#8b5cf6' },
  { key: 'kapsam',      label: 'Kapsam',      color: CAT_COLORS['Kapsam']      || '#ef4444' },
]

const SERI_RENKLER = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4',
  '#ec4899','#84cc16','#f97316','#a78bfa','#34d399','#fb923c',
]

type SeriTip = 'deger' | 'skor'

interface Seri {
  id: string; label: string; color: string; tip: SeriTip
  segment: string; kpiIdx: number | null; katKey: string | null
}

function makeSeriId() { return Math.random().toString(36).slice(2,8) }

function getSeriVeri(s: Seri, donemler: string[], bolge: string, yas: string): number[] {
  return donemler.map(d => {
    if (s.tip === 'skor') {
      const sc = getScore(s.segment, bolge, yas, d)
      if (!sc) return 0
      if (s.katKey) return (sc as any)[s.katKey] ?? sc.genel
      return sc.genel
    }
    if (s.kpiIdx === null) return 0
    return getKpisFromCube(s.segment, bolge, yas, d)[s.kpiIdx] ?? 0
  })
}

// ── Nokta etiketi plugin ──────────────────────────────────────────────────────
const pointLabelPlugin = {
  id: 'pointLabel',
  afterDatasetsDraw(chart: any) {
    const ctx = chart.ctx
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      meta.data.forEach((pt: any, pi: number) => {
        const raw = ds.data[pi]
        if (!raw) return
        const lbl = ds._fmt ? ds._fmt(raw) : String(Math.round(raw))
        ctx.save()
        ctx.fillStyle = ds.borderColor
        ctx.font = '700 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(lbl, pt.x, pt.y - 5)
        ctx.restore()
      })
    })
  }
}
ChartJS.register(pointLabelPlugin)

// ── Dönem seçici bileşeni ─────────────────────────────────────────────────────
type DonemPeriyot = 'ay' | 'Q' | 'FY'

interface DonemSec { yil: number; periyot: DonemPeriyot; alt: string }

function donemSecToStr(s: DonemSec): string {
  if (s.periyot === 'FY') return `${s.yil}-FY`
  if (s.periyot === 'Q')  return `${s.yil}-Q${s.alt}`
  return `${s.yil}-${s.alt.padStart(2,'0')}`
}

function getAltSecenekler(periyot: DonemPeriyot): string[] {
  if (periyot === 'FY') return ['FY']
  if (periyot === 'Q')  return ['1','2','3','4']
  return ['01','02','03','04','05','06','07','08','09','10','11','12']
}

function filtreDonemler(bas: DonemSec, bit: DonemSec): string[] {
  const basStr = donemSecToStr(bas)
  const bitStr = donemSecToStr(bit)
  const basS = donemSira(basStr), bitS = donemSira(bitStr)
  const liste = bas.periyot === 'ay' ? AYLIK_DONEMLER : bas.periyot === 'Q' ? Q_DONEMLER : FY_DONEMLER
  return liste.filter(d => donemSira(d) >= Math.min(basS,bitS) && donemSira(d) <= Math.max(basS,bitS))
}

function DonemSecici({ value, onChange }: {
  value: DonemSec
  onChange: (v: DonemSec) => void
}) {
  const altlar = getAltSecenekler(value.periyot)
  const altSecili = altlar.includes(value.alt) ? value.alt : altlar[0]

  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
      {/* Yıl */}
      <select value={value.yil}
        onChange={e => onChange({ ...value, yil: parseInt(e.target.value) })}
        style={selSt}>
        {TUM_YILLAR.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      {/* Periyot */}
      <div style={{ display:'flex', gap:2 }}>
        {(['ay','Q','FY'] as DonemPeriyot[]).map(p => {
          const disabled = p === 'ay' ? AYLIK_DONEMLER.length===0 : p === 'Q' ? Q_DONEMLER.length===0 : FY_DONEMLER.length===0
          return (
            <button key={p} disabled={disabled}
              onClick={() => {
                const newAlt = p==='FY' ? 'FY' : p==='Q' ? '1' : '01'
                onChange({ ...value, periyot:p, alt:newAlt })
              }}
              style={{ padding:'3px 8px', borderRadius:4, fontSize:9, fontWeight:600, cursor:disabled?'not-allowed':'pointer',
                border:`1px solid ${value.periyot===p?'var(--blue)':'var(--bd)'}`,
                background:value.periyot===p?'rgba(59,130,246,.12)':'var(--surf)',
                color:disabled?'var(--tx3)':value.periyot===p?'var(--blue)':'var(--tx2)',
                opacity:disabled?.5:1 }}>
              {p==='ay'?'Aylık':p==='Q'?'Çeyreklik':'Yıllık'}
            </button>
          )
        })}
      </div>
      {/* Alt seçenek */}
      <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
        {altlar.map(a => (
          <button key={a} onClick={() => onChange({ ...value, alt:a })}
            style={{ padding:'2px 6px', borderRadius:4, fontSize:9, cursor:'pointer',
              border:`1px solid ${altSecili===a?'var(--blue)':'var(--bd)'}`,
              background:altSecili===a?'rgba(59,130,246,.15)':'var(--surf3)',
              color:altSecili===a?'var(--blue)':'var(--tx3)', fontWeight:altSecili===a?700:400 }}>
            {value.periyot==='Q'?`Q${a}`:value.periyot==='FY'?'FY':a}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Builder state tipi ────────────────────────────────────────────────────────
interface BuilderState {
  segmentler: string[]   // seçili segmentler (birden fazla olabilir)
  kategoriler: string[]  // seçili kategori keyler
  kpiEklendi: boolean    // en az bir KPI sürüklendi mi
  tip: SeriTip | null
}

// ── Tek grafik builder bileşeni ───────────────────────────────────────────────
function GrafikBuilder({ idx, bolge, yas }: { idx: number; bolge: string; yas: string }) {
  const ilkYil = TUM_YILLAR[0] ?? 2024
  const sonYil = TUM_YILLAR[TUM_YILLAR.length-1] ?? 2024

  const [bas, setBas] = useState<DonemSec>({ yil: ilkYil, periyot:'Q', alt:'1' })
  const [bit, setBit] = useState<DonemSec>({ yil: sonYil, periyot:'Q', alt:'4' })

  const aktifDonemler = useMemo(() => filtreDonemler(bas, bit), [bas, bit])

  // Seriler
  const [seriler, setSeriler] = useState<Seri[]>([])
  const [dragOver, setDragOver] = useState(false)

  // Builder ref (stale closure sorunu yok)
  const bRef = useRef<BuilderState>({ segmentler:[], kategoriler:[], kpiEklendi:false, tip:null })
  const [bSnap, setBSnap] = useState<BuilderState>({ segmentler:[], kategoriler:[], kpiEklendi:false, tip:null })
  const dragPayload = useRef('')

  function updateB(patch: Partial<BuilderState>) {
    bRef.current = { ...bRef.current, ...patch }
    setBSnap({ ...bRef.current })
  }

  // KPI listesi — tek kategori seçiliyse o kategorinin KPI'ları
  const filteredKpis = useMemo(() => {
    if (bSnap.kategoriler.length === 1) {
      const katLabel = KATEGORILER.find(k => k.key === bSnap.kategoriler[0])?.label
      return KPI_META.map((k,i) => ({...k,i})).filter(k => k.kat === katLabel)
    }
    if (bSnap.kategoriler.length === 0) return KPI_META.map((k,i) => ({...k,i}))
    return [] // birden fazla kategori → KPI eklenemez
  }, [bSnap.kategoriler])

  const kpiEklenebilir = bSnap.kategoriler.length <= 1
  const degerAktif = bSnap.kpiEklendi  // en az bir KPI eklendiyse Değer aktif
  const skorAktif  = true              // Skor her zaman eklenebilir

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    let payload: any
    try { payload = JSON.parse(dragPayload.current) } catch { return }
    const b = bRef.current

    if (payload.grup === 'segment') {
      const yeni = b.segmentler.includes(payload.seg)
        ? b.segmentler.filter(s => s !== payload.seg)
        : [...b.segmentler, payload.seg]
      updateB({ segmentler: yeni })
      return
    }

    if (payload.grup === 'kategori') {
      const yeni = b.kategoriler.includes(payload.katKey)
        ? b.kategoriler.filter(k => k !== payload.katKey)
        : [...b.kategoriler, payload.katKey]
      updateB({ kategoriler: yeni, kpiEklendi: false })
      return
    }

    if (payload.grup === 'skor') {
      updateB({ tip: 'skor' })
      // Her segment için skor serisi oluştur
      const segs = b.segmentler.length ? b.segmentler : ['']
      const kats = b.kategoriler.length ? b.kategoriler : [null]
      const yeniSeriler: Seri[] = []
      segs.forEach(seg => {
        kats.forEach(katKey => {
          const katLabel = katKey ? (KATEGORILER.find(k=>k.key===katKey)?.label ?? 'Genel') : 'Genel'
          const segLabel = seg || 'Tüm TR'
          const color = SERI_RENKLER[(seriler.length + yeniSeriler.length) % SERI_RENKLER.length]
          yeniSeriler.push({ id:makeSeriId(), label:`${segLabel} · ${katLabel} Skoru`, color, tip:'skor', segment:seg, kpiIdx:null, katKey })
        })
      })
      setSeriler(prev => [...prev, ...yeniSeriler])
      return
    }

    if (payload.grup === 'deger') {
      if (!b.kpiEklendi) return // Değer ancak KPI eklendikten sonra
      updateB({ tip: 'deger' })
      return
    }

    if (payload.grup === 'kpi') {
      if (!kpiEklenebilir) return
      const segs = b.segmentler.length ? b.segmentler : ['']
      const yeniSeriler: Seri[] = []
      segs.forEach(seg => {
        const segLabel = seg || 'Tüm TR'
        const color = SERI_RENKLER[(seriler.length + yeniSeriler.length) % SERI_RENKLER.length]
        yeniSeriler.push({ id:makeSeriId(), label:`${segLabel} · ${payload.label}`, color, tip:'deger', segment:seg, kpiIdx:payload.kpiIdx, katKey:null })
      })
      setSeriler(prev => [...prev, ...yeniSeriler])
      updateB({ kpiEklendi: true })
      return
    }
  }

  function removeSeri(id: string) { setSeriler(prev => prev.filter(s => s.id !== id)) }

  // Chart data — iki eksen: deger=y, skor=y1
  const hasDeger = seriler.some(s => s.tip === 'deger')
  const hasSkor  = seriler.some(s => s.tip === 'skor')
  const dualAxis = hasDeger && hasSkor

  const chartData = useMemo(() => ({
    labels: aktifDonemler,
    datasets: seriler.map(s => {
      const veri = getSeriVeri(s, aktifDonemler, bolge, yas)
      const fmt = s.kpiIdx !== null ? KPI_META[s.kpiIdx].fmt : 'int'
      return {
        label: s.label,
        data: veri,
        borderColor: s.color,
        backgroundColor: s.color + '18',
        borderWidth: 2.5,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: s.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        fill: false,
        tension: 0.3,
        yAxisID: dualAxis && s.tip === 'skor' ? 'y1' : 'y',
        _fmt: (v: number) => s.tip === 'skor' ? `${Math.round(v)}` : fmtKpi(v, fmt),
      }
    }),
  }), [seriler, aktifDonemler, bolge, yas, dualAxis])

  const chartOptions = useMemo(() => {
    const degerVals = seriler.filter(s=>s.tip==='deger').flatMap(s => getSeriVeri(s,aktifDonemler,bolge,yas)).filter(v=>v>0)
    const skorVals  = seriler.filter(s=>s.tip==='skor').flatMap(s => getSeriVeri(s,aktifDonemler,bolge,yas)).filter(v=>v>0)

    function axisBounds(vals: number[]) {
      if (!vals.length) return { min: 0, max: 100 }
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const pad = (mx - mn) * 0.35 || mx * 0.2 || 10
      return { min: Math.max(0, mn - pad), max: mx + pad }
    }

    const dB = axisBounds(degerVals)
    const sB = axisBounds(skorVals)

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display:true, position:'top' as const, labels:{ color:'#8496b0', font:{size:9}, boxWidth:12, padding:10 } },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const s = seriler[ctx.datasetIndex]
              if (!s) return ''
              const v = ctx.parsed.y
              if (s.tip==='skor') return `${s.label}: ${Math.round(v)} puan`
              if (s.kpiIdx!==null) return `${s.label}: ${fmtKpi(v, KPI_META[s.kpiIdx].fmt)}`
              return `${s.label}: ${v}`
            },
          },
        },
      },
      scales: {
        y: {
          type: 'linear' as const, position: 'left' as const,
          min: dB.min, max: dB.max,
          grid: { color:'rgba(255,255,255,.05)' },
          ticks: { color:'#8496b0', font:{size:9} },
          title: dualAxis ? { display:true, text:'Değer', color:'#8496b0', font:{size:8} } : undefined,
        },
        ...(dualAxis ? {
          y1: {
            type: 'linear' as const, position: 'right' as const,
            min: sB.min, max: sB.max,
            grid: { drawOnChartArea: false },
            ticks: { color:'#10b981', font:{size:9} },
            title: { display:true, text:'Skor', color:'#10b981', font:{size:8} },
          }
        } : {}),
        x: {
          grid: { display:false },
          ticks: { color:'#8496b0', font:{size:9}, maxRotation:45, autoSkip:false },
        },
      },
    }
  }, [chartData, seriler, aktifDonemler, bolge, yas, dualAxis])

  return (
    <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:12, padding:14, marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', marginBottom:12 }}>
        Grafik {idx + 1}
      </div>

      {/* Builder + Grafik — tek grid, sol panel + sağda grafik */}
      <div style={{ display:'grid', gridTemplateColumns:'230px 1fr', gap:12, alignItems:'start' }}>

        {/* Sol panel — sticky */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, position:'sticky', top:12 }}>

          {/* Dönem filtresi */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, padding:'10px 11px' }}>
            <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:7 }}>Dönem Aralığı</div>
            <DonemSecici value={bas} onChange={v => { setBas(v); if (donemSira(donemSecToStr(v)) > donemSira(donemSecToStr(bit))) setBit({...v}) }} />
            <div style={{ display:'flex', alignItems:'center', gap:6, margin:'5px 0' }}>
              <span style={{ color:'var(--tx3)', fontSize:12 }}>↓</span>
              <span style={{ fontSize:9, color:'var(--tx3)' }}>{aktifDonemler.length} dönem</span>
            </div>
            <DonemSecici value={bit} onChange={v => { setBit(v); if (donemSira(donemSecToStr(v)) < donemSira(donemSecToStr(bas))) setBas({...v}) }} />
            {aktifDonemler.length > 0 && (
              <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginTop:8 }}>
                {aktifDonemler.map(d => (
                  <span key={d} style={{ padding:'1px 5px', borderRadius:3, fontSize:8,
                    background:'rgba(59,130,246,.12)', color:'var(--blue)',
                    border:'1px solid rgba(59,130,246,.25)', lineHeight:1.4 }}>
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>

          <PanelGrup title="Kategori" icon="🏷"
            hint={bSnap.kategoriler.length > 1 ? 'KPI eklenemez (birden fazla kat.)' : undefined}>
            {KATEGORILER.map(k => {
              const secili = bSnap.kategoriler.includes(k.key)
              return (
                <DragChip key={k.key} label={k.label} color={k.color} active={secili}
                  onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'kategori', katKey:k.key }) }} />
              )
            })}
          </PanelGrup>

          <PanelGrup title="Segment" icon="🔷">
            {['', ...SEGMENTLER].map(s => {
              const secili = bSnap.segmentler.includes(s)
              return (
                <DragChip key={s||'tr'} label={s||'Tüm TR'} color={SEGMENT_HEX[s]||'#8496b0'} active={secili}
                  onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'segment', seg:s }) }} />
              )
            })}
          </PanelGrup>

          <PanelGrup title="KPI" icon="📊"
            hint={bSnap.kategoriler.length > 1 ? '⛔ Birden fazla kategori seçili' :
              bSnap.kategoriler.length === 1 ? `Filtre: ${KATEGORILER.find(k=>k.key===bSnap.kategoriler[0])?.label}` :
              'Kategori seçince filtreler'}>
            <div style={{ maxHeight:180, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
              {bSnap.kategoriler.length > 1 ? (
                <div style={{ fontSize:9, color:'var(--tx3)', padding:'4px 2px', fontStyle:'italic' }}>
                  Birden fazla kategori seçili — KPI eklenemez
                </div>
              ) : filteredKpis.map(k => (
                <DragChip key={k.i} label={k.ad} color={CAT_COLORS[k.kat]||'#8496b0'}
                  onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'kpi', kpiIdx:k.i, label:k.ad }) }} />
              ))}
            </div>
          </PanelGrup>

          <PanelGrup title="Tip" icon="📈">
            <DragChip label="Değer" color="#3b82f6"
              disabled={!degerAktif}
              hint={!degerAktif ? 'Önce KPI ekle' : undefined}
              onDragStart={() => { if (degerAktif) dragPayload.current = JSON.stringify({ grup:'deger' }) }} />
            <DragChip label="Skor" color="#10b981"
              onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'skor' }) }} />
          </PanelGrup>

          {/* Parametre göstergesi */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, padding:'9px 11px' }}>
            <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>Seçili Parametreler</div>
            {[
              { label:'Segment', value: bSnap.segmentler.length ? bSnap.segmentler.map(s=>s||'Tüm TR').join(', ') : '—', color:'#8496b0' },
              { label:'Kategori', value: bSnap.kategoriler.length ? bSnap.kategoriler.map(k=>KATEGORILER.find(x=>x.key===k)?.label??k).join(', ') : '—', color:'#8496b0' },
              { label:'Tip', value: bSnap.tip==='deger'?'Değer':bSnap.tip==='skor'?'Skor':'—', color: bSnap.tip==='deger'?'#3b82f6':bSnap.tip==='skor'?'#10b981':'var(--tx3)' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:9, color:'var(--tx3)' }}>{r.label}</span>
                <span style={{ fontSize:9, fontWeight:700, color:r.color, maxWidth:140, textAlign:'right', lineHeight:1.3 }}>{r.value}</span>
              </div>
            ))}
            {!degerAktif && (
              <div style={{ fontSize:8, color:'#f59e0b', fontWeight:600, marginTop:5 }}>⚠ Değer için önce KPI sürükle</div>
            )}
            <button onClick={() => { bRef.current={segmentler:[],kategoriler:[],kpiEklendi:false,tip:null}; setBSnap({segmentler:[],kategoriler:[],kpiEklendi:false,tip:null}); setSeriler([]) }}
              style={{ marginTop:8, width:'100%', padding:'3px 0', borderRadius:4, fontSize:9, cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf2)', color:'var(--tx3)' }}>
              Sıfırla
            </button>
          </div>

          {/* Nasıl */}
          <div style={{ background:'var(--surf)', border:'1px dashed var(--bd)', borderRadius:8, padding:'9px 11px', fontSize:8, color:'var(--tx3)', lineHeight:1.9 }}>
            <div style={{ fontWeight:700, color:'var(--tx2)', marginBottom:3, fontSize:9 }}>Nasıl Kullanılır?</div>
            <div>1. <b>Segment(ler)</b> → sürükle</div>
            <div>2. <b>Kategori(ler)</b> → sürükle <em>(opsiyonel)</em></div>
            <div>3a. <b>KPI</b> → sürükle, sonra <b>Değer</b> ekle</div>
            <div>3b. <b>Skor</b> → direkt sürükle</div>
            <div style={{ marginTop:3 }}>Seriyi kaldırmak → <b>×</b> tıkla</div>
          </div>
        </div>

        {/* Grafik alanı */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ background:'var(--surf)', border:`2px ${dragOver?'solid var(--blue)':'dashed var(--bd)'}`,
              borderRadius:12, padding:14, minHeight:320, position:'relative', transition:'border-color .15s' }}>

            {seriler.length === 0 ? (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:8,
                color:dragOver?'var(--blue)':'var(--tx3)' }}>
                <div style={{ fontSize:36 }}>📈</div>
                <div style={{ fontSize:13, fontWeight:600 }}>{dragOver?'Bırak!':'Buraya sürükle & bırak'}</div>
                <div style={{ fontSize:10 }}>Segment → KPI/Skor sürükle</div>
              </div>
            ) : (
              <div style={{ height:320 }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {dragOver && seriler.length > 0 && (
              <div style={{ position:'absolute', inset:0, background:'rgba(59,130,246,.06)',
                border:'2px solid var(--blue)', borderRadius:12, display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:14,
                fontWeight:700, color:'var(--blue)', pointerEvents:'none' }}>
                + Seri Ekle
              </div>
            )}
          </div>

          {/* Seri listesi */}
          {seriler.length > 0 && (
            <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', marginBottom:7 }}>Aktif Seriler ({seriler.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {seriler.map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px',
                    borderRadius:6, background:'var(--surf)', border:`1px solid ${s.color}44` }}>
                    <div style={{ width:9, height:9, borderRadius:2, background:s.color, flexShrink:0 }} />
                    <span style={{ fontSize:10, color:'var(--tx2)', flex:1 }}>{s.label}</span>
                    <span style={{ fontSize:8, padding:'1px 5px', borderRadius:10, fontWeight:600,
                      background:s.tip==='skor'?'rgba(16,185,129,.15)':'rgba(59,130,246,.12)',
                      color:s.tip==='skor'?'#10b981':'#3b82f6' }}>
                      {s.tip==='skor'?'Skor':'Değer'}
                    </span>
                    <button onClick={() => removeSeri(s.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#f87171', fontSize:15, lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setSeriler([])}
                style={{ marginTop:8, padding:'3px 0', borderRadius:6, fontSize:9, fontWeight:600,
                  cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf)', color:'var(--tx3)', width:'100%' }}>
                Tümünü Temizle
              </button>
            </div>
          )}

          {/* Dönem tablosu */}
          {seriler.length > 0 && aktifDonemler.length > 0 && (
            <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, overflow:'hidden' }}>
              <div style={{ overflowX:'auto', maxHeight:220, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                  <thead>
                    <tr style={{ background:'var(--surf2)', position:'sticky', top:0, zIndex:2 }}>
                      <th style={thSt}>Dönem</th>
                      {seriler.map(s => <th key={s.id} style={{ ...thSt, color:s.color }}>{s.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {aktifDonemler.map(d => (
                      <tr key={d} style={{ borderBottom:'1px solid var(--bd)' }}>
                        <td style={{ ...tdSt, fontFamily:'var(--font-dm-mono)', color:'var(--tx2)', fontWeight:600 }}>{d}</td>
                        {seriler.map(s => {
                          const v = getSeriVeri(s,[d],bolge,yas)[0]
                          const fmt = s.kpiIdx !== null ? KPI_META[s.kpiIdx].fmt : 'int'
                          return (
                            <td key={s.id} style={{ ...tdSt, fontFamily:'var(--font-dm-mono)', color:s.color, fontWeight:600 }}>
                              {s.tip==='skor' ? `${Math.round(v)} puan` : fmtKpi(v, fmt)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function TrendPage() {
  const { selBolge, selYas } = useDashboardCtx()
  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle="Kendi trend grafiğini oluştur" />
      <div className={styles.content}>
        <GrafikBuilder idx={0} bolge={selBolge} yas={selYas} />
        <GrafikBuilder idx={1} bolge={selBolge} yas={selYas} />
      </div>
    </div>
  )
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────
function PanelGrup({ title, icon, hint, children }: {
  title:string; icon:string; hint?:string; children:React.ReactNode
}) {
  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, padding:'9px 11px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
        <span style={{ fontSize:12 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)' }}>{title}</span>
        {hint && <span style={{ fontSize:8, color:'var(--tx3)', marginLeft:'auto', textAlign:'right', maxWidth:100, lineHeight:1.3 }}>{hint}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>{children}</div>
    </div>
  )
}

function DragChip({ label, color, active, disabled, hint, onDragStart }: {
  label:string; color:string; active?:boolean; disabled?:boolean; hint?:string; onDragStart:()=>void
}) {
  return (
    <div draggable={!disabled}
      onDragStart={e => { if (disabled) { e.preventDefault(); return }; e.dataTransfer.effectAllowed='copy'; onDragStart() }}
      title={hint}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:6,
        cursor:disabled?'not-allowed':'grab',
        background: active ? color+'30' : disabled ? 'var(--surf2)' : color+'15',
        border:`1px solid ${active ? color+'88' : disabled ? 'var(--bd)' : color+'44'}`,
        opacity: disabled ? .45 : 1,
        userSelect:'none' }}>
      <div style={{ width:7, height:7, borderRadius:2, background:disabled?'var(--tx3)':color, flexShrink:0 }} />
      <span style={{ fontSize:10, color: disabled?'var(--tx3)':'var(--tx2)', fontWeight:500, lineHeight:1.3, flex:1 }}>{label}</span>
      {active && <span style={{ fontSize:8, color, fontWeight:700 }}>✓</span>}
      {!active && !disabled && <span style={{ fontSize:9, color, opacity:.5 }}>⠿</span>}
    </div>
  )
}

// ── Stiller ───────────────────────────────────────────────────────────────────
const selSt: React.CSSProperties = { padding:'3px 7px', borderRadius:6, fontSize:10, fontWeight:600, background:'var(--surf)', border:'1px solid var(--bd)', color:'var(--tx2)', cursor:'pointer' }
const thSt: React.CSSProperties  = { padding:'6px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
const tdSt: React.CSSProperties  = { padding:'5px 10px', borderBottom:'1px solid var(--bd)' }
