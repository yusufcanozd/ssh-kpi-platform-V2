'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, chgColor, chgBg, kpiUnit
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import type { ChartData, ChartOptions } from 'chart.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Tooltip, Legend, LineElement, PointElement
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, LineElement, PointElement)

const KATS = [
  { key: 'genel',       label: 'Genel' },
  { key: 'musteri',     label: 'Müşteri' },
  { key: 'ticari',      label: 'Ticari' },
  { key: 'operasyonel', label: 'Operasyonel' },
  { key: 'bayi',        label: 'Bayi Ağı' },
  { key: 'kapsam',      label: 'Kapsam' },
]

function getKatVal(s: any, key: string): number {
  if (!s) return 0
  if (key === 'genel') return s.genel || 0
  return (s[key as keyof typeof s] as number) || 0
}

function chgPct(baz: number, cmp: number | null): number | null {
  if (cmp === null || !cmp) return null
  return Math.round((baz - cmp) / Math.abs(cmp) * 1000) / 10
}

const scColor = (v: number) => v >= 80 ? '#10b981' : v >= 65 ? '#3b82f6' : v >= 50 ? '#f59e0b' : '#ef4444'

// ── Segment ortalama çizgisi plugin ──────────────────────────────────────────
const segmentAvgLinePlugin = {
  id: 'segmentAvgLine',
  afterDatasetsDraw(chart: any, _: any, opts: any) {
    const { ctx, scales: { x, y } } = chart
    if (!opts?.lines?.length) return
    opts.lines.forEach((line: any) => {
      const { startIdx, endIdx, value, color, dash, lineWidth } = line
      if (value == null || startIdx == null) return
      const xStart = x.getPixelForValue(startIdx) - x.width / (x.max - x.min + 1) * 0.4
      const xEnd   = x.getPixelForValue(endIdx)   + x.width / (x.max - x.min + 1) * 0.4
      const yPx    = y.getPixelForValue(value)
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth   = lineWidth ?? 2
      ctx.setLineDash(dash ?? [6, 4])
      ctx.beginPath()
      ctx.moveTo(xStart, yPx)
      ctx.lineTo(xEnd, yPx)
      ctx.stroke()
      ctx.restore()
    })
  }
}
ChartJS.register(segmentAvgLinePlugin)

const thS: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700,
  letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--tx3)',
  borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap'
}
const tdS: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--bd)' }

