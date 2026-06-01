'use client'

import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENT_HEX, SEGMENT_BG, KAT_YAPILAR,
  getKpiScores, getKpiScoresFullDetail, getScore, getMarkaRanking,
  kpiScoreColor, kpiScoreBg, scoreColor, scoreBg,
  changePct, chgColor, isLowerBetter,
} from '@/lib/kpi'
import { GeneralScoreMethodology, CategoryScoreMethodology, KpiMethodologyTooltip } from '@/components/dashboard/MethodologyTooltip'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const barValuePlugin = {
  id: 'barValueLabels',
  afterDatasetsDraw(chart: ChartJS) {
    const ctx = chart.ctx
    const barCount = chart.data.labels ? chart.data.labels.length : 0
    // Dinamik font boyutu — cok barda kucuk yaz, cok kalabaliksa gizle
    const fontSize = barCount <= 10 ? 11 : barCount <= 20 ? 9 : barCount <= 35 ? 7 : 0
    if (!fontSize) return
    chart.data.datasets.forEach(function(dataset, di) {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      const isPrev = di > 0  // ikinci dataset = onceki donem
      meta.data.forEach(function(bar, idx) {
        const val = dataset.data[idx] as number
        if (!val && val !== 0) return
        const rounded = Math.round(val)
        // Bar rengiyle ayni renk
        const color = isPrev
          ? 'rgba(100,116,139,.85)'
          : rounded >= 77 ? '#10b981'
          : rounded >= 66 ? '#3b82f6'
          : '#ef4444'
        ctx.save()
        ctx.font = 'bold ' + String(fontSize) + 'px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = color
        // Bar'in tam ustune yaz
        ctx.fillText(String(rounded), bar.x, bar.y - 3)
        ctx.restore()
      })
    })
  },
}

