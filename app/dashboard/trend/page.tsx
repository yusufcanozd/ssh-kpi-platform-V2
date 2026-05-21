'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  CAT_COLORS, fmtKpi, getKpisFromCube, getScore, DONEMLER,
} from '@/lib/kpi'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

// ── Dönem yardımcıları ────────────────────────────────────────────────────────
function donemYil(d: string) { return parseInt(d.split('-')[0]) }
function donemTip(d: string): 'ay' | 'Q' | 'FY' {
  if (d.includes('-FY')) return 'FY'
  if (d.includes('-Q'))  return 'Q'
  return 'ay'
}
function donemSira(d: string): number {
  const y = donemYil(d)
  if (d.includes('-FY')) return y * 100 + 99
  if (d.includes('-Q'))  return y * 100 + parseInt(d.split('-Q')[1]) * 10
  const ay = parseInt(d.split('-')[1] ?? '0')
  return y * 100 + ay
}

const AYLIK_DONEMLER = DONEMLER.filter(d => donemTip(d) === 'ay').sort((a,b)=>donemSira(a)-donemSira(b))
const Q_DONEMLER     = DONEMLER.filter(d => donemTip(d) === 'Q').sort((a,b)=>donemSira(a)-donemSira(b))
const FY_DONEMLER    = DONEMLER.filter(d => donemTip(d) === 'FY').sort((a,b)=>donemSira(a)-donemSira(b))

// ── Kategori listesi ──────────────────────────────────────────────────────────
const KATEGORILER = [
  { key: 'musteri',     label: 'Müşteri',      color: CAT_COLORS['Müşteri']     || '#10b981' },
  { key: 'ticari',      label: 'Ticari',        color: CAT_COLORS['Ticari']      || '#3b82f6' },
  { key: 'operasyonel', label: 'Operasyonel',   color: CAT_COLORS['Operasyonel'] || '#f59e0b' },
  { key: 'bayi',        label: 'Bayi Ağı',      color: CAT_COLORS['Bayi Ağı']   || '#8b5cf6' },
  { key: 'kapsam',      label: 'Kapsam',        color: CAT_COLORS['Kapsam']      || '#ef4444' },
]

// Her KPI'nin ait olduğu kategori
const KPI_KAT_MAP: Record<number, string> = {}
KPI_META.forEach((k, i) => { KPI_KAT_MAP[i] = k.kat })

// Unique renkler — her seri için
const SERI_RENKLER = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4',
  '#ec4899','#84cc16','#f97316','#a78bfa','#34d399','#fb923c',
]

// ── Seri tipi ─────────────────────────────────────────────────────────────────
type SeriTip = 'deger' | 'puan'
interface Seri {
  id: string
  label: string
  color: string
  tip: SeriTip
  // parametreler
  segment: string      // '' = tüm TR
  kpiIdx: number | null
  katKey: string | null
}

// ── Sürüklenebilir öge tipi ───────────────────────────────────────────────────
type DragItem =
  | { grup: 'kategori'; katKey: string; label: string; color: string }
  | { grup: 'segment';  seg: string }
  | { grup: 'kpi';      kpiIdx: number; label: string; katKey: string }
  | { grup: 'deger' }
  | { grup: 'puan' }

// ── Yardımcı: seri için dönem verisi ─────────────────────────────────────────
function getSeriVeri(
  seri: Seri,
  donemler: string[],
  bolge: string,
  yas: string
): number[] {
  return donemler.map(d => {
    if (seri.tip === 'puan') {
      const sc = getScore(seri.segment, bolge, yas, d)
      if (!sc) return 0
      if (seri.katKey) return (sc as any)[seri.katKey] ?? sc.genel
      return sc.genel
    } else {
      // değer
      if (seri.kpiIdx === null) return 0
      return getKpisFromCube(seri.segment, bolge, yas, d)[seri.kpiIdx] ?? 0
    }
  })
}

// ── Seri oluşturma yardımcısı ─────────────────────────────────────────────────
function makeSeriId() { return Math.random().toString(36).slice(2, 8) }

