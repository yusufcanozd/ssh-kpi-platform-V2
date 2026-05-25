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
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG,
  CAT_COLORS, KAT_YAPILAR,
  getKpiScores, getScore, getMarkaRanking,
  kpiScoreColor, kpiScoreBg, scoreColor, scoreBg,
  changePct, chgColor, isLowerBetter,
} from '@/lib/kpi'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type TabTip = 'kpi' | 'kategori'
// -1 = Genel Skor
type SortKpi = number | -1

const fmt0 = (v: number) => Math.round(v).toString()
const chgPct = (baz: number, cmp: number | null) => changePct(baz, cmp)

export default function KpiDetayPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [tab, setTab]       = useState<TabTip>('kpi')
  const [sortKpi, setSortKpi] = useState<SortKpi>(-1)  // -1 = Genel Skor

  const filterLabel = [
    selBolge || 'Tüm TR',
    selYas === 'Tümü' ? 'Tüm Yaş' : selYas + ' yaş',
    selDonem || 'Tüm Dönem',
  ].join(' · ')

  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s === selSeg).map(s => ({
      seg: s,
      kpiSkorlar:    getKpiScores(s, selBolge, selYas, selDonem),
      kpiSkorlarCmp: selCmpDonem ? getKpiScores(s, selBolge, selYas, selCmpDonem) : null,
      katSkor:       getScore(s, selBolge, selYas, selDonem),
      katSkorCmp:    selCmpDonem ? getScore(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem]
  )

  const markalar = useMemo(() => {
    const ranked    = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []
    return ranked.map(m => {
      const bazSkorlar = getKpiScores(m.segment, selBolge, selYas, selDonem)
      const cmpSkorlar = selCmpDonem ? getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null
      const cmpScore   = cmpRanked.find(x => x.marka === m.marka)?.score ?? null
      return { ...m, bazSkorlar, cmpSkorlar, cmpScore }
    }).sort((a, b) => {
      if (sortKpi === -1) return b.score - a.score
      const av = a.bazSkorlar[sortKpi] ?? 0
      const bv = b.bazSkorlar[sortKpi] ?? 0
      return isLowerBetter(sortKpi) ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, sortKpi])

  // ── Bar grafik verisi ─────────────────────────────────────
  const barData = useMemo(() => {
    const labels = markalar.map(m => m.marka)
    const vals   = markalar.map(m =>
      sortKpi === -1 ? m.score : (m.bazSkorlar[sortKpi] ?? 0)
    )
    const colors = vals.map(v => kpiScoreColor(v))
    const cmpVals = selCmpDonem
      ? markalar.map(m =>
          sortKpi === -1
            ? (m.cmpScore ?? 0)
            : (m.cmpSkorlar?.[sortKpi] ?? 0)
        )
      : null

    return {
      labels,
      datasets: [
        {
          label: sortKpi === -1 ? 'Genel Skor' : KPI_META[sortKpi]?.ad,
          data: vals,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
        },
        ...(cmpVals ? [{
          label: 'Önceki Dönem',
          data: cmpVals,
          backgroundColor: 'rgba(100,116,139,.3)',
          borderColor: 'rgba(100,116,139,.6)',
          borderWidth: 1,
          borderRadius: 4,
        }] : []),
      ],
    }
  }, [markalar, sortKpi, selCmpDonem])

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: !!selCmpDonem, labels: { color: '#8496b0', font: { size: 10 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${Math.round(ctx.parsed.y)} puan`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8496b0', font: { size: 9 }, maxRotation: 35 },
        grid: { color: 'rgba(132,150,176,.08)' },
      },
      y: {
        min: 0,
        ticks: { color: '#8496b0', font: { size: 9 } },
        grid: { color: 'rgba(132,150,176,.08)' },
      },
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

  // Aktif KPI adı (başlık için)
  const aktifAd = sortKpi === -1
    ? 'Genel Skor'
    : KPI_META[sortKpi]?.ad + (isLowerBetter(sortKpi) ? ' ↓' : '')

  return (
    <div className={styles.wrap}>
      <Topbar
        title="KPI Detay"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem ? ' vs ' + selCmpDonem : ''}`}
      />
      <div className={styles.content}>

        {/* Tab seçici */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([['kpi','KPI Bazlı'],['kategori','Kategori Bazlı']] as [TabTip, string][]).map(([t, lbl]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: `1px solid ${tab===t ? 'var(--blue)' : 'var(--bd)'}`,
                background: tab===t ? 'rgba(59,130,246,.12)' : 'var(--surf)',
                color: tab===t ? 'var(--blue)' : 'var(--tx2)',
              }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── KPI Bazlı görünüm ── */}
        {tab === 'kpi' && (
          <div>
            {/* Segment KPI kart grid */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segData.length}, 1fr)`, gap: 14, marginBottom: 20 }}>
              {segData.map(({ seg, kpiSkorlar, kpiSkorlarCmp, katSkor }) => (
                <div key={seg} style={{
                  background: 'var(--surf)', border: `1px solid ${SEGMENT_HEX[seg]}44`,
                  borderRadius: 12, padding: 14, borderTop: `3px solid ${SEGMENT_HEX[seg]}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: SEGMENT_HEX[seg] }}>{seg}</span>
                    {katSkor && (
                      <button
                        onClick={() => setSortKpi(-1)}
                        style={{
                          background: sortKpi===-1 ? scoreBg(katSkor.genel) : 'transparent',
                          color: scoreColor(katSkor.genel),
                          border: `2px solid ${sortKpi===-1 ? scoreColor(katSkor.genel) : scoreColor(katSkor.genel)+'44'}`,
                          borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 800,
                          fontFamily: 'var(--font-dm-mono)', cursor: 'pointer',
                        }}>
                        {katSkor.genel}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {KPI_META.map((k, i) => {
                      const skor    = kpiSkorlar[i] ?? 100
                      const cmpSkor = kpiSkorlarCmp?.[i] ?? null
                      const aktif   = sortKpi === i
                      return (
                        <div key={i}
                          onClick={() => setSortKpi(i)}
                          style={{
                            background: aktif ? kpiScoreBg(skor) : 'var(--surf2)',
                            border: aktif
                              ? `2px solid ${kpiScoreColor(skor)}`
                              : `1px solid ${kpiScoreColor(skor)}22`,
                            borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                            transition: 'all .15s',
                          }}
                        >
                          <div style={{ fontSize: 8, color: 'var(--tx3)', marginBottom: 4, lineHeight: 1.3 }}>
                            {k.ad}{k.is_lower_better && <span title="Küçükse iyi"> ↓</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{
                              fontSize: 18, fontWeight: 900, color: kpiScoreColor(skor),
                              fontFamily: 'var(--font-dm-mono)',
                            }}>
                              {fmt0(skor)}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--tx3)' }}>puan</span>
                          </div>
                          {cmpSkor != null && (() => {
                            const delta = chgPct(skor, cmpSkor)
                            return delta != null ? (
                              <div style={{ fontSize: 8, fontWeight: 700, color: chgColor(delta), marginTop: 2 }}>
                                {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'} {Math.abs(delta)}%
                              </div>
                            ) : null
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Bar Grafik ── */}
            <div style={{
              background: 'var(--surf)', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '16px 20px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
                    Marka Karşılaştırma
                  </span>
                  <span style={{
                    marginLeft: 10, fontSize: 10, fontWeight: 600,
                    color: sortKpi === -1 ? '#f59e0b' : 'var(--blue)',
                    background: sortKpi === -1 ? 'rgba(245,158,11,.1)' : 'rgba(59,130,246,.1)',
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    {aktifAd}
                  </span>
                </div>
                {/* Genel Skor butonu */}
                <button
                  onClick={() => setSortKpi(-1)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${sortKpi===-1 ? '#f59e0b' : 'var(--bd)'}`,
                    background: sortKpi===-1 ? 'rgba(245,158,11,.12)' : 'var(--surf2)',
                    color: sortKpi===-1 ? '#f59e0b' : 'var(--tx3)',
                  }}>
                  ★ Genel Skor
                </button>
              </div>
              <div style={{ height: 240 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* ── Marka tablosu ── */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: 'var(--surf2)' }}>
                      <th style={{ ...thS, textAlign: 'left', minWidth: 120 }}>Marka</th>
                      <th style={thS}>Seg.</th>
                      {/* Genel skor kolonu — tıklanabilir */}
                      <th
                        onClick={() => setSortKpi(-1)}
                        style={{
                          ...thS, minWidth: 64,
                          color: sortKpi===-1 ? '#f59e0b' : 'var(--tx3)',
                          background: sortKpi===-1 ? 'rgba(245,158,11,.08)' : undefined,
                        }}>
                        Genel{sortKpi===-1 ? ' ▾' : ''}
                      </th>
                      {selCmpDonem && <th style={thS}>Önceki</th>}
                      {/* KPI kolonları — tam isimle */}
                      {KPI_META.map((k, i) => (
                        <th key={i}
                          onClick={() => setSortKpi(i)}
                          title={k.ad + (k.is_lower_better ? ' (küçükse iyi ↓)' : '')}
                          style={{
                            ...thS,
                            color: sortKpi===i ? 'var(--blue)' : 'var(--tx3)',
                            background: sortKpi===i ? 'rgba(59,130,246,.08)' : undefined,
                            minWidth: 110,
                            maxWidth: 140,
                            whiteSpace: 'normal',
                            lineHeight: 1.3,
                            verticalAlign: 'bottom',
                            paddingBottom: 6,
                          }}>
                          {k.ad}{k.is_lower_better ? ' ↓' : ''}
                          {sortKpi===i ? ' ▾' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {markalar.map(m => {
                      const delta = chgPct(m.score, m.cmpScore)
                      return (
                        <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ ...tdS, textAlign: 'left', fontWeight: 700, color: SEGMENT_HEX[m.segment] }}>
                            {m.marka}
                          </td>
                          <td style={tdS}>
                            <span style={{
                              background: SEGMENT_BG[m.segment], color: SEGMENT_HEX[m.segment],
                              padding: '2px 7px', borderRadius: 20, fontSize: 8, fontWeight: 700,
                              border: `1px solid ${SEGMENT_HEX[m.segment]}44`,
                            }}>
                              {m.segment}
                            </span>
                          </td>
                          <td style={{
                            ...tdS, fontWeight: 800, fontFamily: 'var(--font-dm-mono)',
                            color: scoreColor(m.score), background: sortKpi===-1 ? scoreBg(m.score) : undefined,
                          }}>
                            {m.score}
                          </td>
                          {selCmpDonem && (
                            <td style={{ ...tdS, fontSize: 9 }}>
                              {m.cmpScore != null ? (
                                <span style={{ color: delta != null ? chgColor(delta) : 'var(--tx3)', fontWeight: 700 }}>
                                  {delta != null && (delta > 0 ? '▲' : delta < 0 ? '▼' : '→')}{' '}
                                  {m.cmpScore}
                                </span>
                              ) : '—'}
                            </td>
                          )}
                          {m.bazSkorlar.map((skor, ki) => {
                            const cmpSkor = m.cmpSkorlar?.[ki] ?? null
                            const d = chgPct(skor, cmpSkor)
                            return (
                              <td key={ki} style={{
                                ...tdS,
                                background: sortKpi===ki ? kpiScoreBg(skor) : undefined,
                              }}>
                                <div style={{
                                  fontFamily: 'var(--font-dm-mono)', fontWeight: 700,
                                  color: kpiScoreColor(skor), fontSize: 11,
                                }}>
                                  {fmt0(skor)}
                                </div>
                                {d != null && (
                                  <div style={{ fontSize: 7, color: chgColor(d), fontWeight: 700 }}>
                                    {d > 0 ? '▲' : d < 0 ? '▼' : '→'}{Math.abs(d)}%
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {markalar.length === 0 && (
                      <tr>
                        <td colSpan={3 + KPI_META.length + (selCmpDonem ? 1 : 0)}
                          style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>
                          Seçili filtreler için veri bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Kategori Bazlı görünüm ── */}
        {tab === 'kategori' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segData.length}, 1fr)`, gap: 14 }}>
            {segData.map(({ seg, katSkor, katSkorCmp }) => (
              <div key={seg} style={{
                background: 'var(--surf)', border: `1px solid ${SEGMENT_HEX[seg]}44`,
                borderRadius: 12, padding: 14, borderTop: `3px solid ${SEGMENT_HEX[seg]}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: SEGMENT_HEX[seg] }}>{seg}</span>
                  {katSkor && (
                    <span style={{
                      background: scoreBg(katSkor.genel), color: scoreColor(katSkor.genel),
                      borderRadius: 8, padding: '3px 10px', fontSize: 14, fontWeight: 800,
                      fontFamily: 'var(--font-dm-mono)',
                    }}>
                      {katSkor.genel}
                    </span>
                  )}
                </div>
                {KAT_YAPILAR.map(kat => {
                  const skor    = katSkor    ? (katSkor    as any)[kat.key] ?? 0 : 0
                  const cmpSkor = katSkorCmp ? (katSkorCmp as any)[kat.key] ?? null : null
                  const delta   = chgPct(skor, cmpSkor)
                  return (
                    <div key={kat.key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--tx2)', fontWeight: 600 }}>
                          {kat.ad}
                          <span style={{ color: 'var(--tx3)', marginLeft: 4, fontSize: 8 }}>
                            %{Math.round(kat.agirlik * 100)}
                          </span>
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {delta != null && (
                            <span style={{ fontSize: 8, fontWeight: 700, color: chgColor(delta) }}>
                              {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'}{Math.abs(delta)}%
                            </span>
                          )}
                          <span style={{
                            fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-dm-mono)',
                            color: scoreColor(skor),
                          }}>
                            {fmt0(skor)}
                          </span>
                        </div>
                      </div>
                      <div style={{ background: 'var(--surf3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, skor)}%`, height: '100%',
                          background: scoreColor(skor), borderRadius: 4, transition: 'width .3s',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Renk efsanesi */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 10, color: 'var(--tx3)' }}>
          {[
            ['#10b981', '≥ 77 puan: TR Ortalamasının Üzerinde'],
            ['#3b82f6', '66-77 puan: TR Ortalamasına Yakın'],
            ['#ef4444', '< 66 puan: TR Ortalamasının Altında'],
          ].map(([c, lbl]) => (
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
