'use client'

import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import { filterAllowedBrandNames } from '@/lib/auth/permissions'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENT_HEX, SEGMENT_BG, KAT_YAPILAR,
  createRuntimeCalculator, getRawMarkaRanking, getBrandPrivacyInfo, applyBrandPrivacyRule,
  kpiScoreColor, kpiScoreBg, scoreColor, scoreBg,
  changePct, chgColor, isLowerBetter,
} from '@/lib/kpi'
import styles from './page.module.css'
import { smartBarValueLabels as barValuePlugin } from '@/lib/kpi/chart-labels'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)


function SkorHucre(props: { skor: number; cmpSkor?: number | null; size?: string }) {
  const skor    = props.skor
  const cmpSkor = props.cmpSkor
  const size    = props.size || 'md'
  const delta   = cmpSkor != null ? changePct(skor, cmpSkor) : null
  const bazFs   = size === 'lg' ? 20 : size === 'sm' ? 13 : 16
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
              {delta > 0 ? '+' + String(Math.abs(delta)) + '%' : delta < 0 ? '-' + String(Math.abs(delta)) + '%' : '='}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem, hasDataRestriction, allowedBrandNames, runtimeData } = useDashboardCtx()
  const [tab, setTab]             = useState('kpi')
  const [sortKpi, setSortKpi]     = useState(-1)
  const [katSortKey, setKatSortKey] = useState('genel')
  const runtimeCalc = useMemo(() => createRuntimeCalculator(runtimeData), [runtimeData])

  const filterLabel = (selBolge || 'Tum TR') + ' - ' + (selYas === 'Tümü' ? 'Tum Yas' : selYas) + ' - ' + (selDonem || 'Tum Donem')

  const brandRestricted = hasDataRestriction && allowedBrandNames.length > 0

  function getDynamicOrStaticRawRanking(donem: string) {
    const dyn = runtimeData?.markaRows
    if (dyn && dyn.length > 0) {
      return dyn
        .filter(r => (!selSeg || r[1] === selSeg) && r[2] === selBolge && r[3] === selYas && r[4] === donem)
        .map(r => ({ marka: r[0], segment: r[1], score: r[5] ?? 0 }))
        .sort((a, b) => b.score - a.score || a.marka.localeCompare(b.marka, 'tr'))
    }
    return getRawMarkaRanking(selSeg, selBolge, selYas, donem)
  }

  function getPermissionFilteredRawRanking(donem: string) {
    const rawRows = getDynamicOrStaticRawRanking(donem)
    return filterAllowedBrandNames(rawRows, allowedBrandNames, brandRestricted)
  }

  function getPermissionFilteredRanking(donem: string): Array<{ marka: string; originalMarka?: string; segment: string; score: number }> {
    return applyBrandPrivacyRule(getPermissionFilteredRawRanking(donem)) as Array<{ marka: string; originalMarka?: string; segment: string; score: number }>
  }

  function getBrandIdentity(row: { marka: string; originalMarka?: string }) {
    return row.originalMarka ?? row.marka
  }

  const brandPrivacy = useMemo(function() {
    const rawCount = getPermissionFilteredRawRanking(selDonem).length
    return getBrandPrivacyInfo(rawCount)
  }, [selDonem, selSeg, selBolge, selYas, allowedBrandNames, brandRestricted, runtimeData])

  const markalar = useMemo(function() {
    const ranked    = getPermissionFilteredRanking(selDonem)
    const cmpRanked = selCmpDonem ? getPermissionFilteredRanking(selCmpDonem) : []
    const result = ranked.map(function(m, bazIdx) {
      const cmpIdx = cmpRanked.findIndex(function(x) { return getBrandIdentity(x) === getBrandIdentity(m) })
      return {
        marka:      m.marka,
        segment:    m.segment,
        score:      m.score,
        bazSkorlar: runtimeCalc.getKpiScores(m.segment, selBolge, selYas, selDonem),
        cmpSkorlar: selCmpDonem ? runtimeCalc.getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null,
        cmpScore:   cmpIdx >= 0 ? cmpRanked[cmpIdx].score : null,
        bazRank:    bazIdx + 1,
        cmpRank:    cmpIdx >= 0 ? cmpIdx + 1 : 0,
      }
    })
    return result.sort(function(a, b) {
      if (sortKpi === -1) return b.score - a.score
      const av = a.bazSkorlar[sortKpi] ?? 0
      const bv = b.bazSkorlar[sortKpi] ?? 0
      return isLowerBetter(sortKpi) ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, sortKpi, allowedBrandNames, brandRestricted, runtimeCalc])

  const katMarkalar = useMemo(function() {
    const ranked    = getPermissionFilteredRanking(selDonem)
    const cmpRanked = selCmpDonem ? getPermissionFilteredRanking(selCmpDonem) : []
    const result = ranked.map(function(m, bazIdx) {
      const cmpIdx = cmpRanked.findIndex(function(x) { return getBrandIdentity(x) === getBrandIdentity(m) })
      return {
        marka:      m.marka,
        segment:    m.segment,
        score:      m.score,
        katSkor:    runtimeCalc.getScore(m.segment, selBolge, selYas, selDonem),
        katSkorCmp: selCmpDonem ? runtimeCalc.getScore(m.segment, selBolge, selYas, selCmpDonem) : null,
        cmpScore:   cmpIdx >= 0 ? cmpRanked[cmpIdx].score : null,
        bazRank:    bazIdx + 1,
        cmpRank:    cmpIdx >= 0 ? cmpIdx + 1 : 0,
      }
    })
    return result.sort(function(a, b) {
      if (katSortKey === 'genel') return b.score - a.score
      const av = a.katSkor ? (a.katSkor as any)[katSortKey] ?? 0 : 0
      const bv = b.katSkor ? (b.katSkor as any)[katSortKey] ?? 0 : 0
      return bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, katSortKey, allowedBrandNames, brandRestricted, runtimeCalc])

  function makeBarData(labels: string[], vals: number[], cmpVals: number[] | null, label: string) {
    const colors = vals.map(function(v) { return kpiScoreColor(v) })
    return {
      labels,
      datasets: [
        { label, data: vals, backgroundColor: colors.map(function(c) { return c + 'cc' }), borderColor: colors, borderWidth: 1, borderRadius: 4 },
        ...(cmpVals ? [{ label: 'Onceki Donem', data: cmpVals, backgroundColor: 'rgba(100,116,139,.3)', borderColor: 'rgba(100,116,139,.6)', borderWidth: 1, borderRadius: 4 }] : []),
      ],
    }
  }

  let kpiLabel = 'Genel Skor'
  if (sortKpi !== -1) {
    const meta = KPI_META[sortKpi]
    if (meta) kpiLabel = meta.ad
  }

  const barData = useMemo(function() {
    const labels  = markalar.map(function(m) { return m.marka })
    const vals    = markalar.map(function(m) { return sortKpi === -1 ? m.score : (m.bazSkorlar[sortKpi] ?? 0) })
    const cmpVals = selCmpDonem ? markalar.map(function(m) { return sortKpi === -1 ? (m.cmpScore ?? 0) : (m.cmpSkorlar ? m.cmpSkorlar[sortKpi] ?? 0 : 0) }) : null
    return makeBarData(labels, vals, cmpVals, kpiLabel)
  }, [markalar, sortKpi, kpiLabel, selCmpDonem])

  let katLabel = 'Genel Skor'
  if (katSortKey !== 'genel') {
    const found = KAT_YAPILAR.find(function(k) { return k.key === katSortKey })
    if (found) katLabel = found.ad
  }

  const katBarData = useMemo(function() {
    const labels  = katMarkalar.map(function(m) { return m.marka })
    const vals    = katMarkalar.map(function(m) { return katSortKey === 'genel' ? m.score : (m.katSkor ? (m.katSkor as any)[katSortKey] ?? 0 : 0) })
    const cmpVals = selCmpDonem ? katMarkalar.map(function(m) { return katSortKey === 'genel' ? (m.cmpScore ?? 0) : (m.katSkorCmp ? (m.katSkorCmp as any)[katSortKey] ?? 0 : 0) }) : null
    return makeBarData(labels, vals, cmpVals, katLabel)
  }, [katMarkalar, katSortKey, katLabel, selCmpDonem])

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 24 } },
    plugins: {
      legend: { display: !!selCmpDonem, position: 'bottom' as const, labels: { color: '#8496b0', font: { size: 10 }, boxWidth: 12, padding: 12 } },
      tooltip: { callbacks: { label: function(ctx: any) { return ' ' + ctx.dataset.label + ': ' + String(Math.round(ctx.parsed.y)) + ' puan' } } },
    },
    scales: {
      x: { ticks: { color: '#8496b0', font: { size: 9 }, maxRotation: 35 }, grid: { color: 'rgba(132,150,176,.08)' } },
      y: { min: 0, ticks: { color: '#8496b0', font: { size: 9 } }, grid: { color: 'rgba(132,150,176,.08)' } },
    },
  }

  const thS: React.CSSProperties = { padding: '8px 10px', fontSize: 9, fontWeight: 700, color: 'var(--tx3)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }
  const tdS: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'center' }

  function scrollWrap(n: number): React.CSSProperties {
    return { overflowX: 'auto', overflowY: 'hidden', maxHeight: String(Math.min(n, 15) * 36 + 40) + 'px' }
  }

  function GenelHucre(props: { score: number; cmpScore: number | null; bazRank: number; cmpRank: number; aktif: boolean }) {
    const rankDelta = selCmpDonem && props.cmpRank > 0 ? props.cmpRank - props.bazRank : null
    const rankColor = rankDelta === null ? 'var(--tx3)' : rankDelta > 0 ? '#10b981' : rankDelta < 0 ? '#ef4444' : '#64748b'
    return (
      <td style={{ ...tdS, background: props.aktif ? scoreBg(props.score) : undefined, borderLeft: '2px solid var(--bd)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: kpiScoreColor(props.score), fontFamily: 'var(--font-dm-mono)', lineHeight: 1 }}>
            {String(props.score)}
          </span>
          {selCmpDonem && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
              {props.cmpScore != null && (
                <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: 'var(--font-dm-mono)' }}>{String(props.cmpScore)}</span>
              )}
              {rankDelta !== null && (
                <span style={{ fontSize: 8, fontWeight: 700, color: rankColor }}>
                  {rankDelta > 0 ? '+' + String(rankDelta) : rankDelta < 0 ? String(rankDelta) : '—'}
                </span>
              )}
            </div>
          )}
        </div>
      </td>
    )
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Siralaması" subtitle={String(markalar.length) + ' marka - ' + filterLabel + (selCmpDonem ? ' vs ' + selCmpDonem : '')} />
      <div className={styles.content}>

        {brandRestricted && (
          <div style={{
            background: 'rgba(59,130,246,.08)',
            border: '1px solid rgba(59,130,246,.28)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 10,
            color: 'var(--tx2)',
            lineHeight: 1.5,
          }}>
            <strong>Marka kısıtı aktif:</strong> Bu kullanıcı sadece izin verilen {allowedBrandNames.length} markanın sıralamasını görür. 3 veya daha az marka varsa rekabet gizlilik kuralı marka adlarını maskeleyebilir.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={function() { setTab('kpi') }} style={{ padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (tab === 'kpi' ? 'var(--blue)' : 'var(--bd)'), background: tab === 'kpi' ? 'rgba(59,130,246,.12)' : 'var(--surf)', color: tab === 'kpi' ? 'var(--blue)' : 'var(--tx2)' }}>KPI Bazli</button>
          <button onClick={function() { setTab('kategori') }} style={{ padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (tab === 'kategori' ? 'var(--blue)' : 'var(--bd)'), background: tab === 'kategori' ? 'rgba(59,130,246,.12)' : 'var(--surf)', color: tab === 'kategori' ? 'var(--blue)' : 'var(--tx2)' }}>Kategori Bazli</button>
        </div>

        <div style={{
          background: 'var(--surf)',
          border: '1px solid var(--bd)',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 10,
          color: 'var(--tx3)',
          lineHeight: 1.55,
        }}>
          <strong style={{ color: 'var(--tx2)' }}>Marka skoru notu:</strong> Marka sıralaması <code>marka_scores.json</code> içindeki hazır genel marka skorunu kullanır.
          Bu veri kaynağında marka bazlı kategori/KPI kırılımı bulunmadığı için tablodaki kategori ve KPI sütunları, markanın segment referans skorlarıyla açıklama amaçlı gösterilir.
          {brandPrivacy.isMasked && (
            <span> Rekabet hassasiyeti nedeniyle 3 veya daha az marka bulunan kırılımlarda marka adları gizlenir.</span>
          )}
        </div>

        {tab === 'kpi' && (
          <div>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div
                style={scrollWrap(markalar.length)}
                onMouseEnter={function(e) { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'auto'; el.style.maxHeight = '520px' }}
                onMouseLeave={function(e) { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'hidden'; el.style.maxHeight = String(Math.min(markalar.length, 15) * 36 + 40) + 'px' }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surf2)' }}>
                    <tr>
                      <th style={{ ...thS, textAlign: 'left', minWidth: 130, position: 'sticky', left: 0, background: 'var(--surf2)', zIndex: 3 }}>Marka</th>
                      <th style={{ ...thS, minWidth: 72, position: 'sticky', left: 130, background: 'var(--surf2)', zIndex: 3 }}>Seg.</th>
                      {KPI_META.map(function(k, i) {
                        return (
                          <th key={i} onClick={function() { setSortKpi(i) }} style={{ ...thS, minWidth: 110, whiteSpace: 'normal', lineHeight: 1.3, verticalAlign: 'bottom', paddingBottom: 6, color: sortKpi === i ? 'var(--blue)' : 'var(--tx3)', background: sortKpi === i ? 'rgba(59,130,246,.08)' : 'var(--surf2)' }}>
                            {k.ad}{sortKpi === i ? ' v' : ''}
                          </th>
                        )
                      })}
                      <th onClick={function() { setSortKpi(-1) }} style={{ ...thS, minWidth: 95, color: sortKpi === -1 ? '#f59e0b' : 'var(--tx3)', background: sortKpi === -1 ? 'rgba(245,158,11,.08)' : 'var(--surf2)', borderLeft: '2px solid var(--bd)' }}>
                        {'Genel' + (selCmpDonem ? ' / Onceki+Sira' : '') + (sortKpi === -1 ? ' v' : '')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {markalar.map(function(m, idx) {
                      return (
                        <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}
                          onMouseEnter={function(e) { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surf2)' }}
                          onMouseLeave={function(e) { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>
                          <td style={{ ...tdS, textAlign: 'left', fontWeight: 700, color: SEGMENT_HEX[m.segment], position: 'sticky', left: 0, background: 'var(--surf)', zIndex: 1 }}>{m.marka}</td>
                          <td style={{ ...tdS, position: 'sticky', left: 130, background: 'var(--surf)', zIndex: 1 }}>
                            <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_HEX[m.segment], padding: '2px 7px', borderRadius: 20, fontSize: 8, fontWeight: 700, border: '1px solid ' + SEGMENT_HEX[m.segment] + '44' }}>{m.segment}</span>
                          </td>
                          {m.bazSkorlar.map(function(skor, ki) {
                            const cmpSkor = m.cmpSkorlar ? m.cmpSkorlar[ki] ?? null : null
                            return (
                              <td key={ki} style={{ ...tdS, background: sortKpi === ki ? kpiScoreBg(skor) : undefined }}>
                                <SkorHucre skor={skor} cmpSkor={selCmpDonem ? cmpSkor : null} size="sm" />
                              </td>
                            )
                          })}
                          <GenelHucre score={m.score} cmpScore={m.cmpScore} bazRank={idx + 1} cmpRank={m.cmpRank} aktif={sortKpi === -1} />
                        </tr>
                      )
                    })}
                    {markalar.length === 0 && (
                      <tr><td colSpan={3 + KPI_META.length} style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>Veri bulunamadi</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '6px 14px', fontSize: 9, color: 'var(--tx3)', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
                {markalar.length} marka - uzerin gelindiginde asagi kaydirilabilir
              </div>
            </div>

            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{'Marka Karsilastirma - ' + kpiLabel}</span>
                <button onClick={function() { setSortKpi(-1) }} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (sortKpi === -1 ? '#f59e0b' : 'var(--bd)'), background: sortKpi === -1 ? 'rgba(245,158,11,.12)' : 'var(--surf2)', color: sortKpi === -1 ? '#f59e0b' : 'var(--tx3)' }}>Genel Skor</button>
              </div>
              <div style={{ height: 260 }}>
                <Bar data={barData} options={barOptions} plugins={[barValuePlugin]} />
              </div>
            </div>
          </div>
        )}

        {tab === 'kategori' && (
          <div>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div
                style={scrollWrap(katMarkalar.length)}
                onMouseEnter={function(e) { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'auto'; el.style.maxHeight = '520px' }}
                onMouseLeave={function(e) { const el = e.currentTarget as HTMLDivElement; el.style.overflowY = 'hidden'; el.style.maxHeight = String(Math.min(katMarkalar.length, 15) * 36 + 40) + 'px' }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surf2)' }}>
                    <tr>
                      <th style={{ ...thS, textAlign: 'left', minWidth: 130, position: 'sticky', left: 0, background: 'var(--surf2)', zIndex: 3 }}>Marka</th>
                      <th style={{ ...thS, minWidth: 72, position: 'sticky', left: 130, background: 'var(--surf2)', zIndex: 3 }}>Seg.</th>
                      {KAT_YAPILAR.map(function(kat) {
                        return (
                          <th key={kat.key} onClick={function() { setKatSortKey(kat.key) }} style={{ ...thS, minWidth: 90, whiteSpace: 'normal', lineHeight: 1.3, verticalAlign: 'bottom', paddingBottom: 6, color: katSortKey === kat.key ? 'var(--blue)' : 'var(--tx3)', background: katSortKey === kat.key ? 'rgba(59,130,246,.08)' : 'var(--surf2)' }}>
                            {kat.ad}{katSortKey === kat.key ? ' v' : ''}
                          </th>
                        )
                      })}
                      <th onClick={function() { setKatSortKey('genel') }} style={{ ...thS, minWidth: 95, color: katSortKey === 'genel' ? '#f59e0b' : 'var(--tx3)', background: katSortKey === 'genel' ? 'rgba(245,158,11,.08)' : 'var(--surf2)', borderLeft: '2px solid var(--bd)' }}>
                        {'Genel' + (selCmpDonem ? ' / Onceki+Sira' : '') + (katSortKey === 'genel' ? ' v' : '')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {katMarkalar.map(function(m, idx) {
                      return (
                        <tr key={m.marka} style={{ borderBottom: '1px solid var(--bd)' }}
                          onMouseEnter={function(e) { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surf2)' }}
                          onMouseLeave={function(e) { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>
                          <td style={{ ...tdS, textAlign: 'left', fontWeight: 700, color: SEGMENT_HEX[m.segment], position: 'sticky', left: 0, background: 'var(--surf)', zIndex: 1 }}>{m.marka}</td>
                          <td style={{ ...tdS, position: 'sticky', left: 130, background: 'var(--surf)', zIndex: 1 }}>
                            <span style={{ background: SEGMENT_BG[m.segment], color: SEGMENT_HEX[m.segment], padding: '2px 7px', borderRadius: 20, fontSize: 8, fontWeight: 700, border: '1px solid ' + SEGMENT_HEX[m.segment] + '44' }}>{m.segment}</span>
                          </td>
                          {KAT_YAPILAR.map(function(kat) {
                            const skor    = m.katSkor    ? (m.katSkor    as any)[kat.key] ?? 0 : 0
                            const cmpSkor = m.katSkorCmp ? (m.katSkorCmp as any)[kat.key] ?? null : null
                            return (
                              <td key={kat.key} style={{ ...tdS, background: katSortKey === kat.key ? kpiScoreBg(skor) : undefined }}>
                                <SkorHucre skor={skor} cmpSkor={selCmpDonem ? cmpSkor : null} size="sm" />
                              </td>
                            )
                          })}
                          <GenelHucre score={m.score} cmpScore={m.cmpScore} bazRank={idx + 1} cmpRank={m.cmpRank} aktif={katSortKey === 'genel'} />
                        </tr>
                      )
                    })}
                    {katMarkalar.length === 0 && (
                      <tr><td colSpan={2 + KAT_YAPILAR.length + 1} style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>Veri bulunamadi</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '6px 14px', fontSize: 9, color: 'var(--tx3)', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
                {katMarkalar.length} marka - uzerin gelindiginde asagi kaydirilabilir
              </div>
            </div>

            <div style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{'Marka Karsilastirma - ' + katLabel}</span>
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
