'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG, SEGMENT_HEX_BG,
  CAT_COLORS, KAT_YAPILAR,
  getKpiScores, getKpiScoresDetailed, getScore, getMarkaRanking,
  kpiScoreColor, kpiScoreBg, scoreColor, scoreBg,
  changePct, chgColor, chgBg, isLowerBetter,
} from '@/lib/kpi'
import styles from './page.module.css'

// ── Tip tanımları ──────────────────────────────────────────────
type TabTip = 'kpi' | 'kategori'

// ── Yardımcılar ───────────────────────────────────────────────
const fmt0 = (v: number) => Math.round(v).toString()
const chgPct = (baz: number, cmp: number | null) => changePct(baz, cmp)

// ── Skor kutusu bileşeni ──────────────────────────────────────
function SkorKutu({
  label, unit='', skor, cmpSkor, info,
}: {
  label: string; unit?: string; skor: number; cmpSkor?: number|null; info?: string
}) {
  const delta = cmpSkor != null ? chgPct(skor, cmpSkor) : null
  return (
    <div style={{
      background: scoreBg(skor), border: `1px solid ${scoreColor(skor)}33`,
      borderRadius: 10, padding: '10px 12px', textAlign: 'center', position: 'relative',
    }}>
      <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 4, fontWeight: 600, lineHeight: 1.2 }}>
        {label}{unit ? ` (${unit})` : ''}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 900, color: scoreColor(skor),
        fontFamily: 'var(--font-dm-mono)', lineHeight: 1,
      }}>
        {fmt0(skor)}
      </div>
      <div style={{ fontSize: 8, color: 'var(--tx3)', marginTop: 3 }}>puan</div>
      {delta != null && (
        <div style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 8, fontWeight: 700, color: chgColor(delta),
        }}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'}{' '}{Math.abs(delta)}%
        </div>
      )}
      {info && (
        <div title={info} style={{
          position: 'absolute', top: 6, left: 8,
          fontSize: 9, color: 'var(--tx3)', cursor: 'help',
        }}>ℹ</div>
      )}
    </div>
  )
}

// ── Ana bileşen ───────────────────────────────────────────────
export default function KpiDetayPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [tab, setTab] = useState<TabTip>('kpi')
  const [sortKpi, setSortKpi] = useState<number>(0)

  const filterLabel = [
    selBolge || 'Tüm TR',
    selYas === 'Tümü' ? 'Tüm Yaş' : selYas + ' yaş',
    selDonem || 'Tüm Dönem',
  ].join(' · ')

  // ── Segment bazlı normalize KPI skorları ──
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

  // ── Marka listesi (sıralı) ──
  const markalar = useMemo(() => {
    const ranked    = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : []

    return ranked.map(m => {
      // Markanın segmentine ait normalize KPI skorları
      const bazSkorlar = getKpiScores(m.segment, selBolge, selYas, selDonem)
      const cmpSkorlar = selCmpDonem ? getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null
      const cmpScore   = cmpRanked.find(x => x.marka === m.marka)?.score ?? null
      return { ...m, bazSkorlar, cmpSkorlar, cmpScore }
    }).sort((a, b) => {
      const av = a.bazSkorlar[sortKpi] ?? 0
      const bv = b.bazSkorlar[sortKpi] ?? 0
      return isLowerBetter(sortKpi) ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, sortKpi])

  const thS: React.CSSProperties = {
    padding: '8px 10px', fontSize: 9, fontWeight: 700, color: 'var(--tx3)',
    borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap', textAlign: 'center',
    cursor: 'pointer', userSelect: 'none',
  }
  const tdS: React.CSSProperties = {
    padding: '6px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'center',
  }

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
                  {/* Başlık */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: SEGMENT_HEX[seg] }}>{seg}</span>
                    {katSkor && (
                      <span style={{
                        background: scoreBg(katSkor.genel), color: scoreColor(katSkor.genel),
                        borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 800,
                        fontFamily: 'var(--font-dm-mono)',
                      }}>
                        {katSkor.genel}
                      </span>
                    )}
                  </div>

                  {/* KPI Skor kartları */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {KPI_META.map((k, i) => {
                      const skor    = kpiSkorlar[i] ?? 100
                      const cmpSkor = kpiSkorlarCmp?.[i] ?? null
                      return (
                        <div key={i} style={{
                          background: kpiScoreBg(skor), border: `1px solid ${kpiScoreColor(skor)}33`,
                          borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                          outline: sortKpi===i ? `2px solid ${SEGMENT_HEX[seg]}` : 'none',
                        }}
                          onClick={() => setSortKpi(i)}
                        >
                          <div style={{ fontSize: 8, color: 'var(--tx3)', marginBottom: 4, lineHeight: 1.2 }}>
                            {k.ad}
                            {k.is_lower_better && <span title="Küçükse iyi"> ↓</span>}
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

            {/* Marka tablosu */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: 'var(--surf2)' }}>
                      <th style={{ ...thS, textAlign: 'left', minWidth: 120 }}>Marka</th>
                      <th style={thS}>Seg.</th>
                      <th style={{ ...thS, minWidth: 60 }}>Genel</th>
                      {selCmpDonem && <th style={thS}>Önceki</th>}
                      {KPI_META.map((k, i) => (
                        <th key={i} style={{
                          ...thS,
                          color: sortKpi===i ? 'var(--blue)' : 'var(--tx3)',
                          background: sortKpi===i ? 'rgba(59,130,246,.08)' : undefined,
                          minWidth: 64,
                        }}
                          onClick={() => setSortKpi(i)}
                          title={k.ad + (k.is_lower_better ? ' (küçükse iyi)' : '')}
                        >
                          K{k.no}{k.is_lower_better ? '↓' : ''}
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
                          <td style={{ ...tdS, fontWeight: 800, fontFamily: 'var(--font-dm-mono)',
                            color: scoreColor(m.score), background: scoreBg(m.score) }}>
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
