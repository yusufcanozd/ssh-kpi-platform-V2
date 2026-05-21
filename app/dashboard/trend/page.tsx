'use client'

import { useMemo, useRef, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, CAT_COLORS,
  fmtKpi, getKpisFromCube, getScore, getKpiScores, DONEMLER,
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
      if (s.kpiIdx !== null) {
        const scores = getKpiScores(s.segment, bolge, yas, d)
        return scores[s.kpiIdx] ?? 0
      }
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

// ── Dönem seçici ──────────────────────────────────────────────────────────────
type DonemPeriyot = 'ay' | 'Q' | 'FY'
interface DonemSec { yil: number; periyot: DonemPeriyot; alt: string }

function donemSecToStr(s: DonemSec): string {
  if (s.periyot === 'FY') return `${s.yil}-FY`
  if (s.periyot === 'Q')  return `${s.yil}-Q${s.alt}`
  return `${s.yil}-${s.alt.padStart(2,'0')}`
}
function getAltlar(p: DonemPeriyot): string[] {
  if (p === 'FY') return ['FY']
  if (p === 'Q')  return ['1','2','3','4']
  return ['01','02','03','04','05','06','07','08','09','10','11','12']
}
function filtreDonemler(bas: DonemSec, bit: DonemSec): string[] {
  const basS = donemSira(donemSecToStr(bas)), bitS = donemSira(donemSecToStr(bit))
  const liste = bas.periyot === 'ay' ? AYLIK_DONEMLER : bas.periyot === 'Q' ? Q_DONEMLER : FY_DONEMLER
  return liste.filter(d => donemSira(d) >= Math.min(basS,bitS) && donemSira(d) <= Math.max(basS,bitS))
}

function DonemSecici({ value, onChange }: { value: DonemSec; onChange: (v: DonemSec) => void }) {
  const altlar = getAltlar(value.periyot)
  const altSec = altlar.includes(value.alt) ? value.alt : altlar[0]
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
      <select value={value.yil} onChange={e => onChange({ ...value, yil: parseInt(e.target.value) })} style={selSt}>
        {TUM_YILLAR.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <div style={{ display:'flex', gap:2 }}>
        {(['ay','Q','FY'] as DonemPeriyot[]).map(p => {
          const dis = p==='ay'?AYLIK_DONEMLER.length===0:p==='Q'?Q_DONEMLER.length===0:FY_DONEMLER.length===0
          return (
            <button key={p} disabled={dis} onClick={() => onChange({ ...value, periyot:p, alt:p==='FY'?'FY':p==='Q'?'1':'01' })}
              style={{ padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:600, cursor:dis?'not-allowed':'pointer',
                border:`1px solid ${value.periyot===p?'var(--blue)':'var(--bd)'}`,
                background:value.periyot===p?'rgba(59,130,246,.12)':'var(--surf)',
                color:dis?'var(--tx3)':value.periyot===p?'var(--blue)':'var(--tx2)', opacity:dis?.5:1 }}>
              {p==='ay'?'Aylık':p==='Q'?'Çeyreklik':'Yıllık'}
            </button>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
        {altlar.map(a => (
          <button key={a} onClick={() => onChange({ ...value, alt:a })}
            style={{ padding:'2px 6px', borderRadius:3, fontSize:9, cursor:'pointer',
              border:`1px solid ${altSec===a?'var(--blue)':'var(--bd)'}`,
              background:altSec===a?'rgba(59,130,246,.15)':'var(--surf3)',
              color:altSec===a?'var(--blue)':'var(--tx3)', fontWeight:altSec===a?700:400 }}>
            {value.periyot==='Q'?`Q${a}`:value.periyot==='FY'?'FY':a}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Builder state ─────────────────────────────────────────────────────────────
interface BuilderState {
  segmentler: string[]
  kategoriler: string[]
  pendingKpis: { kpiIdx: number; label: string }[]
  tip: SeriTip | null
}
const emptyB = (): BuilderState => ({ segmentler:[], kategoriler:[], pendingKpis:[], tip:null })

// ── Tek grafik paneli (sağ taraf) ─────────────────────────────────────────────
interface GrafikPaneliProps {
  idx: number
  bolge: string
  yas: string
  bRef: React.MutableRefObject<BuilderState>
  dragPayload: React.MutableRefObject<string>
  seriler: Seri[]
  setSeriler: React.Dispatch<React.SetStateAction<Seri[]>>
  aktifDonemler: string[]
  locked: boolean
  onLockToggle: () => void
}

function GrafikPaneli({ idx, bolge, yas, bRef, dragPayload, seriler, setSeriler, aktifDonemler, locked, onLockToggle }: GrafikPaneliProps) {
  const [dragOver, setDragOver] = useState(false)

  const hasDeger = seriler.some(s => s.tip === 'deger')
  const hasSkor  = seriler.some(s => s.tip === 'skor')
  const dualAxis = hasDeger && hasSkor

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (locked) return
    let payload: any
    try { payload = JSON.parse(dragPayload.current) } catch { return }
    const b = bRef.current  // her zaman güncel
    const segs = b.segmentler.length ? b.segmentler : ['']

    if (payload.grup === 'deger') {
      if (!b.pendingKpis.length) return
      const yeni: Seri[] = []
      segs.forEach(seg => {
        b.pendingKpis.forEach(kpi => {
          // Aynı segment + kpiIdx + tip zaten varsa ekleme
          const zatenVar = seriler.some(s => s.tip==='deger' && s.segment===seg && s.kpiIdx===kpi.kpiIdx)
          if (zatenVar) return
          const color = SERI_RENKLER[(seriler.length + yeni.length) % SERI_RENKLER.length]
          yeni.push({ id:makeSeriId(), label:`${seg||'Tüm TR'} · ${kpi.label} (Değer)`, color, tip:'deger', segment:seg, kpiIdx:kpi.kpiIdx, katKey:null })
        })
      })
      if (yeni.length) setSeriler(prev => [...prev, ...yeni])
      return
    }

    if (payload.grup === 'skor') {
      const yeni: Seri[] = []
      if (b.pendingKpis.length > 0) {
        segs.forEach(seg => {
          b.pendingKpis.forEach(kpi => {
            const zatenVar = seriler.some(s => s.tip==='skor' && s.segment===seg && s.kpiIdx===kpi.kpiIdx)
            if (zatenVar) return
            const color = SERI_RENKLER[(seriler.length + yeni.length) % SERI_RENKLER.length]
            yeni.push({ id:makeSeriId(), label:`${seg||'Tüm TR'} · ${kpi.label} (Skor)`, color, tip:'skor', segment:seg, kpiIdx:kpi.kpiIdx, katKey:null })
          })
        })
      } else if (b.kategoriler.length > 0) {
        segs.forEach(seg => {
          b.kategoriler.forEach(katKey => {
            const zatenVar = seriler.some(s => s.tip==='skor' && s.segment===seg && s.katKey===katKey && s.kpiIdx===null)
            if (zatenVar) return
            const katLabel = KATEGORILER.find(k=>k.key===katKey)?.label ?? 'Genel'
            const color = SERI_RENKLER[(seriler.length + yeni.length) % SERI_RENKLER.length]
            yeni.push({ id:makeSeriId(), label:`${seg||'Tüm TR'} · ${katLabel} Skoru`, color, tip:'skor', segment:seg, kpiIdx:null, katKey })
          })
        })
      } else {
        segs.forEach(seg => {
          const zatenVar = seriler.some(s => s.tip==='skor' && s.segment===seg && s.kpiIdx===null && s.katKey===null)
          if (zatenVar) return
          const color = SERI_RENKLER[(seriler.length + yeni.length) % SERI_RENKLER.length]
          yeni.push({ id:makeSeriId(), label:`${seg||'Tüm TR'} · Genel Skor`, color, tip:'skor', segment:seg, kpiIdx:null, katKey:null })
        })
      }
      if (yeni.length) setSeriler(prev => [...prev, ...yeni])
      return
    }
  }

  const chartData = useMemo(() => ({
    labels: aktifDonemler,
    datasets: seriler.map(s => {
      const veri = getSeriVeri(s, aktifDonemler, bolge, yas)
      const fmt = s.kpiIdx !== null ? KPI_META[s.kpiIdx].fmt : 'int'
      return {
        label: s.label, data: veri, borderColor: s.color, backgroundColor: s.color+'18',
        borderWidth:2.5, pointRadius:5, pointHoverRadius:7,
        pointBackgroundColor:s.color, pointBorderColor:'#fff', pointBorderWidth:1.5,
        fill:false, tension:0.3,
        yAxisID: dualAxis && s.tip==='skor' ? 'y1' : 'y',
        _fmt: (v: number) => s.tip==='skor' ? `${Math.round(v)}` : fmtKpi(v, fmt),
      }
    }),
  }), [seriler, aktifDonemler, bolge, yas, dualAxis])

  const chartOptions = useMemo(() => {
    const dV = seriler.filter(s=>s.tip==='deger').flatMap(s=>getSeriVeri(s,aktifDonemler,bolge,yas)).filter(v=>v>0)
    const sV = seriler.filter(s=>s.tip==='skor').flatMap(s=>getSeriVeri(s,aktifDonemler,bolge,yas)).filter(v=>v>0)
    function bounds(vals: number[]) {
      if (!vals.length) return { min:0, max:100 }
      const mn=Math.min(...vals), mx=Math.max(...vals), pad=(mx-mn)*.35||mx*.2||10
      return { min:Math.max(0,mn-pad), max:mx+pad }
    }
    const dB=bounds(dV), sB=bounds(sV)
    return {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index' as const, intersect:false },
      plugins:{
        legend:{ display:true, position:'top' as const, labels:{ color:'#8496b0', font:{size:9}, boxWidth:12, padding:10 } },
        tooltip:{ callbacks:{ label:(ctx:any) => {
          const s=seriler[ctx.datasetIndex]; if(!s) return ''
          const v=ctx.parsed.y
          if(s.tip==='skor') return `${s.label}: ${Math.round(v)} puan`
          if(s.kpiIdx!==null) return `${s.label}: ${fmtKpi(v,KPI_META[s.kpiIdx].fmt)}`
          return `${s.label}: ${v}`
        }}},
      },
      scales:{
        y:{ type:'linear' as const, position:'left' as const, min:dB.min, max:dB.max,
          grid:{color:'rgba(255,255,255,.05)'}, ticks:{color:'#8496b0',font:{size:9}},
          title:dualAxis?{display:true,text:'Değer',color:'#8496b0',font:{size:8}}:undefined },
        ...(dualAxis?{ y1:{ type:'linear' as const, position:'right' as const, min:sB.min, max:sB.max,
          grid:{drawOnChartArea:false}, ticks:{color:'#10b981',font:{size:9}},
          title:{display:true,text:'Skor',color:'#10b981',font:{size:8}} } }:{}),
        x:{ grid:{display:false}, ticks:{color:'#8496b0',font:{size:9},maxRotation:45,autoSkip:false} },
      },
    }
  }, [chartData, seriler, aktifDonemler, bolge, yas, dualAxis])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* Başlık + kilit butonu */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--tx2)' }}>Grafik {idx+1}</span>
        <button onClick={onLockToggle}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20,
            fontSize:9, fontWeight:600, cursor:'pointer',
            border:`1px solid ${locked ? 'var(--bd)' : 'var(--blue)'}`,
            background: locked ? 'var(--surf2)' : 'rgba(59,130,246,.1)',
            color: locked ? 'var(--tx3)' : 'var(--blue)' }}>
          {locked ? '🔒 Kilitli — düzenlemek için tıkla' : '🔓 Aktif — sürükle & bırak'}
        </button>
        {seriler.length > 0 && (
          <button onClick={() => setSeriler([])}
            style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:12, fontSize:8,
              cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf2)', color:'var(--tx3)' }}>
            Temizle
          </button>
        )}
      </div>

      {/* Drop zone — her zaman görünür, sadece aktif değilse sürükleme kabul etmez */}
      <div onDragOver={e=>{e.preventDefault(); if(!locked) setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
        style={{ background:'var(--surf)',
          border:`2px ${locked ? 'solid transparent' : dragOver ? 'solid var(--blue)' : 'dashed var(--bd)'}`,
          borderRadius:10, padding:12, minHeight:280, position:'relative', transition:'border-color .15s' }}>

        {seriler.length===0 ? (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:8,
            color: locked ? 'var(--tx3)' : dragOver ? 'var(--blue)' : 'var(--tx3)' }}>
            <div style={{ fontSize:34 }}>{locked ? '🔒' : '📈'}</div>
            <div style={{ fontSize:12, fontWeight:600 }}>
              {locked ? 'Kilidi aç → sürükle & bırak' : dragOver ? 'Bırak!' : 'Buraya sürükle & bırak'}
            </div>
            {!locked && <div style={{ fontSize:10 }}>Değer veya Skor grubunu sürükle</div>}
          </div>
        ) : (
          <div style={{ height:280 }}>
            <Line data={chartData} options={chartOptions as any} />
          </div>
        )}

        {/* Kilitli overlay — sadece seri yokken tam, seri varsa ince şerit */}
        {locked && seriler.length > 0 && (
          <div style={{ position:'absolute', top:0, left:0, right:0,
            background:'rgba(0,0,0,.0)', pointerEvents:'none' }} />
        )}

        {dragOver && !locked && seriler.length>0 && (
          <div style={{ position:'absolute', inset:0, background:'rgba(59,130,246,.06)',
            border:'2px solid var(--blue)', borderRadius:10, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--blue)', pointerEvents:'none' }}>
            + Seri Ekle
          </div>
        )}
      </div>

      {/* Seri listesi */}
      {seriler.length>0 && (
        <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:8, padding:'8px 10px' }}>
          <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', marginBottom:6 }}>Aktif Seriler ({seriler.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {seriler.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 7px',
                borderRadius:5, background:'var(--surf)', border:`1px solid ${s.color}44` }}>
                <div style={{ width:8,height:8,borderRadius:2,background:s.color,flexShrink:0 }}/>
                <span style={{ fontSize:9,color:'var(--tx2)',flex:1 }}>{s.label}</span>
                <span style={{ fontSize:7,padding:'1px 4px',borderRadius:8,fontWeight:600,
                  background:s.tip==='skor'?'rgba(16,185,129,.15)':'rgba(59,130,246,.12)',
                  color:s.tip==='skor'?'#10b981':'#3b82f6' }}>{s.tip==='skor'?'Skor':'Değer'}</span>
                <button onClick={()=>setSeriler(prev=>prev.filter(x=>x.id!==s.id))}
                  style={{ background:'none',border:'none',cursor:'pointer',color:'#f87171',fontSize:14,lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function TrendPage() {
  const { selBolge, selYas } = useDashboardCtx()
  const ilkYil = TUM_YILLAR[0] ?? 2024
  const sonYil = TUM_YILLAR[TUM_YILLAR.length-1] ?? 2024

  // Ortak dönem
  const [bas, setBas] = useState<DonemSec>({ yil:ilkYil, periyot:'Q', alt:'1' })
  const [bit, setBit] = useState<DonemSec>({ yil:sonYil, periyot:'Q', alt:'4' })
  const aktifDonemler = useMemo(() => filtreDonemler(bas,bit), [bas,bit])

  // Ortak builder state
  const bRef = useRef<BuilderState>(emptyB())
  const [bSnap, setBSnap] = useState<BuilderState>(emptyB())
  const dragPayload = useRef('')

  function updateB(patch: Partial<BuilderState>) {
    bRef.current = { ...bRef.current, ...patch }
    setBSnap({ ...bRef.current })
  }

  // Manuel kilit — sadece kilidi açık grafik seri alır. Başlangıçta grafik1 açık.
  const [aktifGrafik, setAktifGrafik] = useState<1|2>(1)

  // Bağımsız seri listeleri
  const [seriler1, setSeriler1] = useState<Seri[]>([])
  const [seriler2, setSeriler2] = useState<Seri[]>([])

  const filteredKpis = useMemo(() => {
    if (bSnap.kategoriler.length===1) {
      const katLabel = KATEGORILER.find(k=>k.key===bSnap.kategoriler[0])?.label
      return KPI_META.map((k,i)=>({...k,i})).filter(k=>k.kat===katLabel)
    }
    if (bSnap.kategoriler.length===0) return KPI_META.map((k,i)=>({...k,i}))
    return []
  }, [bSnap.kategoriler])

  const degerAktif = bSnap.pendingKpis.length > 0

  function handlePanelDragStart(item: object) {
    dragPayload.current = JSON.stringify(item)
  }

  // Sol panel drag — segment/kategori/kpi toggle
  function handleLeftDrop(e: React.DragEvent) {
    // Sol panel sürüklemeleri buraya değil, drop zone'lar halleder
    // Bu fonksiyon sadece segment/kategori/kpi için kullanılır
  }

  function onChipDrag(item: object) {
    dragPayload.current = JSON.stringify(item)
  }

  // Segment/kategori/kpi chip sürüklendiğinde builderState güncelle (dragend'de değil, drop'ta)
  // Bunları doğrudan chip onClick ile toggle yapalım — daha sezgisel
  function toggleSegment(seg: string) {
    const yeni = bRef.current.segmentler.includes(seg)
      ? bRef.current.segmentler.filter(s=>s!==seg)
      : [...bRef.current.segmentler, seg]
    updateB({ segmentler: yeni })
  }
  function toggleKategori(katKey: string) {
    const yeni = bRef.current.kategoriler.includes(katKey)
      ? bRef.current.kategoriler.filter(k=>k!==katKey)
      : [...bRef.current.kategoriler, katKey]
    updateB({ kategoriler: yeni, pendingKpis: [] })
  }
  function toggleKpi(kpiIdx: number, label: string) {
    const mevcut = bRef.current.pendingKpis
    const yeni = mevcut.some(p=>p.kpiIdx===kpiIdx)
      ? mevcut.filter(p=>p.kpiIdx!==kpiIdx)
      : [...mevcut, { kpiIdx, label }]
    updateB({ pendingKpis: yeni })
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle="Kendi trend grafiğini oluştur" />
      <div className={styles.content}>

        {/* ── Dönem filtresi — ortak, tam genişlik ── */}
        <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:10,
          padding:'12px 16px', marginBottom:14 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase',
            letterSpacing:'.06em', marginBottom:10 }}>Dönem Aralığı</div>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>
            <DonemSecici value={bas} onChange={v => {
              setBas(v)
              // Bitiş de aynı periyot+alt'a default gelsin, yıl olarak son yılı koy
              const altlarBit = getAltlar(v.periyot)
              setBit({ yil: sonYil, periyot: v.periyot, alt: altlarBit[altlarBit.length - 1] ?? v.alt })
            }} />
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:4 }}>
              <span style={{ color:'var(--tx3)', fontSize:18 }}>→</span>
              <span style={{ fontSize:9, color:'var(--tx3)', whiteSpace:'nowrap' }}>{aktifDonemler.length} dönem</span>
            </div>
            <DonemSecici value={bit} onChange={v => { setBit(v); if (donemSira(donemSecToStr(v))<donemSira(donemSecToStr(bas))) setBas({...v}) }} />
          </div>
        </div>

        {/* ── Sol panel + Sağda 2 grafik ── */}
        <div style={{ display:'grid', gridTemplateColumns:'190px 1fr', gap:14, alignItems:'start' }}>

          {/* Sol panel — ortak, sticky */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, position:'sticky', top:16 }}>

            <PanelGrup title="Kategori" icon="🏷"
              hint={bSnap.kategoriler.length>1?'KPI eklenemez':undefined}>
              {KATEGORILER.map(k => (
                <SelectChip key={k.key} label={k.label} color={k.color}
                  active={bSnap.kategoriler.includes(k.key)}
                  draggable onDrag={() => onChipDrag({ grup:'kategori', katKey:k.key })}
                  onClick={() => toggleKategori(k.key)} />
              ))}
            </PanelGrup>

            <PanelGrup title="Segment" icon="🔷">
              {['', ...SEGMENTLER].map(s => (
                <SelectChip key={s||'tr'} label={s||'Tüm TR'} color={SEGMENT_HEX[s]||'#8496b0'}
                  active={bSnap.segmentler.includes(s)}
                  draggable onDrag={() => onChipDrag({ grup:'segment', seg:s })}
                  onClick={() => toggleSegment(s)} />
              ))}
            </PanelGrup>

            <PanelGrup title="KPI" icon="📊"
              hint={bSnap.kategoriler.length>1?'⛔':bSnap.kategoriler.length===1?KATEGORILER.find(k=>k.key===bSnap.kategoriler[0])?.label:'Tümü'}>
              <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
                {bSnap.kategoriler.length>1 ? (
                  <div style={{ fontSize:8, color:'var(--tx3)', fontStyle:'italic', padding:'2px 0' }}>Birden fazla kategori — KPI eklenemez</div>
                ) : filteredKpis.map(k => (
                  <SelectChip key={k.i} label={k.ad} color={CAT_COLORS[k.kat]||'#8496b0'}
                    active={bSnap.pendingKpis.some(p=>p.kpiIdx===k.i)}
                    draggable={false}
                    onClick={() => toggleKpi(k.i, k.ad)} />
                ))}
              </div>
            </PanelGrup>

            <PanelGrup title="Tip" icon="📈"
              hint={!degerAktif?'Değer için KPI seç':undefined}>
              <DragOnlyChip label="Değer" color="#3b82f6"
                disabled={!degerAktif}
                onDragStart={() => { if(degerAktif) dragPayload.current=JSON.stringify({grup:'deger'}) }} />
              <DragOnlyChip label="Skor" color="#10b981"
                onDragStart={() => { dragPayload.current=JSON.stringify({grup:'skor'}) }} />
            </PanelGrup>

            {/* Parametre durumu */}
            <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Durum</div>
              {[
                { label:'Seg.', value:bSnap.segmentler.length?bSnap.segmentler.map(s=>s||'TR').join(', '):'—' },
                { label:'Kat.', value:bSnap.kategoriler.length?bSnap.kategoriler.map(k=>KATEGORILER.find(x=>x.key===k)?.label??k).join(', '):'—' },
                { label:'KPI', value:bSnap.pendingKpis.length?`${bSnap.pendingKpis.length} seçili`:'—' },
              ].map(r=>(
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:8, color:'var(--tx3)' }}>{r.label}</span>
                  <span style={{ fontSize:8, fontWeight:700, color:'var(--tx2)', maxWidth:110, textAlign:'right' }}>{r.value}</span>
                </div>
              ))}
              <button onClick={()=>{ bRef.current=emptyB(); setBSnap(emptyB()); setSeriler1([]); setSeriler2([]) }}
                style={{ marginTop:7, width:'100%', padding:'3px 0', borderRadius:4, fontSize:8, cursor:'pointer',
                  border:'1px solid var(--bd)', background:'var(--surf2)', color:'var(--tx3)' }}>
                Tümünü Sıfırla
              </button>
            </div>

            <div style={{ background:'var(--surf)', border:'1px dashed var(--bd)', borderRadius:8, padding:'8px 10px', fontSize:8, color:'var(--tx3)', lineHeight:1.9 }}>
              <div style={{ fontWeight:700, color:'var(--tx2)', marginBottom:2, fontSize:9 }}>Nasıl?</div>
              <div>1. <b>Segment</b> → tıkla seç</div>
              <div>2. <b>Kategori</b> → tıkla seç</div>
              <div>3. <b>KPI</b> → tıkla seç</div>
              <div>4. <b>Değer/Skor</b> → grafiğe sürükle</div>
              <div style={{marginTop:2}}>Her grafik bağımsız çalışır</div>
            </div>
          </div>

          {/* Sağ — 2 grafik alt alta */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <GrafikPaneli idx={0} bolge={selBolge} yas={selYas}
              bRef={bRef} dragPayload={dragPayload}
              seriler={seriler1} setSeriler={setSeriler1}
              aktifDonemler={aktifDonemler}
              locked={aktifGrafik !== 1}
              onLockToggle={() => setAktifGrafik(1)} />
            <div style={{ borderTop:'1px solid var(--bd)', paddingTop:16 }}>
              <GrafikPaneli idx={1} bolge={selBolge} yas={selYas}
                bRef={bRef} dragPayload={dragPayload}
                seriler={seriler2} setSeriler={setSeriler2}
                aktifDonemler={aktifDonemler}
                locked={aktifGrafik !== 2}
                onLockToggle={() => setAktifGrafik(seriler1.length > 0 ? 2 : 1)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────
function PanelGrup({ title, icon, hint, children }: {
  title:string; icon:string; hint?:string; children:React.ReactNode
}) {
  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, padding:'8px 10px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
        <span style={{ fontSize:11 }}>{icon}</span>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--tx2)' }}>{title}</span>
        {hint && <span style={{ fontSize:7, color:'var(--tx3)', marginLeft:'auto', textAlign:'right' }}>{hint}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>{children}</div>
    </div>
  )
}

// Tıklanabilir + opsiyonel sürüklenebilir chip
function SelectChip({ label, color, active, draggable, onClick, onDrag }: {
  label:string; color:string; active:boolean; draggable:boolean; onClick:()=>void; onDrag?:()=>void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={e => { if(draggable && onDrag) { e.dataTransfer.effectAllowed='copy'; onDrag() } }}
      onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', borderRadius:5,
        cursor:'pointer', userSelect:'none',
        background: active ? color+'30' : color+'12',
        border:`1px solid ${active ? color+'88' : color+'33'}` }}>
      <div style={{ width:7,height:7,borderRadius:2,background:color,flexShrink:0 }}/>
      <span style={{ fontSize:9, color:'var(--tx2)', fontWeight:500, flex:1, lineHeight:1.3 }}>{label}</span>
      {active && <span style={{ fontSize:8, color, fontWeight:700 }}>✓</span>}
    </div>
  )
}

// Sadece sürüklenebilir chip (Değer/Skor için)
function DragOnlyChip({ label, color, disabled, onDragStart }: {
  label:string; color:string; disabled?:boolean; onDragStart:()=>void
}) {
  return (
    <div draggable={!disabled}
      onDragStart={e => { if(disabled){e.preventDefault();return}; e.dataTransfer.effectAllowed='copy'; onDragStart() }}
      style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', borderRadius:5,
        cursor:disabled?'not-allowed':'grab', userSelect:'none',
        background:disabled?'var(--surf2)':color+'15',
        border:`1px solid ${disabled?'var(--bd)':color+'44'}`,
        opacity:disabled?.4:1 }}>
      <div style={{ width:7,height:7,borderRadius:2,background:disabled?'var(--tx3)':color,flexShrink:0 }}/>
      <span style={{ fontSize:9, color:disabled?'var(--tx3)':'var(--tx2)', fontWeight:500, flex:1 }}>{label}</span>
      {!disabled && <span style={{ fontSize:8, color, opacity:.6 }}>⠿ sürükle</span>}
    </div>
  )
}

const selSt: React.CSSProperties = { padding:'3px 7px', borderRadius:5, fontSize:9, fontWeight:600, background:'var(--surf)', border:'1px solid var(--bd)', color:'var(--tx2)', cursor:'pointer' }