function SkorHucre(props: { skor: number; cmpSkor?: number | null; size?: string }) {
  const skor = props.skor
  const cmpSkor = props.cmpSkor
  const size = props.size || 'md'
  const delta = cmpSkor != null ? changePct(skor, cmpSkor) : null
  const bazFs = size === 'lg' ? 20 : size === 'sm' ? 13 : 16
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: bazFs, fontWeight: 900, color: kpiScoreColor(skor), fontFamily: 'var(--font-dm-mono)', lineHeight: 1 }}>
        {String(Math.round(skor))}
      </span>
      {cmpSkor != null && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{String(Math.round(cmpSkor))}</span>
          {delta != null && (
            <span style={{ fontSize: 8, fontWeight: 700, color: chgColor(delta) }}>
              {delta > 0 ? String('\u25b2') : delta < 0 ? String('\u25bc') : '\u2192'}{Math.abs(delta)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function KpiDetayPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [tab, setTab]             = useState('kpi')
  const [sortKpi, setSortKpi]     = useState(-1)
  const [katSortKey, setKatSortKey] = useState('genel')

  const filterLabel = [
    selBolge || 'Tum TR',
    selYas === 'Tumu' ? 'Tum Yas' : selYas + ' yas',
    selDonem || 'Tum Donem',
  ].join(' - ')

  const segData = useMemo(() => {
    const segs = ['Mass', 'Premium', 'EV'].filter(function(s) { return !selSeg || s === selSeg })
    return segs.map(function(s) {
      return {
        seg: s,
        kpiSkorlar:    getKpiScores(s, selBolge, selYas, selDonem),
        kpiDetaylar:   getKpiScoresFullDetail(s, selBolge, selYas, selDonem),
        kpiSkorlarCmp: selCmpDonem ? getKpiScores(s, selBolge, selYas, selCmpDonem) : null,
        katSkor:       getScore(s, selBolge, selYas, selDonem),
        katSkorCmp:    selCmpDonem ? getScore(s, selBolge, selYas, selCmpDonem) : null,
      }
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const katMarkalar = useMemo(function() {
    const ranked    = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []
    return ranked.map(function(m) {
      return {
        marka:      m.marka,
        segment:    m.segment,
        score:      m.score,
        katSkor:    getScore(m.segment, selBolge, selYas, selDonem),
        katSkorCmp: selCmpDonem ? getScore(m.segment, selBolge, selYas, selCmpDonem) : null,
        cmpScore:   cmpRanked.find(function(x) { return x.marka === m.marka })?.score ?? null,
      }
    }).sort(function(a, b) {
      if (katSortKey === 'genel') return b.score - a.score
      const av = a.katSkor ? (a.katSkor as any)[katSortKey] ?? 0 : 0
      const bv = b.katSkor ? (b.katSkor as any)[katSortKey] ?? 0 : 0
      return bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, katSortKey])

  const katBarData = useMemo(function() {
    const vals = katMarkalar.map(function(m) {
      return katSortKey === 'genel' ? m.score : (m.katSkor ? (m.katSkor as any)[katSortKey] ?? 0 : 0)
    })
    const colors = vals.map(function(v) { return kpiScoreColor(v) })
    const cmpVals = selCmpDonem ? katMarkalar.map(function(m) {
      return katSortKey === 'genel' ? (m.cmpScore ?? 0) : (m.katSkorCmp ? (m.katSkorCmp as any)[katSortKey] ?? 0 : 0)
    }) : null
    const katAd = katSortKey === 'genel' ? 'Genel Skor' : (KAT_YAPILAR.find(function(k) { return k.key === katSortKey })?.ad ?? katSortKey)
    return {
      labels: katMarkalar.map(function(m) { return m.marka }),
      datasets: [
        { label: katAd, data: vals, backgroundColor: colors.map(function(c) { return c + 'cc' }), borderColor: colors, borderWidth: 1, borderRadius: 4 },
        ...(cmpVals ? [{ label: 'Onceki Donem', data: cmpVals, backgroundColor: 'rgba(100,116,139,.3)', borderColor: 'rgba(100,116,139,.6)', borderWidth: 1, borderRadius: 4 }] : []),
      ],
    }
  }, [katMarkalar, katSortKey, selCmpDonem])

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 24 } },
    plugins: {
      legend: { display: !!selCmpDonem, position: 'bottom' as const, labels: { color: '#8496b0', font: { size: 10 }, boxWidth: 12, padding: 12 } },
      tooltip: { callbacks: { label: function(ctx: any) { return ' ' + ctx.dataset.label + ': ' + Math.round(ctx.parsed.y) + ' puan' } } },
    },
    scales: {
      x: { ticks: { color: '#8496b0', font: { size: 9 }, maxRotation: 35 }, grid: { color: 'rgba(132,150,176,.08)' } },
      y: { min: 0, ticks: { color: '#8496b0', font: { size: 9 } }, grid: { color: 'rgba(132,150,176,.08)' } },
    },
  }

  const thS: React.CSSProperties = { padding: '8px 10px', fontSize: 9, fontWeight: 700, color: 'var(--tx3)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }
  const tdS: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'center' }

  let aktifKatAd = 'Genel Skor'
  if (katSortKey !== 'genel') {
    const found = KAT_YAPILAR.find(function(k) { return k.key === katSortKey })
    if (found) aktifKatAd = found.ad
  }

  let aktifKpiAd = 'Genel Skor'
  if (sortKpi !== -1) {
    const meta = KPI_META[sortKpi]
    if (meta) aktifKpiAd = meta.ad
  }

  // KPI bazli bar data -- segment bazli, markalar yok
  const kpiBarData = useMemo(function() {
    const items = segData.map(function(s) {
      const v = sortKpi === -1 ? (s.katSkor ? s.katSkor.genel : 0) : (s.kpiSkorlar[sortKpi] ?? 0)
      const c = sortKpi === -1 ? (s.katSkorCmp ? s.katSkorCmp.genel : null) : (s.kpiSkorlarCmp ? s.kpiSkorlarCmp[sortKpi] ?? 0 : null)
      return { seg: s.seg, val: v, cmp: c }
    })
    return {
      labels: items.map(function(i) { return i.seg }),
      datasets: [
        { label: aktifKpiAd, data: items.map(function(i) { return i.val }), backgroundColor: items.map(function(i) { return SEGMENT_HEX[i.seg] + 'cc' }), borderColor: items.map(function(i) { return SEGMENT_HEX[i.seg] }), borderWidth: 1, borderRadius: 4 },
        ...(selCmpDonem ? [{ label: 'Onceki Donem', data: items.map(function(i) { return i.cmp ?? 0 }), backgroundColor: 'rgba(100,116,139,.3)', borderColor: 'rgba(100,116,139,.6)', borderWidth: 1, borderRadius: 4 }] : []),
      ],
    }
  }, [segData, sortKpi, aktifKpiAd, selCmpDonem])

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay" subtitle={filterLabel} />
      <div className={styles.content}>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={function() { setTab('kpi') }} style={{ padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (tab === 'kpi' ? 'var(--blue)' : 'var(--bd)'), background: tab === 'kpi' ? 'rgba(59,130,246,.12)' : 'var(--surf)', color: tab === 'kpi' ? 'var(--blue)' : 'var(--tx2)' }}>KPI Bazli</button>
          <button onClick={function() { setTab('kategori') }} style={{ padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (tab === 'kategori' ? 'var(--blue)' : 'var(--bd)'), background: tab === 'kategori' ? 'rgba(59,130,246,.12)' : 'var(--surf)', color: tab === 'kategori' ? 'var(--blue)' : 'var(--tx2)' }}>Kategori Bazli</button>
        </div>

        {tab === 'kpi' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + segData.length + ',1fr)', gap: 14, marginBottom: 20 }}>
              {segData.map(function(sd) {
                return (
                  <div key={sd.seg} style={{ background: 'var(--surf)', border: '1px solid ' + SEGMENT_HEX[sd.seg] + '44', borderRadius: 12, padding: 14, borderTop: '3px solid ' + SEGMENT_HEX[sd.seg] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: SEGMENT_HEX[sd.seg] }}>{sd.seg}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <GeneralScoreMethodology align="right" />
                      {sd.katSkor && (
                        <button onClick={function() { setSortKpi(-1) }} style={{ background: sortKpi === -1 ? scoreBg(sd.katSkor.genel) : 'transparent', color: scoreColor(sd.katSkor.genel), border: '2px solid ' + (sortKpi === -1 ? scoreColor(sd.katSkor.genel) : scoreColor(sd.katSkor.genel) + '44'), borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                          {sd.katSkor.genel}
                        </button>
                      )}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                      {KPI_META.map(function(k, i) {
                        const skor    = sd.kpiSkorlar[i] ?? 100
                        const detay   = sd.kpiDetaylar[i]
                        const cmpSkor = sd.kpiSkorlarCmp ? (sd.kpiSkorlarCmp[i] ?? null) : null
                        const aktif   = sortKpi === i
                        return (
                          <div key={i} onClick={function() { setSortKpi(i) }} style={{ background: aktif ? kpiScoreBg(skor) : 'var(--surf2)', border: aktif ? '2px solid ' + kpiScoreColor(skor) : '1px solid ' + kpiScoreColor(skor) + '22', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                              <span style={{ fontSize: 8, color: 'var(--tx3)', lineHeight: 1.3 }}>{k.ad}</span>
                              <KpiMethodologyTooltip detail={detay} kpiName={k.ad} align="right" />
                            </div>
                            <SkorHucre skor={skor} cmpSkor={selCmpDonem ? cmpSkor : null} size="lg" />
                            <div style={{ marginTop: 5, fontSize: 8, color: 'var(--tx3)', display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{detay?.isLowerBetter ? 'Düşük daha iyi' : 'Yüksek daha iyi'}</span>
                              {!detay?.coverageIncluded && <span>Coverage dışı</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Segment Karsilastirma — {aktifKpiAd}{sortKpi === -1 ? <GeneralScoreMethodology align="left" /> : null}</span>
                <button onClick={function() { setSortKpi(-1) }} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (sortKpi === -1 ? '#f59e0b' : 'var(--bd)'), background: sortKpi === -1 ? 'rgba(245,158,11,.12)' : 'var(--surf2)', color: sortKpi === -1 ? '#f59e0b' : 'var(--tx3)' }}>Genel Skor</button>
              </div>
              <div style={{ height: 260 }}>
                <Bar data={kpiBarData} options={barOptions} plugins={[barValuePlugin]} />
              </div>
            </div>
          </div>
        )}

        {tab === 'kategori' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + segData.length + ',1fr)', gap: 14, marginBottom: 20 }}>
              {segData.map(function(sd) {
                return (
                  <div key={sd.seg} style={{ background: 'var(--surf)', border: '1px solid ' + SEGMENT_HEX[sd.seg] + '44', borderRadius: 12, padding: 14, borderTop: '3px solid ' + SEGMENT_HEX[sd.seg] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: SEGMENT_HEX[sd.seg] }}>{sd.seg}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <GeneralScoreMethodology align="right" />
                      {sd.katSkor && (
                        <button onClick={function() { setKatSortKey('genel') }} style={{ background: katSortKey === 'genel' ? scoreBg(sd.katSkor.genel) : 'transparent', color: scoreColor(sd.katSkor.genel), border: '2px solid ' + (katSortKey === 'genel' ? scoreColor(sd.katSkor.genel) : scoreColor(sd.katSkor.genel) + '44'), borderRadius: 8, padding: '3px 10px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                          {sd.katSkor.genel}
                        </button>
                      )}
                      </span>
                    </div>
                    {KAT_YAPILAR.map(function(kat) {
                      const skor    = sd.katSkor    ? (sd.katSkor    as any)[kat.key] ?? 0 : 0
                      const cmpSkor = sd.katSkorCmp ? (sd.katSkorCmp as any)[kat.key] ?? null : null
                      const delta   = changePct(skor, cmpSkor)
                      const aktif   = katSortKey === kat.key
                      return (
                        <div key={kat.key} onClick={function() { setKatSortKey(kat.key) }} style={{ marginBottom: 10, cursor: 'pointer', borderRadius: 6, padding: '4px 6px', background: aktif ? scoreColor(skor) + '10' : 'transparent', border: aktif ? '1px solid ' + scoreColor(skor) + '44' : '1px solid transparent' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 9, color: 'var(--tx2)', fontWeight: aktif ? 700 : 600 }}>{kat.ad}</span>
                              <CategoryScoreMethodology align="left" />
                            </span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {delta != null && selCmpDonem && <span style={{ fontSize: 8, fontWeight: 700, color: chgColor(delta) }}>{delta > 0 ? '+' : ''}{delta}%</span>}
                              <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(skor) }}>{Math.round(skor)}</span>
                            </div>
                          </div>
                          <div style={{ background: 'var(--surf3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ width: Math.min(100, skor) + '%', height: '100%', background: scoreColor(skor), borderRadius: 4 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Marka Karsilastirma — {aktifKatAd}{katSortKey === 'genel' ? <GeneralScoreMethodology align="left" /> : <CategoryScoreMethodology align="left" />}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={function() { setKatSortKey('genel') }} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (katSortKey === 'genel' ? '#f59e0b' : 'var(--bd)'), background: katSortKey === 'genel' ? 'rgba(245,158,11,.12)' : 'var(--surf2)', color: katSortKey === 'genel' ? '#f59e0b' : 'var(--tx3)' }}>Genel</button>
                  {KAT_YAPILAR.map(function(kat) {
                    return (
                      <button key={kat.key} onClick={function() { setKatSortKey(kat.key) }} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (katSortKey === kat.key ? 'var(--blue)' : 'var(--bd)'), background: katSortKey === kat.key ? 'rgba(59,130,246,.12)' : 'var(--surf2)', color: katSortKey === kat.key ? 'var(--blue)' : 'var(--tx3)' }}>
                        {kat.ad.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ height: 260 }}>
                <Bar data={katBarData} options={barOptions} plugins={[barValuePlugin]} />
              </div>
            </div>

          </div>
        )}

        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 10, color: 'var(--tx3)' }}>
          {['#10b981', '#3b82f6', '#ef4444'].map(function(c, i) {
            const lbl = i === 0 ? '>= 77: TR Ust' : i === 1 ? '66-77: TR Yakin' : '< 66: TR Alt'
            return (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                <span>{lbl}</span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