// ── Sekme 1: KPI Bazlı (mevcut içerik) ──────────────────────────────────────
function KpiBazliTabKpi() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number>(3)

  const meta = KPI_META[sortKpi]
  const lob  = isLowerBetter(sortKpi)
  const unit = kpiUnit(meta.fmt)

  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s === selSeg).map(s => ({
      seg: s,
      baz: getKpisFromCube(s, selBolge, selYas, selDonem),
      cmp: selCmpDonem ? getKpisFromCube(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const markalar = useMemo(() => {
    const ranked = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    return ranked.map(m => ({
      ...m,
      baz: getKpisFromCube(m.segment, selBolge, selYas, selDonem),
      cmp: selCmpDonem ? getKpisFromCube(m.segment, selBolge, selYas, selCmpDonem) : null,
    })).sort((a, b) => {
      const av = a.baz[sortKpi] ?? 0
      const bv = b.baz[sortKpi] ?? 0
      return lob ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, sortKpi, lob])

  const segLinesBaz = useMemo(() => {
    const segs = selSeg ? [selSeg] : SEGMENTLER
    return segs.flatMap(seg => {
      const segMarkalar = markalar.filter(m => m.segment === seg)
      if (!segMarkalar.length) return []
      const idxs = segMarkalar.map(m => markalar.indexOf(m))
      const avg = getKpisFromCube(seg, selBolge, selYas, selDonem)[sortKpi]
      return [{ startIdx: idxs[0], endIdx: idxs[idxs.length - 1], value: avg, color: SEGMENT_HEX[seg], dash: [6, 4], lineWidth: 2.5, label: `${seg} Ort. (${selDonem || 'Tüm'})` }]
    })
  }, [markalar, selSeg, selBolge, selYas, selDonem, sortKpi])

  const segLinesCmp = useMemo(() => {
    if (!selCmpDonem) return []
    const segs = selSeg ? [selSeg] : SEGMENTLER
    return segs.flatMap(seg => {
      const segMarkalar = markalar.filter(m => m.segment === seg)
      if (!segMarkalar.length) return []
      const idxs = segMarkalar.map(m => markalar.indexOf(m))
      const avg = getKpisFromCube(seg, selBolge, selYas, selCmpDonem)[sortKpi]
      return [{ startIdx: idxs[0], endIdx: idxs[idxs.length - 1], value: avg, color: SEGMENT_HEX[seg] + 'aa', dash: [3, 3], lineWidth: 2, label: `${seg} Ort. (${selCmpDonem})` }]
    })
  }, [markalar, selSeg, selBolge, selYas, selCmpDonem, sortKpi])

  const allLines = [...segLinesBaz, ...segLinesCmp]
  const maxVal = Math.max(...markalar.map(m => m.baz[sortKpi] || 0), ...allLines.map(l => l.value || 0), 0.001)
  const filterLabel = [selBolge || 'Tüm TR', selSeg || 'Tüm Seg.', selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y', selDonem || 'Tüm Dönem'].join(' · ')

  return (
    <>
      {/* Segment 4x3 Matris */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segData.length},1fr)`, gap: 10, marginBottom: 14 }}>
        {segData.map(s => (
          <div key={s.seg} style={{ background: SEGMENT_BG[s.seg], border: `1px solid ${SEGMENT_COLORS[s.seg]}55`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${SEGMENT_COLORS[s.seg]}33` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENT_COLORS[s.seg] }}>{s.seg}</span>
              <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{filterLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
              {KPI_META.map((k, i) => {
                const bazV = s.baz[i]
                const cmpV = s.cmp?.[i] ?? null
                const chg = chgPct(bazV, cmpV)
                const u = kpiUnit(k.fmt)
                const isAct = sortKpi === i
                return (
                  <div key={k.no} onClick={() => setSortKpi(i)}
                    style={{ background: isAct ? `${SEGMENT_HEX[s.seg]}30` : 'rgba(0,0,0,.12)', border: `1px solid ${isAct ? SEGMENT_HEX[s.seg] + '88' : 'transparent'}`, borderRadius: 6, padding: '7px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: isAct ? SEGMENT_COLORS[s.seg] : 'var(--tx2)', lineHeight: 1.35, marginBottom: 6, minHeight: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span>{k.ad}</span>
                      {u && <span style={{ fontSize: 8, fontWeight: 400, color: 'var(--tx3)', marginTop: 1 }}>({u})</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, justifyContent: 'center' }}>
                      <div style={{ minWidth: 0, flex: '0 1 auto' }}>
                        {selDonem && <div style={{ fontSize: 6, color: 'var(--tx3)', marginBottom: 1, lineHeight: 1 }}>{selDonem}</div>}
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: SEGMENT_COLORS[s.seg], lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtKpi(bazV, k.fmt)}</div>
                      </div>
                      {cmpV !== null && (
                        <div style={{ paddingBottom: 2, minWidth: 0, flex: '0 1 auto' }}>
                          {selCmpDonem && <div style={{ fontSize: 6, color: 'var(--tx3)', marginBottom: 1, lineHeight: 1 }}>{selCmpDonem}</div>}
                          <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtKpi(cmpV, k.fmt)}</div>
                        </div>
                      )}
                    </div>
                    {chg !== null && (
                      <div style={{ marginTop: 3, textAlign: 'center' }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: chgColor(lob ? -chg : chg) }}>{chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg)}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Grafik */}
      <div className={styles.card}>
        <div className={styles.cardHd}>
          <h3>{meta.ad}{unit ? ` (${unit})` : ''} — Marka Dağılımı</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={styles.hint}>{filterLabel} · {lob ? '↓ Düşük daha iyi' : '↑ Yüksek daha iyi'}</span>
            {allLines.slice(0, 4).map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--tx3)' }}>
                <svg width="22" height="8">
                  <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth={l.lineWidth} strokeDasharray={l.dash.join(',')} />
                </svg>
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: markalar.length * 52, height: 280 }}>
            <Bar
              data={{
                labels: markalar.map(m => m.marka),
                datasets: [
                  { label: selDonem || 'Baz Dönem', data: markalar.map(m => m.baz[sortKpi]), backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '22'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 2, borderRadius: 5 },
                  ...(selCmpDonem ? [{ label: selCmpDonem, data: markalar.map(m => m.cmp?.[sortKpi] ?? 0), backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '66'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 1, borderRadius: 5 }] : [])
                ]
              } as ChartData<'bar'>}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: !!selCmpDonem, position: 'top', labels: { color: '#8496b0', font: { size: 10 }, boxWidth: 12 } },
                  tooltip: { callbacks: { title: (items) => { const m = markalar[items[0].dataIndex]; return `${m.marka} (${m.segment})` }, label: (ctx) => `${ctx.dataset.label}: ${fmtKpi(ctx.parsed.y as number, meta.fmt)}` } },
                  // @ts-ignore
                  segmentAvgLine: { lines: allLines }
                },
                scales: {
                  y: { min: 0, max: maxVal * 1.25, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8496b0', font: { size: 9 }, callback: (v) => fmtKpi(Number(v), meta.fmt) } },
                  x: { grid: { display: false }, ticks: { color: '#8496b0', font: { size: 8 }, maxRotation: 45, autoSkip: false } }
                }
              } as ChartOptions<'bar'>}
            />
          </div>
        </div>
      </div>

      {/* Marka KPI Değer Tablosu */}
      <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 490, position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--surf2)', position: 'sticky', top: 0, zIndex: 3 }}>
                <th style={thS}>#</th>
                <th style={thS}>Marka</th>
                <th style={thS}>Seg.</th>
                {KPI_META.map((k, i) => {
                  const u = kpiUnit(k.fmt)
                  return (
                    <th key={i} onClick={() => setSortKpi(i)}
                      style={{ ...thS, cursor: 'pointer', minWidth: 68, textAlign: 'center', color: sortKpi === i ? 'var(--blue)' : 'var(--tx3)', background: sortKpi === i ? 'rgba(59,130,246,.06)' : 'var(--surf2)' }}>
                      <div style={{ fontSize: 8, lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'break-word' }}>{k.ad}{u ? ` (${u})` : ''}</div>
                      {sortKpi === i && <span style={{ fontSize: 7 }}>{lob ? '↑' : '↓'}</span>}
                    </th>
                  )
                })}
                <th style={{ ...thS, position: 'sticky', right: 0, background: 'var(--surf2)', minWidth: 60 }}>Skor</th>
              </tr>
            </thead>
            <tbody>
              {markalar.map((m, i) => {
                const trBaz = getKpisFromCube('', selBolge, selYas, selDonem)
                const sc = scColor(m.score)
                return (
                  <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={tdS}><span style={{ color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)', fontSize: 9 }}>{i + 1}</span></td>
                    <td style={{ ...tdS, fontWeight: 600, fontSize: 11, color: SEGMENT_HEX[m.segment] || 'var(--tx)', whiteSpace: 'nowrap' }}>{m.marka}</td>
                    <td style={tdS}>
                      <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_COLORS[m.segment], padding: '1px 6px', borderRadius: 20, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${SEGMENT_COLORS[m.segment]}44`, whiteSpace: 'nowrap' }}>{m.segment}</span>
                    </td>
                    {m.baz.map((bazV, ki) => {
                      const ref = trBaz[ki] ?? 0
                      const { bg, color } = heatColor(bazV, ref, !isLowerBetter(ki))
                      const cmpV = m.cmp?.[ki] ?? null
                      const chg = chgPct(bazV, cmpV)
                      return (
                        <td key={ki} onClick={() => setSortKpi(ki)}
                          style={{ ...tdS, textAlign: 'center', background: bg, cursor: 'pointer', outline: sortKpi === ki ? `2px solid ${color}66` : 'none', outlineOffset: -1 }}>
                          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, fontWeight: 700, color }}>{fmtKpi(bazV, KPI_META[ki].fmt)}</div>
                          {cmpV !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{fmtKpi(cmpV, KPI_META[ki].fmt)}</span>
                              {chg !== null && <span style={{ fontSize: 7, fontWeight: 700, padding: '0 2px', borderRadius: 2, background: chgBg(isLowerBetter(ki) ? -chg : chg), color: chgColor(isLowerBetter(ki) ? -chg : chg) }}>{chg >= 0 ? '+' : ''}{chg}%</span>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ ...tdS, position: 'sticky', right: 0, background: 'var(--surf)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 4, height: 4, overflow: 'hidden', minWidth: 28 }}>
                          <div style={{ width: `${m.score}%`, height: 4, borderRadius: 4, background: sc }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, fontWeight: 700, color: sc, minWidth: 18, textAlign: 'right' }}>{m.score}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renk açıklaması */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {[{ c: '#10b981', bg: 'rgba(16,185,129,.2)', label: 'Tüm TR üstü' }, { c: '#60a5fa', bg: 'rgba(59,130,246,.15)', label: '%5–15 üstü' }, { c: '#fbbf24', bg: 'rgba(245,158,11,.12)', label: 'Ortalama' }, { c: '#f87171', bg: 'rgba(239,68,68,.15)', label: 'Tüm TR altı' }].map(x => (
          <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx3)' }}>
            <div style={{ width: 12, height: 10, borderRadius: 3, background: x.bg, border: `1px solid ${x.c}` }} />{x.label}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Sekme 2: Kategori Bazlı ──────────────────────────────────────────────────
function KategoriBazliTabKpi() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKat, setSelKat] = useState('genel')

  const filterLabel = [selBolge || 'Tüm TR', selSeg || 'Tüm Seg.', selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y', selDonem || 'Tüm Dönem'].join(' · ')

  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s === selSeg).map(s => ({
      seg: s,
      bazScore: getScore(s, selBolge, selYas, selDonem),
      cmpScore: selCmpDonem ? getScore(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const markalar = useMemo(() => {
    const ranked = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    return ranked.map(m => ({
      ...m,
      bazScore: getScore(m.segment, selBolge, selYas, selDonem),
      cmpScore2: selCmpDonem ? getScore(m.segment, selBolge, selYas, selCmpDonem) : null,
    })).sort((a, b) => {
      const av = getKatVal(a.bazScore, selKat)
      const bv = getKatVal(b.bazScore, selKat)
      if (bv !== av) return bv - av
      return b.score - a.score
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, selKat])

  // Segment ortalama çizgileri — seçili kategori değeri
  const segLinesBaz = useMemo(() => {
    const segs = selSeg ? [selSeg] : SEGMENTLER
    return segs.flatMap(seg => {
      const segMarkalar = markalar.filter(m => m.segment === seg)
      if (!segMarkalar.length) return []
      const idxs = segMarkalar.map(m => markalar.indexOf(m))
      const avg = getKatVal(getScore(seg, selBolge, selYas, selDonem), selKat)
      return [{ startIdx: idxs[0], endIdx: idxs[idxs.length - 1], value: avg, color: SEGMENT_HEX[seg], dash: [6, 4], lineWidth: 2.5, label: `${seg} Ort. (${selDonem || 'Tüm'})` }]
    })
  }, [markalar, selSeg, selBolge, selYas, selDonem, selKat])

  const segLinesCmp = useMemo(() => {
    if (!selCmpDonem) return []
    const segs = selSeg ? [selSeg] : SEGMENTLER
    return segs.flatMap(seg => {
      const segMarkalar = markalar.filter(m => m.segment === seg)
      if (!segMarkalar.length) return []
      const idxs = segMarkalar.map(m => markalar.indexOf(m))
      const avg = getKatVal(getScore(seg, selBolge, selYas, selCmpDonem), selKat)
      return [{ startIdx: idxs[0], endIdx: idxs[idxs.length - 1], value: avg, color: SEGMENT_HEX[seg] + 'aa', dash: [3, 3], lineWidth: 2, label: `${seg} Ort. (${selCmpDonem})` }]
    })
  }, [markalar, selSeg, selBolge, selYas, selCmpDonem, selKat])

  const allLines = [...segLinesBaz, ...segLinesCmp]
  const barBazData = markalar.map(m => getKatVal(m.bazScore, selKat))
  const barCmpData = selCmpDonem ? markalar.map(m => getKatVal(m.cmpScore2, selKat)) : []
  const maxVal = Math.max(...barBazData, ...barCmpData, ...allLines.map(l => l.value || 0), 0.001)

  return (
    <>
      {/* Segment Kategori Matris */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segData.length},1fr)`, gap: 10, marginBottom: 14 }}>
        {segData.map(s => (
          <div key={s.seg} style={{ background: SEGMENT_BG[s.seg], border: `1px solid ${SEGMENT_COLORS[s.seg]}55`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${SEGMENT_COLORS[s.seg]}33` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENT_COLORS[s.seg] }}>{s.seg}</span>
              <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{filterLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
              {KATS.map(k => {
                const bazV = getKatVal(s.bazScore, k.key)
                const cmpV = s.cmpScore ? getKatVal(s.cmpScore, k.key) : null
                const chg = chgPct(bazV, cmpV)
                const isAct = selKat === k.key
                return (
                  <div key={k.key} onClick={() => setSelKat(k.key)}
                    style={{ background: isAct ? `${SEGMENT_HEX[s.seg]}30` : 'rgba(0,0,0,.12)', border: `1px solid ${isAct ? SEGMENT_HEX[s.seg] + '88' : 'transparent'}`, borderRadius: 6, padding: '7px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: isAct ? SEGMENT_COLORS[s.seg] : 'var(--tx2)', lineHeight: 1.35, marginBottom: 6, minHeight: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {k.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, justifyContent: 'center' }}>
                      <div style={{ minWidth: 0, flex: '0 1 auto' }}>
                        {selDonem && <div style={{ fontSize: 6, color: 'var(--tx3)', marginBottom: 1, lineHeight: 1 }}>{selDonem}</div>}
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: SEGMENT_COLORS[s.seg], lineHeight: 1 }}>{bazV}</div>
                        <div style={{ fontSize: 7, color: 'var(--tx3)', marginTop: 1 }}>puan</div>
                      </div>
                      {cmpV !== null && (
                        <div style={{ paddingBottom: 2, minWidth: 0, flex: '0 1 auto' }}>
                          {selCmpDonem && <div style={{ fontSize: 6, color: 'var(--tx3)', marginBottom: 1, lineHeight: 1 }}>{selCmpDonem}</div>}
                          <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1 }}>{cmpV}</div>
                        </div>
                      )}
                    </div>
                    {chg !== null && (
                      <div style={{ marginTop: 3, textAlign: 'center' }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: chgColor(chg) }}>{chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg)}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Grafik */}
      <div className={styles.card}>
        <div className={styles.cardHd}>
          <h3>{KATS.find(k => k.key === selKat)?.label || 'Genel'} Skoru — Marka Dağılımı</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={styles.hint}>{filterLabel}</span>
            {allLines.slice(0, 4).map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--tx3)' }}>
                <svg width="22" height="8">
                  <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth={l.lineWidth} strokeDasharray={l.dash.join(',')} />
                </svg>
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: markalar.length * 52, height: 280 }}>
            <Bar
              data={{
                labels: markalar.map(m => m.marka),
                datasets: [
                  { label: selDonem || 'Baz Dönem', data: barBazData, backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '22'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 2, borderRadius: 5 },
                  ...(selCmpDonem ? [{ label: selCmpDonem, data: barCmpData, backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '66'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 1, borderRadius: 5 }] : [])
                ]
              } as ChartData<'bar'>}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: !!selCmpDonem, position: 'top', labels: { color: '#8496b0', font: { size: 10 }, boxWidth: 12 } },
                  tooltip: { callbacks: { title: (items) => { const m = markalar[items[0].dataIndex]; return `${m.marka} (${m.segment})` }, label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} puan` } },
                  // @ts-ignore
                  segmentAvgLine: { lines: allLines }
                },
                scales: {
                  y: { min: 0, max: maxVal * 1.25, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8496b0', font: { size: 9 } } },
                  x: { grid: { display: false }, ticks: { color: '#8496b0', font: { size: 8 }, maxRotation: 45, autoSkip: false } }
                }
              } as ChartOptions<'bar'>}
            />
          </div>
        </div>
      </div>

      {/* Marka Kategori Skor Tablosu */}
      <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 490, position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--surf2)', position: 'sticky', top: 0, zIndex: 3 }}>
                <th style={thS}>#</th>
                <th style={thS}>Marka</th>
                <th style={thS}>Seg.</th>
                {KATS.map(k => (
                  <th key={k.key} onClick={() => setSelKat(k.key)}
                    style={{ ...thS, cursor: 'pointer', minWidth: 80, textAlign: 'center', color: selKat === k.key ? 'var(--blue)' : 'var(--tx3)', background: selKat === k.key ? 'rgba(59,130,246,.06)' : 'var(--surf2)' }}>
                    <div style={{ fontSize: 8, lineHeight: 1.3 }}>{k.label}</div>
                    {selKat === k.key && <span style={{ fontSize: 7 }}>↓</span>}
                  </th>
                ))}
                <th style={{ ...thS, position: 'sticky', right: 0, background: 'var(--surf2)', minWidth: 60 }}>Skor</th>
              </tr>
            </thead>
            <tbody>
              {markalar.map((m, i) => {
                const sc = scColor(m.score)
                return (
                  <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={tdS}><span style={{ color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)', fontSize: 9 }}>{i + 1}</span></td>
                    <td style={{ ...tdS, fontWeight: 600, fontSize: 11, color: SEGMENT_HEX[m.segment] || 'var(--tx)', whiteSpace: 'nowrap' }}>{m.marka}</td>
                    <td style={tdS}>
                      <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_COLORS[m.segment], padding: '1px 6px', borderRadius: 20, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${SEGMENT_COLORS[m.segment]}44`, whiteSpace: 'nowrap' }}>{m.segment}</span>
                    </td>
                    {KATS.map(k => {
                      const bazP = getKatVal(m.bazScore, k.key)
                      const cmpP = m.cmpScore2 ? getKatVal(m.cmpScore2, k.key) : null
                      const chg = chgPct(bazP, cmpP)
                      const sc2 = scColor(bazP)
                      const isAct = selKat === k.key
                      return (
                        <td key={k.key} onClick={() => setSelKat(k.key)}
                          style={{ ...tdS, textAlign: 'center', cursor: 'pointer', background: isAct ? 'rgba(59,130,246,.04)' : 'transparent', outline: isAct ? `2px solid var(--blue)33` : 'none', outlineOffset: -1 }}>
                          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, fontWeight: 700, color: sc2 }}>{bazP}</div>
                          {cmpP !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{cmpP}</span>
                              {chg !== null && <span style={{ fontSize: 7, fontWeight: 700, padding: '0 2px', borderRadius: 2, background: chgBg(chg), color: chgColor(chg) }}>{chg >= 0 ? '+' : ''}{chg}%</span>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ ...tdS, position: 'sticky', right: 0, background: 'var(--surf)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 4, height: 4, overflow: 'hidden', minWidth: 28 }}>
                          <div style={{ width: `${m.score}%`, height: 4, borderRadius: 4, background: sc }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, fontWeight: 700, color: sc, minWidth: 18, textAlign: 'right' }}>{m.score}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renk açıklaması */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {[{ c: '#10b981', bg: 'rgba(16,185,129,.15)', label: '≥100 puan' }, { c: '#f59e0b', bg: 'rgba(245,158,11,.12)', label: '90–100 puan' }, { c: '#ef4444', bg: 'rgba(239,68,68,.12)', label: '<90 puan' }].map(x => (
          <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx3)' }}>
            <div style={{ width: 12, height: 10, borderRadius: 3, background: x.bg, border: `1px solid ${x.c}` }} />{x.label}
          </div>
        ))}
        <span style={{ fontSize: 9, color: 'var(--tx3)', marginLeft: 8 }}>· Kategori sütununa tıklayarak sırala</span>
      </div>
    </>
  )
}

// ── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function KpilerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sekme, setSekme] = useState<'kpi' | 'kategori'>('kpi')

  const markalar = useMemo(() => getMarkaRanking(selSeg, selBolge, selYas, selDonem), [selSeg, selBolge, selYas, selDonem])
  const filterLabel = [selBolge || 'Tüm TR', selSeg || 'Tüm Seg.', selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y', selDonem || 'Tüm Dönem'].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem ? ' vs ' + selCmpDonem : ''}`} />
      <div className={styles.content}>

        {/* Sekme seçici */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([['kpi', 'KPI Bazlı'], ['kategori', 'Kategori Bazlı']] as const).map(([m, l]) => (
            <button key={m} onClick={() => setSekme(m)}
              style={{ padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${sekme === m ? 'var(--blue)' : 'var(--bd)'}`, background: sekme === m ? 'rgba(59,130,246,.1)' : 'var(--surf2)', color: sekme === m ? 'var(--blue)' : 'var(--tx2)' }}>
              {l}
            </button>
          ))}
        </div>

        {sekme === 'kpi' ? <KpiBazliTabKpi /> : <KategoriBazliTabKpi />}

      </div>
    </div>
  )
}