// ── Bileşen ───────────────────────────────────────────────────────────────────
export default function TrendPage() {
  const { selBolge, selYas } = useDashboardCtx()

  // ── Filtre state ──────────────────────────────────────────────────────────
  type Periyot = 'aylik' | 'ceyreklik' | 'yillik'
  const [periyot, setPeriyot] = useState<Periyot>('ceyreklik')
  const tumDonemler = periyot === 'aylik' ? AYLIK_DONEMLER : periyot === 'ceyreklik' ? Q_DONEMLER : FY_DONEMLER
  const [aralikBas, setAralikBas] = useState<string>(tumDonemler[0] ?? '')
  const [aralikBit, setAralikBit] = useState<string>(tumDonemler[tumDonemler.length - 1] ?? '')

  // Periyot değişince aralığı sıfırla
  function handlePeriyot(p: Periyot) {
    const liste = p === 'aylik' ? AYLIK_DONEMLER : p === 'ceyreklik' ? Q_DONEMLER : FY_DONEMLER
    setPeriyot(p)
    setAralikBas(liste[0] ?? '')
    setAralikBit(liste[liste.length - 1] ?? '')
  }

  const aktifDonemler = useMemo(() => {
    const all = tumDonemler
    const bas = all.indexOf(aralikBas)
    const bit = all.indexOf(aralikBit)
    if (bas < 0 || bit < 0) return all
    return all.slice(Math.min(bas, bit), Math.max(bas, bit) + 1)
  }, [tumDonemler, aralikBas, aralikBit])

  // ── Grafik builder state ──────────────────────────────────────────────────
  const [seriler, setSeriler] = useState<Seri[]>([])
  const [dragOver, setDragOver]   = useState(false)

  // Geçici builder state — hangi seg ve kat seçili (drag sırasında birikiyor)
  const builderRef = useRef<{
    segment: string | null
    katKey:  string | null
    tip:     SeriTip | null
  }>({ segment: null, katKey: null, tip: null })

  // ── Sürükleme ─────────────────────────────────────────────────────────────
  const dragItemRef = useRef<DragItem | null>(null)

  function handleDragStart(item: DragItem) {
    dragItemRef.current = item
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const item = dragItemRef.current
    if (!item) return

    const b = builderRef.current

    if (item.grup === 'segment') {
      builderRef.current = { ...b, segment: item.seg }
      return
    }
    if (item.grup === 'kategori') {
      builderRef.current = { ...b, katKey: item.katKey }
      return
    }
    if (item.grup === 'deger' || item.grup === 'puan') {
      builderRef.current = { ...b, tip: item.grup }
      tryCreateSeri()
      return
    }
    if (item.grup === 'kpi') {
      // KPI sürüklendiğinde tip de deger olarak varsay eğer yoksa
      const tip = b.tip ?? 'deger'
      const seg = b.segment ?? ''
      const color = SERI_RENKLER[seriler.length % SERI_RENKLER.length]
      const segLabel = seg ? seg : 'Tüm TR'
      const yeniSeri: Seri = {
        id: makeSeriId(),
        label: `${segLabel} · ${item.label}`,
        color,
        tip,
        segment: seg,
        kpiIdx: item.kpiIdx,
        katKey: null,
      }
      setSeriler(prev => [...prev, yeniSeri])
      return
    }
  }

  function tryCreateSeri() {
    const b = builderRef.current
    if (!b.tip) return

    const seg = b.segment ?? ''
    const color = SERI_RENKLER[seriler.length % SERI_RENKLER.length]
    const segLabel = seg ? seg : 'Tüm TR'

    if (b.tip === 'puan') {
      const katLabel = b.katKey
        ? KATEGORILER.find(k => k.key === b.katKey)?.label ?? b.katKey
        : 'Genel'
      const yeniSeri: Seri = {
        id: makeSeriId(),
        label: `${segLabel} · ${katLabel} Puanı`,
        color,
        tip: 'puan',
        segment: seg,
        kpiIdx: null,
        katKey: b.katKey,
      }
      setSeriler(prev => [...prev, yeniSeri])
    } else {
      // değer — eğer KPI seçili değilse ilk KPI'yı koy
      const kpiIdx = 0
      const kpiLabel = KPI_META[kpiIdx]?.ad ?? ''
      const yeniSeri: Seri = {
        id: makeSeriId(),
        label: `${segLabel} · ${kpiLabel}`,
        color,
        tip: 'deger',
        segment: seg,
        kpiIdx,
        katKey: null,
      }
      setSeriler(prev => [...prev, yeniSeri])
    }
  }

  function removeSeri(id: string) {
    setSeriler(prev => prev.filter(s => s.id !== id))
  }

  // ── Grafik verisi ─────────────────────────────────────────────────────────
  const chartData = useMemo(() => ({
    labels: aktifDonemler,
    datasets: seriler.map(s => {
      const veri = getSeriVeri(s, aktifDonemler, selBolge, selYas)
      return {
        label: s.label,
        data: veri,
        borderColor: s.color,
        backgroundColor: s.color + '18',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: s.color,
        fill: false,
        tension: 0.3,
      }
    }),
  }), [seriler, aktifDonemler, selBolge, selYas])

  // KPI listesi — seçili katKey varsa filtrele
  const filteredKpis = useMemo(() => {
    if (!builderRef.current.katKey) return KPI_META.map((k, i) => ({ ...k, i }))
    const katLabel = KATEGORILER.find(k => k.key === builderRef.current.katKey)?.label
    return KPI_META.map((k, i) => ({ ...k, i })).filter(k => k.kat === katLabel)
  }, [seriler]) // seriler değişince re-render tetikler

  // ── Render ────────────────────────────────────────────────────────────────
  const periyotler: { key: Periyot; label: string; disabled: boolean }[] = [
    { key: 'aylik',      label: 'Aylık',      disabled: AYLIK_DONEMLER.length === 0 },
    { key: 'ceyreklik',  label: 'Çeyreklik',  disabled: Q_DONEMLER.length === 0 },
    { key: 'yillik',     label: 'Yıllık',     disabled: FY_DONEMLER.length === 0 },
  ]

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle="Kendi trend grafiğini oluştur" />
      <div className={styles.content}>

        {/* ── 1. Filtre Alanı ── */}
        <div style={{
          background: 'var(--surf2)', border: '1px solid var(--bd)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Periyot */}
            <div>
              <div style={labelStyle}>Periyot</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {periyotler.map(p => (
                  <button key={p.key} onClick={() => !p.disabled && handlePeriyot(p.key)}
                    disabled={p.disabled}
                    style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      cursor: p.disabled ? 'not-allowed' : 'pointer',
                      border: `1px solid ${periyot === p.key ? 'var(--blue)' : 'var(--bd)'}`,
                      background: periyot === p.key ? 'rgba(59,130,246,.12)' : 'var(--surf)',
                      color: p.disabled ? 'var(--tx3)' : periyot === p.key ? 'var(--blue)' : 'var(--tx2)',
                      opacity: p.disabled ? 0.5 : 1,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dönem Aralığı */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={labelStyle}>Dönem Aralığı</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={aralikBas} onChange={e => setAralikBas(e.target.value)} style={selectStyle}>
                  {tumDonemler.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ color: 'var(--tx3)', fontSize: 12 }}>→</span>
                <select value={aralikBit} onChange={e => setAralikBit(e.target.value)} style={selectStyle}>
                  {tumDonemler.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ fontSize: 10, color: 'var(--tx3)' }}>
                  {aktifDonemler.length} dönem seçili
                </span>
              </div>

              {/* Dönem bantları — tıkla seç */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 8 }}>
                {tumDonemler.map(d => {
                  const inRange = aktifDonemler.includes(d)
                  const isBas = d === aralikBas
                  const isBit = d === aralikBit
                  return (
                    <button key={d}
                      onClick={() => {
                        if (!aralikBas || (aralikBas && aralikBit)) {
                          setAralikBas(d); setAralikBit(d)
                        } else {
                          if (donemSira(d) < donemSira(aralikBas)) setAralikBas(d)
                          else setAralikBit(d)
                        }
                      }}
                      style={{
                        padding: '2px 7px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                        background: inRange ? 'rgba(59,130,246,.15)' : 'var(--surf3)',
                        color: inRange ? 'var(--blue)' : 'var(--tx3)',
                        border: `1px solid ${isBas || isBit ? 'var(--blue)' : inRange ? 'rgba(59,130,246,.3)' : 'var(--bd)'}`,
                        fontWeight: isBas || isBit ? 700 : 400,
                      }}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2+3. Builder + Grafik ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12, alignItems: 'start' }}>

          {/* Sol panel — sürüklenebilir öğeler */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Kategori grubu */}
            <PanelGrup title="Kategori" icon="🏷">
              {KATEGORILER.map(k => (
                <DragChip key={k.key}
                  label={k.label}
                  color={k.color}
                  onDragStart={() => handleDragStart({ grup: 'kategori', katKey: k.key, label: k.label, color: k.color })}
                />
              ))}
            </PanelGrup>

            {/* Segment grubu */}
            <PanelGrup title="Segment" icon="🔷">
              {['', ...SEGMENTLER].map(s => (
                <DragChip key={s || 'tumtr'}
                  label={s || 'Tüm TR'}
                  color={SEGMENT_HEX[s] || '#8496b0'}
                  onDragStart={() => handleDragStart({ grup: 'segment', seg: s })}
                />
              ))}
            </PanelGrup>

            {/* KPI grubu — katKey varsa filtreli */}
            <PanelGrup title="KPI" icon="📊"
              hint={builderRef.current.katKey
                ? `Filtre: ${KATEGORILER.find(k=>k.key===builderRef.current.katKey)?.label}`
                : 'Kategori seçince filtreler'}>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {KPI_META.map((k, i) => {
                  const katLabel = KATEGORILER.find(kat => kat.label === k.kat)?.label
                  const katColor = CAT_COLORS[k.kat] || '#8496b0'
                  return (
                    <DragChip key={i}
                      label={k.ad}
                      color={katColor}
                      onDragStart={() => handleDragStart({ grup: 'kpi', kpiIdx: i, label: k.ad, katKey: k.kat })}
                    />
                  )
                })}
              </div>
            </PanelGrup>

            {/* Değer / Puan grubu */}
            <PanelGrup title="Tip" icon="📈">
              <DragChip label="Değer" color="#3b82f6"
                onDragStart={() => handleDragStart({ grup: 'deger' })} />
              <DragChip label="Puan" color="#10b981"
                onDragStart={() => handleDragStart({ grup: 'puan' })} />
            </PanelGrup>

            {/* Builder adımları ipucu */}
            <div style={{
              background: 'var(--surf2)', border: '1px dashed var(--bd)',
              borderRadius: 8, padding: '10px 12px', fontSize: 9, color: 'var(--tx3)', lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--tx2)' }}>Nasıl Kullanılır?</div>
              <div>1. Segment sürükle → Grafiğe bırak</div>
              <div>2. Kategori sürükle → Grafiğe bırak <span style={{color:'var(--tx3)'}}>(opsiyonel)</span></div>
              <div>3. KPI sürükle → Grafiğe bırak <span style={{color:'var(--tx3)'}}>(değer serisi)</span></div>
              <div>&nbsp;&nbsp;&nbsp;<em>veya</em></div>
              <div>3. Puan sürükle → Grafiğe bırak <span style={{color:'var(--tx3)'}}>(skor serisi)</span></div>
              <div style={{ marginTop: 6, color: 'var(--tx2)', fontWeight: 600 }}>Seriyi kaldırmak için × tıkla</div>
            </div>
          </div>

          {/* Sağ — grafik alanı */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Drop zone + grafik */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                background: 'var(--surf)',
                border: `2px ${dragOver ? 'solid var(--blue)' : 'dashed var(--bd)'}`,
                borderRadius: 12,
                padding: '16px',
                minHeight: 360,
                transition: 'border-color .15s',
                position: 'relative',
              }}>

              {seriler.length === 0 ? (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: dragOver ? 'var(--blue)' : 'var(--tx3)',
                }}>
                  <div style={{ fontSize: 36 }}>📈</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {dragOver ? 'Bırak!' : 'Buraya sürükle & bırak'}
                  </div>
                  <div style={{ fontSize: 10 }}>
                    Önce Segment, sonra KPI veya Puan sürükle
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ height: 320 }}>
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: { color: '#8496b0', font: { size: 9 }, boxWidth: 12, padding: 12 },
                          },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => {
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
                            grid: { color: 'rgba(255,255,255,.05)' },
                            ticks: { color: '#8496b0', font: { size: 9 } },
                          },
                          x: {
                            grid: { display: false },
                            ticks: { color: '#8496b0', font: { size: 9 }, maxRotation: 45, autoSkip: false },
                          },
                        },
                      }}
                    />
                  </div>

                  {dragOver && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(59,130,246,.08)',
                      border: '2px solid var(--blue)', borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: 'var(--blue)', pointerEvents: 'none',
                    }}>
                      + Seri Ekle
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Aktif seriler listesi */}
            {seriler.length > 0 && (
              <div style={{
                background: 'var(--surf2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', marginBottom: 8 }}>
                  Aktif Seriler ({seriler.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {seriler.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', borderRadius: 6,
                      background: 'var(--surf)', border: `1px solid ${s.color}44`,
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'var(--tx2)', flex: 1 }}>{s.label}</span>
                      <span style={{
                        fontSize: 8, padding: '1px 5px', borderRadius: 10,
                        background: s.tip === 'puan' ? 'rgba(16,185,129,.15)' : 'rgba(59,130,246,.12)',
                        color: s.tip === 'puan' ? '#10b981' : '#3b82f6', fontWeight: 600,
                      }}>
                        {s.tip === 'puan' ? 'Puan' : 'Değer'}
                      </span>
                      <button onClick={() => removeSeri(s.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#f87171', fontSize: 14, lineHeight: 1, padding: '0 2px',
                      }}>×</button>
                    </div>
                  ))}
                </div>

                {/* Tüm serileri temizle */}
                <button onClick={() => { setSeriler([]); builderRef.current = { segment: null, katKey: null, tip: null } }}
                  style={{
                    marginTop: 8, padding: '4px 12px', borderRadius: 6, fontSize: 10,
                    fontWeight: 600, cursor: 'pointer', border: '1px solid var(--bd)',
                    background: 'var(--surf)', color: 'var(--tx3)', width: '100%',
                  }}>
                  Tümünü Temizle
                </button>
              </div>
            )}

            {/* Dönem özet tablosu — seriler varsa */}
            {seriler.length > 0 && (
              <div style={{
                background: 'var(--surf)', border: '1px solid var(--bd)',
                borderRadius: 8, overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ background: 'var(--surf2)', position: 'sticky', top: 0, zIndex: 2 }}>
                        <th style={thS}>Dönem</th>
                        {seriler.map(s => (
                          <th key={s.id} style={{ ...thS, color: s.color }}>{s.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aktifDonemler.map(d => (
                        <tr key={d} style={{ borderBottom: '1px solid var(--bd)' }}>
                          <td style={{ ...tdS, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', fontWeight: 600 }}>{d}</td>
                          {seriler.map(s => {
                            const v = getSeriVeri(s, [d], selBolge, selYas)[0]
                            const fmt = s.kpiIdx !== null ? KPI_META[s.kpiIdx].fmt : 'int'
                            return (
                              <td key={s.id} style={{ ...tdS, fontFamily: 'var(--font-dm-mono)', color: s.color, fontWeight: 600 }}>
                                {s.tip === 'puan' ? `${Math.round(v)} puan` : fmtKpi(v, fmt)}
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
    <div style={{
      background: 'var(--surf2)', border: '1px solid var(--bd)',
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx2)' }}>{title}</span>
        {hint && <span style={{ fontSize: 8, color: 'var(--tx3)', marginLeft: 'auto' }}>{hint}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

function DragChip({ label, color, onDragStart }: {
  label: string; color: string; onDragStart: () => void
}) {
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; onDragStart() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 8px', borderRadius: 6, cursor: 'grab',
        background: color + '15', border: `1px solid ${color}44`,
        userSelect: 'none', transition: 'opacity .1s',
      }}
      onMouseDown={e => (e.currentTarget.style.opacity = '.7')}
      onMouseUp={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: 'var(--tx2)', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 9, color: color, opacity: 0.7 }}>⠿</span>
    </div>
  )
}

// ── Stiller ───────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--tx3)',
  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
}
const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
  background: 'var(--surf)', border: '1px solid var(--bd)', color: 'var(--tx2)',
  cursor: 'pointer',
}
const thS: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700,
  color: 'var(--tx3)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap',
}
const tdS: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--bd)' }
