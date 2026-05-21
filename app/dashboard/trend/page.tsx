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

type SeriTip = 'deger' | 'puan'

interface Seri {
  id: string
  label: string
  color: string
  tip: SeriTip
  segment: string
  kpiIdx: number | null
  katKey: string | null
}

function makeSeriId() { return Math.random().toString(36).slice(2, 8) }

function getSeriVeri(s: Seri, donemler: string[], bolge: string, yas: string): number[] {
  return donemler.map(d => {
    if (s.tip === 'puan') {
      const sc = getScore(s.segment, bolge, yas, d)
      if (!sc) return 0
      if (s.katKey) return (sc as any)[s.katKey] ?? sc.genel
      return sc.genel
    }
    if (s.kpiIdx === null) return 0
    return getKpisFromCube(s.segment, bolge, yas, d)[s.kpiIdx] ?? 0
  })
}

// ── Nokta üstü label plugin ───────────────────────────────────────────────────
const pointLabelPlugin = {
  id: 'pointLabel',
  afterDatasetsDraw(chart: any) {
    const ctx = chart.ctx
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      meta.data.forEach((pt: any, pi: number) => {
        const raw = ds.data[pi]
        if (raw == null || raw === 0) return
        const label = ds._labelFmt ? ds._labelFmt(raw) : String(raw)
        ctx.save()
        ctx.fillStyle = ds.borderColor
        ctx.font = '700 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, pt.x, pt.y - 6)
        ctx.restore()
      })
    })
  }
}
ChartJS.register(pointLabelPlugin)

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export default function TrendPage() {
  const { selBolge, selYas } = useDashboardCtx()

  // Filtre
  type Periyot = 'aylik' | 'ceyreklik' | 'yillik'
  const [periyot, setPeriyot] = useState<Periyot>('ceyreklik')

  const tumDonemler = periyot === 'aylik' ? AYLIK_DONEMLER
    : periyot === 'ceyreklik' ? Q_DONEMLER : FY_DONEMLER

  const [aralikBas, setAralikBas] = useState(() => tumDonemler[0] ?? '')
  const [aralikBit, setAralikBit] = useState(() => tumDonemler[tumDonemler.length - 1] ?? '')

  function handlePeriyot(p: Periyot) {
    const liste = p === 'aylik' ? AYLIK_DONEMLER : p === 'ceyreklik' ? Q_DONEMLER : FY_DONEMLER
    setPeriyot(p)
    setAralikBas(liste[0] ?? '')
    setAralikBit(liste[liste.length - 1] ?? '')
  }

  const aktifDonemler = useMemo(() => {
    const bas = tumDonemler.indexOf(aralikBas)
    const bit = tumDonemler.indexOf(aralikBit)
    if (bas < 0 || bit < 0) return tumDonemler
    return tumDonemler.slice(Math.min(bas,bit), Math.max(bas,bit) + 1)
  }, [tumDonemler, aralikBas, aralikBit])

  // Builder state — useRef ile stale closure sorunu yok
  const [seriler, setSeriler] = useState<Seri[]>([])
  const [dragOver, setDragOver] = useState(false)
  const builderRef = useRef({ segment: '' as string, katKey: null as string|null, tip: null as SeriTip|null })
  const [builderSnap, setBuilderSnap] = useState({ segment: '' as string, katKey: null as string|null, tip: null as SeriTip|null })
  const dragPayload = useRef<string>('')

  function updateBuilder(patch: Partial<typeof builderRef.current>) {
    builderRef.current = { ...builderRef.current, ...patch }
    setBuilderSnap({ ...builderRef.current })
  }

  // KPI listesi — katKey filtreli
  const filteredKpis = useMemo(() => {
    if (!builderSnap.katKey) return KPI_META.map((k,i) => ({ ...k, i }))
    const katLabel = KATEGORILER.find(k => k.key === builderSnap.katKey)?.label
    return KPI_META.map((k,i) => ({ ...k, i })).filter(k => k.kat === katLabel)
  }, [builderSnap.katKey])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    let payload: any
    try { payload = JSON.parse(dragPayload.current) } catch { return }
    const b = builderRef.current

    if (payload.grup === 'segment') {
      updateBuilder({ segment: payload.seg })
      return
    }
    if (payload.grup === 'kategori') {
      updateBuilder({ katKey: payload.katKey })
      return
    }
    if (payload.grup === 'puan') {
      updateBuilder({ tip: 'puan' })
      // Puan sürüklenince direkt seri oluştur
      const seg = b.segment
      const color = SERI_RENKLER[seriler.length % SERI_RENKLER.length]
      const segLabel = seg || 'Tüm TR'
      const katLabel = b.katKey ? (KATEGORILER.find(k=>k.key===b.katKey)?.label ?? 'Genel') : 'Genel'
      const yeni: Seri = {
        id: makeSeriId(), label: `${segLabel} · ${katLabel} Puanı`,
        color, tip: 'puan', segment: seg, kpiIdx: null, katKey: b.katKey,
      }
      setSeriler(prev => [...prev, yeni])
      return
    }
    if (payload.grup === 'deger') {
      updateBuilder({ tip: 'deger' })
      return
    }
    if (payload.grup === 'kpi') {
      // KPI için tip zorunlu
      const tip = b.tip
      if (!tip) {
        alert('Önce "Değer" veya "Puan" grubunu grafiğe sürükleyin!')
        return
      }
      if (tip !== 'deger') {
        alert('KPI yalnızca "Değer" tipiyle kullanılır. "Puan" için KPI yerine Puan grubunu sürükleyin.')
        return
      }
      const seg = b.segment
      const color = SERI_RENKLER[seriler.length % SERI_RENKLER.length]
      const segLabel = seg || 'Tüm TR'
      const yeni: Seri = {
        id: makeSeriId(), label: `${segLabel} · ${payload.label}`,
        color, tip: 'deger', segment: seg, kpiIdx: payload.kpiIdx, katKey: null,
      }
      setSeriler(prev => [...prev, yeni])
      return
    }
  }

  function removeSeri(id: string) {
    setSeriler(prev => prev.filter(s => s.id !== id))
  }

  // Chart verisi
  const chartData = useMemo(() => {
    return {
      labels: aktifDonemler,
      datasets: seriler.map(s => {
        const veri = getSeriVeri(s, aktifDonemler, selBolge, selYas)
        const fmt = s.kpiIdx !== null ? KPI_META[s.kpiIdx].fmt : 'int'
        return {
          label: s.label,
          data: veri,
          borderColor: s.color,
          backgroundColor: s.color + '20',
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: s.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          fill: false,
          tension: 0.3,
          // custom prop for label plugin
          _labelFmt: (v: number) => s.tip === 'puan' ? `${Math.round(v)}` : fmtKpi(v, fmt),
        }
      }),
    }
  }, [seriler, aktifDonemler, selBolge, selYas])

  // Y eksen min/max — %25 padding
  const chartOptions = useMemo(() => {
    const allVals = chartData.datasets.flatMap(ds => ds.data as number[]).filter(v => v > 0)
    const minV = allVals.length ? Math.min(...allVals) : 0
    const maxV = allVals.length ? Math.max(...allVals) : 100
    const pad  = (maxV - minV) * 0.35 || maxV * 0.2 || 10
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: true, position: 'top' as const, labels: { color: '#8496b0', font: { size: 9 }, boxWidth: 12, padding: 10 } },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const s = seriler[ctx.datasetIndex]
              if (!s) return ''
              const v = ctx.parsed.y
              if (s.tip === 'puan') return `${s.label}: ${Math.round(v)} puan`
              if (s.kpiIdx !== null) return `${s.label}: ${fmtKpi(v, KPI_META[s.kpiIdx].fmt)}`
              return `${s.label}: ${v}`
            },
          },
        },
      },
      scales: {
        y: {
          min: Math.max(0, minV - pad),
          max: maxV + pad,
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: { color: '#8496b0', font: { size: 9 } },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8496b0', font: { size: 9 }, maxRotation: 45, autoSkip: false },
        },
      },
    }
  }, [chartData, seriler])

  const periyotler = [
    { key: 'aylik' as Periyot,     label: 'Aylık',     disabled: AYLIK_DONEMLER.length === 0 },
    { key: 'ceyreklik' as Periyot, label: 'Çeyreklik', disabled: Q_DONEMLER.length === 0 },
    { key: 'yillik' as Periyot,    label: 'Yıllık',    disabled: FY_DONEMLER.length === 0 },
  ]

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle="Kendi trend grafiğini oluştur" />
      <div className={styles.content}>

        {/* ── Filtre ── */}
        <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>

            <div>
              <div style={labelSt}>Periyot</div>
              <div style={{ display:'flex', gap:6 }}>
                {periyotler.map(p => (
                  <button key={p.key} onClick={() => !p.disabled && handlePeriyot(p.key)} disabled={p.disabled}
                    style={{ padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:600, cursor:p.disabled?'not-allowed':'pointer',
                      border:`1px solid ${periyot===p.key?'var(--blue)':'var(--bd)'}`,
                      background:periyot===p.key?'rgba(59,130,246,.12)':'var(--surf)',
                      color:p.disabled?'var(--tx3)':periyot===p.key?'var(--blue)':'var(--tx2)',
                      opacity:p.disabled?.5:1 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex:1, minWidth:240 }}>
              <div style={labelSt}>Dönem Aralığı</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <select value={aralikBas} onChange={e=>setAralikBas(e.target.value)} style={selSt}>
                  {tumDonemler.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ color:'var(--tx3)', fontSize:12 }}>→</span>
                <select value={aralikBit} onChange={e=>setAralikBit(e.target.value)} style={selSt}>
                  {tumDonemler.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ fontSize:10, color:'var(--tx3)' }}>{aktifDonemler.length} dönem</span>
              </div>
              <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:8 }}>
                {tumDonemler.map(d => {
                  const inRange = aktifDonemler.includes(d)
                  const isEdge  = d===aralikBas || d===aralikBit
                  return (
                    <button key={d} onClick={() => {
                      const s = donemSira(aralikBas), e2 = donemSira(aralikBit), t = donemSira(d)
                      if (!aralikBas) { setAralikBas(d); setAralikBit(d) }
                      else if (t < s) setAralikBas(d)
                      else setAralikBit(d)
                    }}
                      style={{ padding:'2px 7px', borderRadius:4, fontSize:9, cursor:'pointer',
                        background:inRange?'rgba(59,130,246,.15)':'var(--surf3)',
                        color:inRange?'var(--blue)':'var(--tx3)',
                        border:`1px solid ${isEdge?'var(--blue)':inRange?'rgba(59,130,246,.3)':'var(--bd)'}`,
                        fontWeight:isEdge?700:400 }}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Builder ── */}
        <div style={{ display:'grid', gridTemplateColumns:'250px 1fr', gap:12, alignItems:'start' }}>

          {/* Sol panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

            <PanelGrup title="Kategori" icon="🏷">
              {KATEGORILER.map(k => (
                <DragChip key={k.key} label={k.label} color={k.color}
                  onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'kategori', katKey:k.key }) }} />
              ))}
            </PanelGrup>

            <PanelGrup title="Segment" icon="🔷">
              {['', ...SEGMENTLER].map(s => (
                <DragChip key={s||'tr'} label={s||'Tüm TR'} color={SEGMENT_HEX[s]||'#8496b0'}
                  onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'segment', seg:s }) }} />
              ))}
            </PanelGrup>

            <PanelGrup title="KPI" icon="📊"
              hint={builderSnap.katKey ? `Filtre: ${KATEGORILER.find(k=>k.key===builderSnap.katKey)?.label}` : 'Kategori seçince filtreler'}>
              <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
                {filteredKpis.map(k => (
                  <DragChip key={k.i} label={k.ad} color={CAT_COLORS[k.kat]||'#8496b0'}
                    onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'kpi', kpiIdx:k.i, label:k.ad }) }} />
                ))}
              </div>
            </PanelGrup>

            <PanelGrup title="Tip" icon="📈">
              <DragChip label="Değer" color="#3b82f6"
                onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'deger' }) }} />
              <DragChip label="Puan" color="#10b981"
                onDragStart={() => { dragPayload.current = JSON.stringify({ grup:'puan' }) }} />
            </PanelGrup>

            {/* Parametre göstergesi */}
            <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Seçili Parametreler</div>
              {[
                { label:'Segment', value: builderSnap.segment!==null ? (builderSnap.segment||'Tüm TR') : '—', color: SEGMENT_HEX[builderSnap.segment]||'#8496b0' },
                { label:'Kategori', value: builderSnap.katKey ? (KATEGORILER.find(k=>k.key===builderSnap.katKey)?.label??'—') : '—', color: KATEGORILER.find(k=>k.key===builderSnap.katKey)?.color??'var(--tx3)' },
                { label:'Tip', value: builderSnap.tip==='deger'?'Değer':builderSnap.tip==='puan'?'Puan':'—', color: builderSnap.tip==='deger'?'#3b82f6':builderSnap.tip==='puan'?'#10b981':'var(--tx3)' },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:9, color:'var(--tx3)' }}>{r.label}</span>
                  <span style={{ fontSize:9, fontWeight:700, color:r.color }}>{r.value}</span>
                </div>
              ))}
              {!builderSnap.tip && (
                <div style={{ fontSize:8, color:'#f59e0b', fontWeight:600, marginTop:4 }}>⚠ KPI için önce Değer veya Puan sürükle</div>
              )}
              <button onClick={() => { builderRef.current={segment:'',katKey:null,tip:null}; setBuilderSnap({segment:'',katKey:null,tip:null}) }}
                style={{ marginTop:8, width:'100%', padding:'3px 0', borderRadius:4, fontSize:9, cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf)', color:'var(--tx3)' }}>
                Sıfırla
              </button>
            </div>

            {/* Nasıl */}
            <div style={{ background:'var(--surf2)', border:'1px dashed var(--bd)', borderRadius:8, padding:'10px 12px', fontSize:9, color:'var(--tx3)', lineHeight:1.8 }}>
              <div style={{ fontWeight:700, color:'var(--tx2)', marginBottom:4 }}>Nasıl Kullanılır?</div>
              <div>1. <b>Segment</b> → grafiğe sürükle</div>
              <div>2. <b>Kategori</b> → grafiğe sürükle <em>(KPI filtreler)</em></div>
              <div>3a. <b>Değer</b> → grafiğe sürükle, sonra <b>KPI</b> ekle</div>
              <div>3b. <b>Puan</b> → grafiğe sürükle (direkt seri oluşur)</div>
              <div style={{ marginTop:4 }}>Seriyi kaldırmak için <b>×</b> tıkla</div>
            </div>
          </div>

          {/* Sağ — grafik */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ background:'var(--surf)', border:`2px ${dragOver?'solid var(--blue)':'dashed var(--bd)'}`,
                borderRadius:12, padding:16, minHeight:360, position:'relative', transition:'border-color .15s' }}>

              {seriler.length === 0 ? (
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:8,
                  color:dragOver?'var(--blue)':'var(--tx3)' }}>
                  <div style={{ fontSize:40 }}>📈</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{dragOver?'Bırak!':'Buraya sürükle & bırak'}</div>
                  <div style={{ fontSize:10 }}>Önce Segment, sonra Değer+KPI veya Puan sürükle</div>
                </div>
              ) : (
                <div style={{ height:360 }}>
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
                <div style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', marginBottom:8 }}>Aktif Seriler ({seriler.length})</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {seriler.map(s => (
                    <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px',
                      borderRadius:6, background:'var(--surf)', border:`1px solid ${s.color}44` }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:s.color, flexShrink:0 }} />
                      <span style={{ fontSize:10, color:'var(--tx2)', flex:1 }}>{s.label}</span>
                      <span style={{ fontSize:8, padding:'1px 5px', borderRadius:10, fontWeight:600,
                        background:s.tip==='puan'?'rgba(16,185,129,.15)':'rgba(59,130,246,.12)',
                        color:s.tip==='puan'?'#10b981':'#3b82f6' }}>
                        {s.tip==='puan'?'Puan':'Değer'}
                      </span>
                      <button onClick={() => removeSeri(s.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#f87171', fontSize:15, lineHeight:1, padding:'0 2px' }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSeriler([])}
                  style={{ marginTop:8, padding:'4px 0', borderRadius:6, fontSize:10, fontWeight:600,
                    cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf)', color:'var(--tx3)', width:'100%' }}>
                  Tümünü Temizle
                </button>
              </div>
            )}

            {/* Dönem tablosu */}
            {seriler.length > 0 && aktifDonemler.length > 0 && (
              <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:8, overflow:'hidden' }}>
                <div style={{ overflowX:'auto', maxHeight:260, overflowY:'auto' }}>
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
                            const v = getSeriVeri(s, [d], selBolge, selYas)[0]
                            const fmt = s.kpiIdx !== null ? KPI_META[s.kpiIdx].fmt : 'int'
                            return (
                              <td key={s.id} style={{ ...tdSt, fontFamily:'var(--font-dm-mono)', color:s.color, fontWeight:600 }}>
                                {s.tip==='puan' ? `${Math.round(v)} puan` : fmtKpi(v, fmt)}
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
    </div>
  )
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────
function PanelGrup({ title, icon, hint, children }: {
  title: string; icon: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:8, padding:'10px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:13 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)' }}>{title}</span>
        {hint && <span style={{ fontSize:8, color:'var(--tx3)', marginLeft:'auto' }}>{hint}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>{children}</div>
    </div>
  )
}

function DragChip({ label, color, onDragStart }: { label:string; color:string; onDragStart:()=>void }) {
  return (
    <div draggable onDragStart={e => { e.dataTransfer.effectAllowed='copy'; onDragStart() }}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:6,
        cursor:'grab', background:color+'18', border:`1px solid ${color}44`, userSelect:'none' }}>
      <div style={{ width:8, height:8, borderRadius:2, background:color, flexShrink:0 }} />
      <span style={{ fontSize:10, color:'var(--tx2)', fontWeight:500, lineHeight:1.3, flex:1 }}>{label}</span>
      <span style={{ fontSize:9, color:color, opacity:.6 }}>⠿</span>
    </div>
  )
}

// ── Stiller ───────────────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = { fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }
const selSt: React.CSSProperties   = { padding:'4px 8px', borderRadius:6, fontSize:10, fontWeight:600, background:'var(--surf)', border:'1px solid var(--bd)', color:'var(--tx2)', cursor:'pointer' }
const thSt: React.CSSProperties    = { padding:'7px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
const tdSt: React.CSSProperties    = { padding:'6px 10px', borderBottom:'1px solid var(--bd)' }
