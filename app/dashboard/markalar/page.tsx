'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG,
  fmtKpi, getKpisFromCube, getMarkaRanking, isLowerBetter,
  getKpiScores, getScore, scoreColor, scoreBg, kpiScoreColor, kpiScoreBg, chgColor, chgBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

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

const thS: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700,
  letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--tx3)',
  borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap'
}
const tdS: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--bd)' }

// ── Sekme 1: KPI Bazlı (mevcut içerik) ──────────────────────────────────────
function KpiBazliTab() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState<number | 'ov'>('ov')

  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s === selSeg).map(s => ({
      seg: s,
      bazScores: getKpiScores(s, selBolge, selYas, selDonem),
      cmpScores: selCmpDonem ? getKpiScores(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const markalar = useMemo(() => {
    const ranked = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []
    const base = ranked.map(m => ({
      ...m,
      bazKpiScores: getKpiScores(m.segment, selBolge, selYas, selDonem),
      cmpKpiScores: selCmpDonem ? getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null,
      cmpScore: cmpRanked.find(x => x.marka === m.marka)?.score ?? null,
      cmpRank: cmpRanked.findIndex(x => x.marka === m.marka) + 1,
    }))
    if (selKpi === 'ov') return base
    const lob = isLowerBetter(selKpi as number)
    return [...base].sort((a, b) => {
      const av = a.bazKpiScores[selKpi as number] ?? 0
      const bv = b.bazKpiScores[selKpi as number] ?? 0
      return lob ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, selKpi])

  const filterLabel = [selBolge || 'Tüm TR', selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y', selDonem || 'Tüm Dönem'].join(' · ')
  const activeMeta = selKpi !== 'ov' ? KPI_META[selKpi as number] : null
  const barBazData = markalar.map(m => selKpi === 'ov' ? m.score : m.bazKpiScores[selKpi as number])
  const barCmpData = selCmpDonem ? markalar.map(m => selKpi === 'ov' ? (m.cmpScore ?? 0) : (m.cmpKpiScores?.[selKpi as number] ?? 0)) : []
  const barMax = Math.max(...barBazData, ...barCmpData, 0.001)

  return (
    <>
      {/* Segment KPI Puan Matrisi */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segData.length},1fr)`, gap: 10, marginBottom: 14 }}>
        {segData.map(s => (
          <div key={s.seg} style={{ background: SEGMENT_BG[s.seg], border: `1px solid ${SEGMENT_COLORS[s.seg]}55`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${SEGMENT_COLORS[s.seg]}33` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENT_COLORS[s.seg] }}>{s.seg}</span>
              <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{filterLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
              {KPI_META.map((k, i) => {
                const bazP = s.bazScores[i]
                const cmpP = s.cmpScores?.[i] ?? null
                const chg = chgPct(bazP, cmpP)
                const isActive = selKpi === i
                return (
                  <div key={k.no} onClick={() => setSelKpi(i)}
                    style={{ background: isActive ? `${SEGMENT_HEX[s.seg]}33` : kpiScoreBg(bazP), border: `1px solid ${isActive ? SEGMENT_HEX[s.seg] + '88' : kpiScoreColor(bazP) + '44'}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ fontSize: 7, color: 'var(--tx3)', lineHeight: 1.3, marginBottom: 6, minHeight: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.ad}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div>
                        {selDonem && <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 1 }}>{selDonem}</div>}
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: kpiScoreColor(bazP), lineHeight: 1 }}>{bazP}</div>
                        <div style={{ fontSize: 7, color: 'var(--tx3)', marginTop: 1 }}>puan</div>
                      </div>
                      {cmpP !== null && (
                        <div style={{ paddingBottom: 3 }}>
                          {selCmpDonem && <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 1 }}>{selCmpDonem}</div>}
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1 }}>{cmpP}</div>
                        </div>
                      )}
                      {chg !== null && (
                        <div style={{ paddingBottom: 4, marginLeft: 'auto' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: chgColor(chg) }}>{chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg)}%</div>
                        </div>
                      )}
                    </div>
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
          <h3>{selKpi === 'ov' ? 'Genel Skor — Marka Karşılaştırması' : `${activeMeta?.ad} — Puan Karşılaştırması`}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setSelKpi('ov')}
              style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${selKpi === 'ov' ? 'var(--blue)' : 'var(--bd)'}`, background: selKpi === 'ov' ? 'rgba(59,130,246,.12)' : 'var(--surf2)', color: selKpi === 'ov' ? 'var(--blue)' : 'var(--tx2)' }}>
              Genel Skor
            </button>
            <span className={styles.hint}>{filterLabel}{selCmpDonem ? ` vs ${selCmpDonem}` : ''}</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: markalar.length * 52, height: 260 }}>
            <Bar data={{
              labels: markalar.map(m => m.marka),
              datasets: [
                { label: selDonem || 'Baz Dönem', data: barBazData, backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '22'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 2, borderRadius: 5 },
                ...(selCmpDonem ? [{ label: selCmpDonem, data: barCmpData, backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '66'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 1, borderRadius: 5 }] : [])
              ]
            }} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: !!selCmpDonem, position: 'top', labels: { color: '#8496b0', font: { size: 10 }, boxWidth: 12 } },
                tooltip: { callbacks: { title: (items) => { const m = markalar[items[0].dataIndex]; return `${m.marka} (${m.segment})` }, label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} puan` } }
              },
              scales: {
                y: { min: selKpi === 'ov' ? 40 : 0, max: selKpi === 'ov' ? 105 : barMax * 1.2, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8496b0', font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { color: '#8496b0', font: { size: 8 }, maxRotation: 45, autoSkip: false } }
              }
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--bd)', flexWrap: 'wrap' }}>
          {['Mass', 'Premium', 'EV'].filter(s => !selSeg || s === selSeg).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx3)' }}>
              <div style={{ width: 12, height: 10, borderRadius: 2, background: SEGMENT_HEX[s] + '44', border: `1px solid ${SEGMENT_HEX[s]}` }} />{s}
            </div>
          ))}
        </div>
      </div>

      {/* Marka Puan Tablosu */}
      <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 490, position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--surf2)', position: 'sticky', top: 0, zIndex: 3 }}>
                <th style={thS}>#</th>
                <th style={thS}>Marka</th>
                <th style={thS}>Seg.</th>
                {KPI_META.map((k, i) => (
                  <th key={i} onClick={() => setSelKpi(i)}
                    style={{ ...thS, cursor: 'pointer', minWidth: 68, textAlign: 'center', color: selKpi === i ? 'var(--blue)' : 'var(--tx3)', background: selKpi === i ? 'rgba(59,130,246,.06)' : 'var(--surf2)' }}>
                    <div style={{ fontSize: 8, lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'break-word' }}>{k.ad}</div>
                    {selKpi === i && <span style={{ fontSize: 7 }}>↓</span>}
                  </th>
                ))}
                <th onClick={() => setSelKpi('ov')}
                  style={{ ...thS, cursor: 'pointer', minWidth: 80, position: 'sticky', right: selCmpDonem ? 60 : 0, color: selKpi === 'ov' ? 'var(--blue)' : 'var(--tx3)', background: selKpi === 'ov' ? 'rgba(59,130,246,.08)' : 'var(--surf2)' }}>
                  Skor{selKpi === 'ov' ? ' ↓' : ''}
                  {selCmpDonem && <div style={{ fontSize: 7, fontWeight: 400, color: 'var(--tx3)' }}>{selCmpDonem}</div>}
                </th>
                {selCmpDonem && <th style={{ ...thS, position: 'sticky', right: 0, background: 'var(--surf2)' }}>Δ Sıra</th>}
              </tr>
            </thead>
            <tbody>
              {markalar.map((m, i) => {
                const rankDiff = m.cmpRank > 0 ? m.cmpRank - (i + 1) : null
                const scoreDiff = m.cmpScore !== null ? m.score - m.cmpScore : null
                const sc = scColor(m.score)
                return (
                  <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={tdS}><span style={{ color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)', fontSize: 9 }}>{i + 1}</span></td>
                    <td style={{ ...tdS, fontWeight: 600, fontSize: 11, color: SEGMENT_HEX[m.segment] || 'var(--tx)', whiteSpace: 'nowrap' }}>{m.marka}</td>
                    <td style={tdS}>
                      <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_COLORS[m.segment], padding: '1px 6px', borderRadius: 20, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${SEGMENT_COLORS[m.segment]}44`, whiteSpace: 'nowrap' }}>{m.segment}</span>
                    </td>
                    {m.bazKpiScores.map((bazP, ki) => {
                      const cmpP = m.cmpKpiScores?.[ki] ?? null
                      const chg = chgPct(bazP, cmpP)
                      const isAct = selKpi === ki
                      return (
                        <td key={ki} onClick={() => setSelKpi(ki)}
                          style={{ ...tdS, textAlign: 'center', background: kpiScoreBg(bazP), cursor: 'pointer', outline: isAct ? `2px solid ${kpiScoreColor(bazP)}66` : 'none', outlineOffset: -1 }}>
                          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, fontWeight: 700, color: kpiScoreColor(bazP) }}>{bazP}</div>
                          {cmpP !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{cmpP}</span>
                              {chg !== null && <span style={{ fontSize: 7, fontWeight: 700, padding: '0 2px', borderRadius: 2, background: chgBg(chg), color: chgColor(chg) }}>{chg >= 0 ? '+' : ''}{chg}%</span>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ ...tdS, position: 'sticky', right: selCmpDonem ? 60 : 0, background: 'var(--surf)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 4, height: 4, overflow: 'hidden', minWidth: 32 }}>
                          <div style={{ width: `${m.score}%`, height: 4, borderRadius: 4, background: sc }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, fontWeight: 700, color: sc, minWidth: 20, textAlign: 'right' }}>{m.score}</span>
                        {selCmpDonem && m.cmpScore !== null && (
                          <span style={{ fontSize: 9, fontWeight: 600, color: scoreDiff !== null && scoreDiff > 0 ? '#10b981' : scoreDiff !== null && scoreDiff < 0 ? '#f87171' : 'var(--tx3)' }}>
                            {scoreDiff !== null && scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                          </span>
                        )}
                      </div>
                    </td>
                    {selCmpDonem && (
                      <td style={{ ...tdS, fontFamily: 'var(--font-dm-mono)', fontSize: 10, fontWeight: 700, textAlign: 'center', position: 'sticky', right: 0, background: 'var(--surf)', color: rankDiff === null ? 'var(--tx3)' : rankDiff > 0 ? '#10b981' : rankDiff < 0 ? '#f87171' : 'var(--tx3)' }}>
                        {rankDiff === null ? '—' : rankDiff > 0 ? `▲${rankDiff}` : rankDiff < 0 ? `▼${Math.abs(rankDiff)}` : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Açıklama */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {[{ c: '#10b981', bg: 'rgba(16,185,129,.15)', label: '≥100 puan' }, { c: '#f59e0b', bg: 'rgba(245,158,11,.12)', label: '90–100 puan' }, { c: '#ef4444', bg: 'rgba(239,68,68,.12)', label: '<90 puan' }].map(x => (
          <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx3)' }}>
            <div style={{ width: 12, height: 10, borderRadius: 3, background: x.bg, border: `1px solid ${x.c}` }} />{x.label}
          </div>
        ))}
        <span style={{ fontSize: 9, color: 'var(--tx3)', marginLeft: 8 }}>· KPI kutusuna veya sütun başlığına tıklayarak sırala</span>
      </div>
    </>
  )
}

// ── Sekme 2: Kategori Bazlı ──────────────────────────────────────────────────
function KategoriBazliTabMarkalar() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKat, setSelKat] = useState('genel')

  const filterLabel = [selBolge || 'Tüm TR', selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y', selDonem || 'Tüm Dönem'].join(' · ')

  // Segment kategori skorları
  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s === selSeg).map(s => ({
      seg: s,
      bazScore: getScore(s, selBolge, selYas, selDonem),
      cmpScore: selCmpDonem ? getScore(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  // Marka sıralaması — genel skora göre sırala (kategori bazlı marka skoru veri modelinde yok)
  // Her marka kendi segmentinin kategori skorunu gösterir; sıralama genel skora göre yapılır
  const markalar = useMemo(() => {
    const ranked = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []
    return ranked.map(m => {
      const bazScore = getScore(m.segment, selBolge, selYas, selDonem)
      const cmpScore2 = selCmpDonem ? getScore(m.segment, selBolge, selYas, selCmpDonem) : null
      const cmpM = cmpRanked.find(x => x.marka === m.marka)
      return {
        ...m,
        bazScore,
        cmpScore2,
        cmpOverallScore: cmpM?.score ?? null,
        cmpRank: cmpRanked.findIndex(x => x.marka === m.marka) + 1,
      }
    }).sort((a, b) => {
      // Seçili kategoriye göre segment skoruyla sırala
      const av = getKatVal(a.bazScore, selKat)
      const bv = getKatVal(b.bazScore, selKat)
      if (bv !== av) return bv - av
      // Eşit ise genel skora göre sırala
      return b.score - a.score
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, selKat])

  // Bar grafik
  const barBazData = markalar.map(m => getKatVal(m.bazScore, selKat))
  const barCmpData = selCmpDonem ? markalar.map(m => getKatVal(m.cmpScore2, selKat)) : []
  const barMax = Math.max(...barBazData, ...barCmpData, 0.001)

  return (
    <>
      {/* Segment Kategori Skor Matrisi */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segData.length},1fr)`, gap: 10, marginBottom: 14 }}>
        {segData.map(s => (
          <div key={s.seg} style={{ background: SEGMENT_BG[s.seg], border: `1px solid ${SEGMENT_COLORS[s.seg]}55`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${SEGMENT_COLORS[s.seg]}33` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENT_COLORS[s.seg] }}>{s.seg}</span>
              <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{filterLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
              {KATS.map(k => {
                const bazP = getKatVal(s.bazScore, k.key)
                const cmpP = s.cmpScore ? getKatVal(s.cmpScore, k.key) : null
                const chg = chgPct(bazP, cmpP)
                const isActive = selKat === k.key
                const sc = scColor(bazP)
                return (
                  <div key={k.key} onClick={() => setSelKat(k.key)}
                    style={{ background: isActive ? `${SEGMENT_HEX[s.seg]}33` : 'rgba(0,0,0,.12)', border: `1px solid ${isActive ? SEGMENT_HEX[s.seg] + '88' : 'transparent'}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ fontSize: 7, color: isActive ? SEGMENT_COLORS[s.seg] : 'var(--tx3)', lineHeight: 1.3, marginBottom: 6, minHeight: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.label}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div>
                        {selDonem && <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 1 }}>{selDonem}</div>}
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: sc, lineHeight: 1 }}>{bazP}</div>
                        <div style={{ fontSize: 7, color: 'var(--tx3)', marginTop: 1 }}>puan</div>
                      </div>
                      {cmpP !== null && (
                        <div style={{ paddingBottom: 3 }}>
                          {selCmpDonem && <div style={{ fontSize: 7, color: 'var(--tx3)', marginBottom: 1 }}>{selCmpDonem}</div>}
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1 }}>{cmpP}</div>
                        </div>
                      )}
                      {chg !== null && (
                        <div style={{ paddingBottom: 4, marginLeft: 'auto' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: chgColor(chg) }}>{chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg)}%</div>
                        </div>
                      )}
                    </div>
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
          <h3>{KATS.find(k => k.key === selKat)?.label || 'Genel'} Skoru — Marka Karşılaştırması</h3>
          <span className={styles.hint}>{filterLabel}{selCmpDonem ? ` vs ${selCmpDonem}` : ''}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: markalar.length * 52, height: 260 }}>
            <Bar data={{
              labels: markalar.map(m => m.marka),
              datasets: [
                { label: selDonem || 'Baz Dönem', data: barBazData, backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '22'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 2, borderRadius: 5 },
                ...(selCmpDonem ? [{ label: selCmpDonem, data: barCmpData, backgroundColor: markalar.map(m => SEGMENT_HEX[m.segment] + '66'), borderColor: markalar.map(m => SEGMENT_HEX[m.segment]), borderWidth: 1, borderRadius: 5 }] : [])
              ]
            }} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: !!selCmpDonem, position: 'top', labels: { color: '#8496b0', font: { size: 10 }, boxWidth: 12 } },
                tooltip: { callbacks: { title: (items) => { const m = markalar[items[0].dataIndex]; return `${m.marka} (${m.segment})` }, label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} puan` } }
              },
              scales: {
                y: { min: 0, max: barMax * 1.2, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8496b0', font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { color: '#8496b0', font: { size: 8 }, maxRotation: 45, autoSkip: false } }
              }
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--bd)', flexWrap: 'wrap' }}>
          {['Mass', 'Premium', 'EV'].filter(s => !selSeg || s === selSeg).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx3)' }}>
              <div style={{ width: 12, height: 10, borderRadius: 2, background: SEGMENT_HEX[s] + '44', border: `1px solid ${SEGMENT_HEX[s]}` }} />{s}
            </div>
          ))}
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
                <th style={{ ...thS, position: 'sticky', right: selCmpDonem ? 60 : 0, background: 'var(--surf2)', minWidth: 80 }}>
                  Genel Skor
                  {selCmpDonem && <div style={{ fontSize: 7, fontWeight: 400, color: 'var(--tx3)' }}>{selCmpDonem}</div>}
                </th>
                {selCmpDonem && <th style={{ ...thS, position: 'sticky', right: 0, background: 'var(--surf2)', minWidth: 50 }}>Δ Sıra</th>}
              </tr>
            </thead>
            <tbody>
              {markalar.map((m, i) => {
                const rankDiff = m.cmpRank > 0 ? m.cmpRank - (i + 1) : null
                const scoreDiff = m.cmpOverallScore !== null ? m.score - m.cmpOverallScore : null
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
                          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, fontWeight: 700, color: sc2 }}>{bazP}</div>
                          {cmpP !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{cmpP}</span>
                              {chg !== null && <span style={{ fontSize: 7, fontWeight: 700, padding: '0 2px', borderRadius: 2, background: chgBg(chg), color: chgColor(chg) }}>{chg >= 0 ? '+' : ''}{chg}%</span>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    {/* Genel Skor sticky sütun */}
                    <td style={{ ...tdS, position: 'sticky', right: selCmpDonem ? 60 : 0, background: 'var(--surf)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 4, height: 4, overflow: 'hidden', minWidth: 32 }}>
                          <div style={{ width: `${m.score}%`, height: 4, borderRadius: 4, background: sc }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, fontWeight: 700, color: sc, minWidth: 20, textAlign: 'right' }}>{m.score}</span>
                        {selCmpDonem && m.cmpOverallScore !== null && (
                          <span style={{ fontSize: 9, fontWeight: 600, color: scoreDiff !== null && scoreDiff > 0 ? '#10b981' : scoreDiff !== null && scoreDiff < 0 ? '#f87171' : 'var(--tx3)' }}>
                            {scoreDiff !== null && scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                          </span>
                        )}
                      </div>
                    </td>
                    {selCmpDonem && (
                      <td style={{ ...tdS, fontFamily: 'var(--font-dm-mono)', fontSize: 10, fontWeight: 700, textAlign: 'center', position: 'sticky', right: 0, background: 'var(--surf)', color: rankDiff === null ? 'var(--tx3)' : rankDiff > 0 ? '#10b981' : rankDiff < 0 ? '#f87171' : 'var(--tx3)' }}>
                        {rankDiff === null ? '—' : rankDiff > 0 ? `▲${rankDiff}` : rankDiff < 0 ? `▼${Math.abs(rankDiff)}` : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Açıklama */}
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
export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sekme, setSekme] = useState<'kpi' | 'kategori'>('kpi')

  const markalar = useMemo(() => getMarkaRanking(selSeg, selBolge, selYas, selDonem), [selSeg, selBolge, selYas, selDonem])
  const filterLabel = [selBolge || 'Tüm TR', selYas === 'Tümü' ? 'Tüm Yaş' : selYas + 'y', selDonem || 'Tüm Dönem'].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
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

        {sekme === 'kpi' ? <KpiBazliTab /> : <KategoriBazliTabMarkalar />}

      </div>
    </div>
  )
}
