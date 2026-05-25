'use client'

import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG, SEGMENT_COLORS,
  CAT_COLORS, KAT_YAPILAR,
  getKpiScores, getScore, getMarkaRanking,
  kpiScoreColor, kpiScoreBg, scoreColor, scoreBg,
  changePct, chgColor, chgBg, isLowerBetter,
} from '@/lib/kpi'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type TabTip = 'kpi' | 'kategori'
type SortKpi = number | -1

const fmt0 = (v: number) => Math.round(v).toString()
const chgPct = (baz: number, cmp: number | null) => changePct(baz, cmp)

// Bar üstüne değer yazan inline plugin
const barValuePlugin = {
  id: 'barValueLabels',
  afterDatasetsDraw(chart: ChartJS) {
    const ctx = chart.ctx
    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      meta.data.forEach((bar, idx) => {
        const val = dataset.data[idx] as number
        if (!val) return
        ctx.save()
        ctx.font = '700 9px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = val >= 77 ? '#10b981' : val >= 66 ? '#3b82f6' : '#ef4444'
        ctx.fillText(Math.round(val).toString(), bar.x, bar.y - 3)
        ctx.restore()
      })
    })
  },
}

// Baz ortalı, cmp altında ortalı
function SkorHucre({ skor, cmpSkor, size = 'md' }: {
  skor: number; cmpSkor?: number | null; size?: 'sm' | 'md' | 'lg'
}) {
  const delta = cmpSkor != null ? chgPct(skor, cmpSkor) : null
  const bazFs = size === 'lg' ? 20 : size === 'sm' ? 13 : 16
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: bazFs, fontWeight: 900, color: kpiScoreColor(skor), fontFamily: 'var(--font-dm-mono)', lineHeight: 1 }}>
        {fmt0(skor)}
      </span>
      {cmpSkor != null && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{fmt0(cmpSkor)}</span>
          {delta != null && (
            <span style={{ fontSize: 8, fontWeight: 700, color: chgColor(delta) }}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'}{Math.abs(delta)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [tab, setTab]           = useState<TabTip>('kpi')
  const [sortKpi, setSortKpi]   = useState<SortKpi>(-1)
  const [katSortKey, setKatSortKey] = useState<string>('genel')

  const filterLabel = [
    selBolge || 'Tüm TR',
    selYas === 'Tümü' ? 'Tüm Yaş' : selYas + ' yaş',
    selDonem || 'Tüm Dönem',
  ].join(' · ')

  // ── KPI bazlı marka listesi ───────────────────────────────
  const markalar = useMemo(() => {
    const ranked    = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []
    return ranked.map(m => ({
      ...m,
      bazSkorlar: getKpiScores(m.segment, selBolge, selYas, selDonem),
      cmpSkorlar: selCmpDonem ? getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null,
      cmpScore:   cmpRanked.find(x => x.marka === m.marka)?.score ?? null,
    })).sort((a, b) => {
      if (sortKpi === -1) return b.score - a.score
      const av = a.bazSkorlar[sortKpi] ?? 0
      const bv = b.bazSkorlar[sortKpi] ?? 0
      return isLowerBetter(sortKpi) ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, sortKpi])

  // ── Kategori bazlı marka listesi ─────────────────────────
  const katMarkalar = useMemo(() => {
    const ranked    = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []
    return ranked.map(m => ({
      ...m,
      katSkor:    getScore(m.segment, selBolge, selYas, selDonem),
      katSkorCmp: selCmpDonem ? getScore(m.segment, selBolge, selYas, selCmpDonem) : null,
      cmpScore:   cmpRanked.find(x => x.marka === m.marka)?.score ?? null,
    })).sort((a, b) => {
      const av = katSortKey === 'genel' ? a.score : (a.katSkor as any)?.[katSortKey] ?? 0
      const bv = katSortKey === 'genel' ? b.score : (b.katSkor as any)?.[katSortKey] ?? 0
      return bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, katSortKey])

  // ── KPI Bar grafik verisi ─────────────────────────────────
  const barData = useMemo(() => {
    const vals   = markalar.map(m => sortKpi === -1 ? m.score : (m.bazSkorlar[sortKpi] ?? 0))
    const colors = vals.map(v => kpiScoreColor(v))
    const cmpVals = selCmpDonem ? markalar.map(m => sortKpi === -1 ? (m.cmpScore ?? 0) : (m.cmpSkorlar?.[sortKpi] ?? 0)) : null
    return {
      labels: markalar.map(m => m.marka),
      datasets: [
        { label: sortKpi === -1 ? 'Genel Skor' : KPI_META[sortKpi]?.ad, data: vals, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 1, borderRadius: 4 },
        ...(cmpVals ? [{ label: 'Önceki Dönem', data: cmpVals, backgroundColor: 'rgba(100,116,139,.3)', borderColor: 'rgba(100,116,139,.6)', borderWidth: 1, borderRadius: 4 }] : []),
      ],
    }
  }, [markalar, sortKpi, selCmpDonem])

  // ── Kategori Bar grafik verisi ────────────────────────────
  const katBarData = useMemo(() => {
    const vals   = katMarkalar.map(m => katSortKey === 'genel' ? m.score : (m.katSkor as any)?.[katSortKey] ?? 0)
    const colors = vals.map(v => kpiScoreColor(v))
    const cmpVals = selCmpDonem ? katMarkalar.map(m => katSortKey === 'genel' ? (m.cmpScore ?? 0) : (m.katSkorCmp as any)?.[katSortKey] ?? 0) : null
    return {
      labels: katMarkalar.map(m => m.marka),
      datasets: [
        { label: katSortKey === 'genel' ? 'Genel Skor' : KAT_YAPILAR.find(k => k.key === katSortKey)?.ad ?? katSortKey, data: vals, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 1, borderRadius: 4 },
        ...(cmpVals ? [{ label: 'Önceki Dönem', data: cmpVals, backgroundColor: 'rgba(100,116,139,.3)', borderColor: 'rgba(100,116,139,.6)', borderWidth: 1, borderRadius: 4 }] : []),
      ],
    }
  }, [katMarkalar, katSortKey, selCmpDonem])

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 18 } },
    plugins: {
      legend: { display: !!selCmpDonem, labels: { color: '#8496b0', font: { size: 10 } } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${Math.round(ctx.parsed.y)} puan` } },
    },
    scales: {
      x: { ticks: { color: '#8496b0', font: { size: 9 }, maxRotation: 35 }, grid: { color: 'rgba(132,150,176,.08)' } },
      y: { min: 0, ticks: { color: '#8496b0', font: { size: 9 } }, grid: { color: 'rgba(132,150,176,.08)' } },
    },
  } as const

  const thS: React.CSSProperties = {
    padding: '8px 10px', fontSize: 9, fontWeight: 700, color: 'var(--tx3)',
    borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap',
    textAlign: 'center', cursor: 'pointer', userSelect: 'none',
  }
  const tdS: React.CSSProperties = {
    padding: '6px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'center',
  }

  // Kaydırmalı tablo wrapper style helper
  function scrollWrap(n: number): React.CSSProperties {
    return { overflowX: 'auto', overflowY: 'hidden', transition: 'max-height .3s ease', maxHeight: `${Math.min(n, 15) * 36 + 40}px` }
  }

  const aktifAd = sortKpi === -1 ? 'Genel Skor' : KPI_META[sortKpi]?.ad + (isLowerBetter(sortKpi) ? ' ↓' : '')

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem ? ' vs ' + selCmpDonem : ''}`} />
      <div className={styles.content}>

        {/* Sekme seçici */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([['kpi', 'KPI Bazlı'], ['kategori', 'Kategori Bazlı']] as [TabTip, string][]).map(([t, lbl]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${tab === t ? 'var(--blue)' : 'var(--bd)'}`,
              background: tab === t ? 'rgba(59,130,246,.12)' : 'var(--surf)',
              color: tab === t ? 'var(--blue)' : 'var(--tx2)',
            }}>{lbl}</button>
          ))}
        </div>

        {/* ══ KPI Bazlı ══════════════════════════════════════ */}
        {tab === 'kpi' && (
          <div>
            {/* Bar Grafik */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>Marka Karşılaştırma</span>
                  <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 600, color: sortKpi === -1 ? '#f59e0b' : 'var(--blue)', background: sortKpi === -1 ? 'rgba(245,158,11,.1)' : 'rgba(59,130,246,.1)', padding: '2px 8px', borderRadius: 20 }}>
                    {aktifAd}
                  </span>
                </div>
                <button onClick={() => setSortKpi(-1)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${sortKpi === -1 ? '#f59e0b' : 'var(--bd)'}`,
                  background: sortKpi === -1 ? 'rgba(245,158,11,.12)' : 'var(--surf2)',
                  color: sortKpi === -1 ? '#f59e0b' : 'var(--tx3)',
                }}>★ Genel Skor</button>
              </div>
              <div style={{ height: 240 }}>
                <Bar data={barData} options={barOptions} plugins={[barValuePlugin]} />
              </div>
            </div>

            {/* Marka Tablosu */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
              <div
                style={scrollWrap(markalar.length)}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'auto'; el.style.maxHeight = '520px' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'hidden'; el.style.maxHeight = `${Math.min(markalar.length, 15) * 36 + 40}px` }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surf2)' }}>
                    <tr>
                      <th style={{ ...thS, textAlign: 'left', minWidth: 130, position: 'sticky', left: 0, background: 'var(--surf2)', zIndex: 3 }}>Marka</th>
                      <th style={{ ...thS, minWidth: 72, position: 'sticky', left: 130, background: 'var(--surf2)', zIndex: 3 }}>Seg.</th>
                      {KPI_META.map((k, i) => (
                        <th key={i} onClick={() => setSortKpi(i)}
                          title={k.ad + (k.is_lower_better ? ' (küçükse iyi ↓)' : '')}
                          style={{ ...thS, color: sortKpi === i ? 'var(--blue)' : 'var(--tx3)', background: sortKpi === i ? 'rgba(59,130,246,.08)' : 'var(--surf2)', minWidth: 110, whiteSpace: 'normal', lineHeight: 1.3, verticalAlign: 'bottom', paddingBottom: 6 }}>
                          {k.ad}{k.is_lower_better ? ' ↓' : ''}{sortKpi === i ? ' ▾' : ''}
                        </th>
                      ))}
                      <th onClick={() => setSortKpi(-1)} style={{ ...thS, minWidth: 80, color: sortKpi === -1 ? '#f59e0b' : 'var(--tx3)', background: sortKpi === -1 ? 'rgba(245,158,11,.08)' : 'var(--surf2)', borderLeft: '2px solid var(--bd)' }}>
                        Genel{selCmpDonem ? ' / Önceki' : ''}{sortKpi === -1 ? ' ▾' : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {markalar.map(m => (
                      <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ ...tdS, textAlign: 'left', fontWeight: 700, color: SEGMENT_HEX[m.segment], position: 'sticky', left: 0, background: 'var(--surf)', zIndex: 1 }}>{m.marka}</td>
                        <td style={{ ...tdS, position: 'sticky', left: 130, background: 'var(--surf)', zIndex: 1 }}>
                          <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_HEX[m.segment], padding: '2px 7px', borderRadius: 20, fontSize: 8, fontWeight: 700, border: `1px solid ${SEGMENT_HEX[m.segment]}44` }}>{m.segment}</span>
                        </td>
                        {m.bazSkorlar.map((skor, ki) => (
                          <td key={ki} style={{ ...tdS, background: sortKpi === ki ? kpiScoreBg(skor) : undefined }}>
                            <SkorHucre skor={skor} cmpSkor={selCmpDonem ? (m.cmpSkorlar?.[ki] ?? null) : null} size="sm" />
                          </td>
                        ))}
                        <td style={{ ...tdS, background: sortKpi === -1 ? scoreBg(m.score) : undefined, borderLeft: '2px solid var(--bd)' }}>
                          <SkorHucre skor={m.score} cmpSkor={selCmpDonem ? m.cmpScore : null} size="sm" />
                        </td>
                      </tr>
                    ))}
                    {markalar.length === 0 && (
                      <tr><td colSpan={3 + KPI_META.length} style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>Veri bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '6px 14px', fontSize: 9, color: 'var(--tx3)', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
                {markalar.length} marka · tablonun üzerine gelin ve aşağı kaydırın
              </div>
            </div>
          </div>
        )}

        {/* ══ Kategori Bazlı ════════════════════════════════ */}
        {tab === 'kategori' && (
          <div>
            {/* Bar Grafik */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>Marka Karşılaştırma</span>
                  <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 600, color: katSortKey === 'genel' ? '#f59e0b' : 'var(--blue)', background: katSortKey === 'genel' ? 'rgba(245,158,11,.1)' : 'rgba(59,130,246,.1)', padding: '2px 8px', borderRadius: 20 }}>
                    {katSortKey === 'genel' ? 'Genel Skor' : KAT_YAPILAR.find(k => k.key === katSortKey)?.ad}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => setKatSortKey('genel')} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: `1px solid ${katSortKey === 'genel' ? '#f59e0b' : 'var(--bd)'}`, background: katSortKey === 'genel' ? 'rgba(245,158,11,.12)' : 'var(--surf2)', color: katSortKey === 'genel' ? '#f59e0b' : 'var(--tx3)' }}>★ Genel</button>
                  {KAT_YAPILAR.map(kat => (
                    <button key={kat.key} onClick={() => setKatSortKey(kat.key)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: `1px solid ${katSortKey === kat.key ? 'var(--blue)' : 'var(--bd)'}`, background: katSortKey === kat.key ? 'rgba(59,130,246,.12)' : 'var(--surf2)', color: katSortKey === kat.key ? 'var(--blue)' : 'var(--tx3)' }}>
                      {kat.ad.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 240 }}>
                <Bar data={katBarData} options={barOptions} plugins={[barValuePlugin]} />
              </div>
            </div>

            {/* Kategori Marka Tablosu */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
              <div
                style={scrollWrap(katMarkalar.length)}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'auto'; el.style.maxHeight = '520px' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'hidden'; el.style.maxHeight = `${Math.min(katMarkalar.length, 15) * 36 + 40}px` }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surf2)' }}>
                    <tr>
                      <th style={{ ...thS, textAlign: 'left', minWidth: 130, position: 'sticky', left: 0, background: 'var(--surf2)', zIndex: 3 }}>Marka</th>
                      <th style={{ ...thS, minWidth: 72, position: 'sticky', left: 130, background: 'var(--surf2)', zIndex: 3 }}>Seg.</th>
                      {KAT_YAPILAR.map(kat => (
                        <th key={kat.key} onClick={() => setKatSortKey(kat.key)}
                          style={{ ...thS, minWidth: 90, color: katSortKey === kat.key ? 'var(--blue)' : 'var(--tx3)', background: katSortKey === kat.key ? 'rgba(59,130,246,.08)' : 'var(--surf2)', whiteSpace: 'normal', lineHeight: 1.3, verticalAlign: 'bottom', paddingBottom: 6 }}>
                          {kat.ad}{katSortKey === kat.key ? ' ▾' : ''}
                        </th>
                      ))}
                      <th onClick={() => setKatSortKey('genel')} style={{ ...thS, minWidth: 80, color: katSortKey === 'genel' ? '#f59e0b' : 'var(--tx3)', background: katSortKey === 'genel' ? 'rgba(245,158,11,.08)' : 'var(--surf2)', borderLeft: '2px solid var(--bd)' }}>
                        Genel{selCmpDonem ? ' / Önceki' : ''}{katSortKey === 'genel' ? ' ▾' : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {katMarkalar.map(m => (
                      <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ ...tdS, textAlign: 'left', fontWeight: 700, color: SEGMENT_HEX[m.segment], position: 'sticky', left: 0, background: 'var(--surf)', zIndex: 1 }}>{m.marka}</td>
                        <td style={{ ...tdS, position: 'sticky', left: 130, background: 'var(--surf)', zIndex: 1 }}>
                          <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_HEX[m.segment], padding: '2px 7px', borderRadius: 20, fontSize: 8, fontWeight: 700, border: `1px solid ${SEGMENT_HEX[m.segment]}44` }}>{m.segment}</span>
                        </td>
                        {KAT_YAPILAR.map(kat => {
                          const skor    = m.katSkor    ? (m.katSkor    as any)[kat.key] ?? 0 : 0
                          const cmpSkor = m.katSkorCmp ? (m.katSkorCmp as any)[kat.key] ?? null : null
                          return (
                            <td key={kat.key} style={{ ...tdS, background: katSortKey === kat.key ? kpiScoreBg(skor) : undefined }}>
                              <SkorHucre skor={skor} cmpSkor={selCmpDonem ? cmpSkor : null} size="sm" />
                            </td>
                          )
                        })}
                        <td style={{ ...tdS, background: katSortKey === 'genel' ? scoreBg(m.score) : undefined, borderLeft: '2px solid var(--bd)' }}>
                          <SkorHucre skor={m.score} cmpSkor={selCmpDonem ? m.cmpScore : null} size="sm" />
                        </td>
                      </tr>
                    ))}
                    {katMarkalar.length === 0 && (
                      <tr><td colSpan={2 + KAT_YAPILAR.length + 1} style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>Veri bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '6px 14px', fontSize: 9, color: 'var(--tx3)', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
                {katMarkalar.length} marka · tablonun üzerine gelin ve aşağı kaydırın
              </div>
            </div>
          </div>
        )}

        {/* Renk efsanesi */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 10, color: 'var(--tx3)' }}>
          {[['#10b981', '≥ 77 puan: TR Ortalamasının Üzerinde'], ['#3b82f6', '66-77 puan: TR Ortalamasına Yakın'], ['#ef4444', '< 66 puan: TR Ortalamasının Altında']].map(([c, lbl]) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
              <span>{lbl}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
