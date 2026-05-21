'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, kpiUnit, chgColor, chgBg,
  getKpiScores, kpiScoreColor, kpiScoreBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const KATS = [
  { key: 'genel',       label: 'Genel Skor' },
  { key: 'musteri',     label: 'Musteri' },
  { key: 'ticari',      label: 'Ticari' },
  { key: 'operasyonel', label: 'Operasyonel' },
  { key: 'bayi',        label: 'Bayi Agi' },
  { key: 'kapsam',      label: 'Kapsam' },
]

function chgPct(baz: number, cmp: number | null): number | null {
  if (!cmp) return null
  return Math.round((baz - cmp) / Math.abs(cmp) * 1000) / 10
}

function ScoreCard({ label, bazG, cmpG, bazDonem, cmpDonem, isActive, onClick }: {
  label: string; bazG: number; cmpG: number | null
  bazDonem: string; cmpDonem: string; isActive: boolean; onClick: () => void
}) {
  const chg = chgPct(bazG, cmpG)
  const chgColor2 = chg === null ? 'var(--tx3)' : chg >= 0 ? '#10b981' : chg >= -10 ? '#f59e0b' : '#f87171'
  return (
    <div onClick={onClick} style={{
      background: isActive ? scoreBg(bazG) : 'var(--surf2)',
      border: '1px solid ' + (isActive ? scoreColor(bazG) : 'var(--bd)'),
      borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all .12s'
    }}>
      <div style={{fontSize: 10, fontWeight: 700, color: isActive ? scoreColor(bazG) : 'var(--tx2)', marginBottom: 8}}>{label}</div>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 8}}>
        <div>
          {bazDonem && <div style={{fontSize: 7, color: 'var(--tx3)', marginBottom: 1}}>{bazDonem}</div>}
          <div style={{fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-dm-mono)', color: scoreColor(bazG), lineHeight: 1}}>{bazG || '-'}</div>
          <div style={{fontSize: 7, color: 'var(--tx3)', marginTop: 1}}>puan</div>
        </div>
        {cmpG !== null && (
          <div style={{paddingBottom: 3}}>
            {cmpDonem && <div style={{fontSize: 7, color: 'var(--tx3)', marginBottom: 1}}>{cmpDonem}</div>}
            <div style={{fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: 'var(--tx2)', lineHeight: 1}}>{cmpG}</div>
          </div>
        )}
        {chg !== null && (
          <div style={{marginLeft: 'auto', paddingBottom: 3, fontSize: 11, fontWeight: 700, color: chgColor2}}>
            {chg >= 0 ? '+' : ''}{chg}%
          </div>
        )}
      </div>
      <div style={{background: 'rgba(0,0,0,.12)', borderRadius: 4, height: 3, overflow: 'hidden', marginTop: 8}}>
        <div style={{width: Math.min(bazG, 100) + '%', height: 3, borderRadius: 4,
          background: bazG >= 100 ? 'rgba(16,185,129,.5)' : bazG >= 90 ? 'rgba(245,158,11,.5)' : 'rgba(239,68,68,.45)'}}/>
      </div>
    </div>
  )
}

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi,    setSelKpi]    = useState(3)
  const [selKat,    setSelKat]    = useState('genel')
  const [activeTab, setActiveTab] = useState('katSkor')

  const bolgeList = selBolge ? [selBolge] : BOLGELER
  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)
  const unit = kpiUnit(meta.fmt)

  const trBaz  = useMemo(function() { return getScore(selSeg, '', selYas, selDonem) },  [selSeg, selYas, selDonem])
  const trCmp  = useMemo(function() { return selCmpDonem ? getScore(selSeg, '', selYas, selCmpDonem) : null }, [selSeg, selYas, selCmpDonem])
  const trKpis = useMemo(function() { return getKpisFromCube(selSeg, '', selYas, selDonem) }, [selSeg, selYas, selDonem])
  const trKpisCmp = useMemo(function() { return selCmpDonem ? getKpisFromCube(selSeg, '', selYas, selCmpDonem) : null }, [selSeg, selYas, selCmpDonem])

  const bolgeData = useMemo(function() {
    return bolgeList.map(function(b) {
      return {
        bolge: b,
        bazScore: getScore(selSeg, b, selYas, selDonem),
        cmpScore: selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null,
        bazKpis:  getKpisFromCube(selSeg, b, selYas, selDonem),
        cmpKpis:  selCmpDonem ? getKpisFromCube(selSeg, b, selYas, selCmpDonem) : null,
        bazKpiScores: getKpiScores(selSeg, b, selYas, selDonem),
        cmpKpiScores: selCmpDonem ? getKpiScores(selSeg, b, selYas, selCmpDonem) : null,
      }
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const markalar = useMemo(function() {
    return getMarkaRanking(selSeg, selBolge, selYas, selDonem).map(function(m) {
      return Object.assign({}, m, {
        bazKpis:       getKpisFromCube(m.segment, selBolge, selYas, selDonem),
        cmpKpis:       selCmpDonem ? getKpisFromCube(m.segment, selBolge, selYas, selCmpDonem) : null,
        bazKpiScores:  getKpiScores(m.segment, selBolge, selYas, selDonem),
        cmpKpiScores:  selCmpDonem ? getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null,
        cmpScore: selCmpDonem ? (getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem).find(function(x) { return x.marka === m.marka }) || {score:0}).score : null,
      })
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  // Bölge skorları — seçili kategori için bar
  function getBolgeKatVal(b: string, donem: string, key: string): number {
    const s = getScore(selSeg, b, selYas, donem)
    if (!s) return 0
    if (key === 'genel') return s.genel
    return (s[key as keyof typeof s] as number) || 0
  }

  // KPI bar — bölgeler
  const barKpiBaz = bolgeList.map(function(b) { return getKpisFromCube(selSeg, b, selYas, selDonem)[selKpi] || 0 })
  const barKpiCmp = bolgeList.map(function(b) { return selCmpDonem ? (getKpisFromCube(selSeg, b, selYas, selCmpDonem)[selKpi] || 0) : 0 })
  const barKpiMax = Math.max.apply(null, [trKpis[selKpi] || 0].concat(barKpiBaz).concat(barKpiCmp).concat([0.001]))

  // Kat bar
  const trKatBaz = trBaz ? (selKat === 'genel' ? trBaz.genel : ((trBaz[selKat as keyof typeof trBaz] as number) || 0)) : 0
  const trKatCmp = trCmp ? (selKat === 'genel' ? trCmp.genel : ((trCmp[selKat as keyof typeof trCmp] as number) || 0)) : 0
  const barKatBaz = bolgeList.map(function(b) { return getBolgeKatVal(b, selDonem, selKat) })
  const barKatCmp = bolgeList.map(function(b) { return selCmpDonem ? getBolgeKatVal(b, selCmpDonem, selKat) : 0 })
  const barKatMax = Math.max.apply(null, [trKatBaz, trKatCmp].concat(barKatBaz).concat(barKatCmp).concat([10]))

  // KPI Skor bar
  const trKpiScores = useMemo(function() { return getKpiScores(selSeg, '', selYas, selDonem) }, [selSeg, selYas, selDonem])
  const trKpiScoresCmp = useMemo(function() { return selCmpDonem ? getKpiScores(selSeg, '', selYas, selCmpDonem) : null }, [selSeg, selYas, selCmpDonem])
  const barKpiScoreBaz = bolgeList.map(function(b) { return getKpiScores(selSeg, b, selYas, selDonem)[selKpi] || 0 })
  const barKpiScoreCmp = bolgeList.map(function(b) { return selCmpDonem ? (getKpiScores(selSeg, b, selYas, selCmpDonem)[selKpi] || 0) : 0 })
  const barKpiScoreMax = Math.max.apply(null, [trKpiScores[selKpi] || 0].concat(barKpiScoreBaz).concat(barKpiScoreCmp).concat([10]))

  // Marka bar
  const barMarkaBaz = markalar.slice(0, 20).map(function(m) { return m.bazKpis[selKpi] || 0 })
  const barMarkaCmp = markalar.slice(0, 20).map(function(m) { return m.cmpKpis ? (m.cmpKpis[selKpi] || 0) : 0 })
  const barMarkaMax = Math.max.apply(null, barMarkaBaz.concat(barMarkaCmp).concat([0.001]))
  const barMarkaScoreBaz = markalar.slice(0, 20).map(function(m) { return m.bazKpiScores[selKpi] || 0 })
  const barMarkaScoreCmp = markalar.slice(0, 20).map(function(m) { return m.cmpKpiScores ? (m.cmpKpiScores[selKpi] || 0) : 0 })

  function barChart(labels: string[], bazData: number[], cmpData: number[], maxVal: number, fmt: string, usePuan: boolean) {
    const bgBaz = labels.map(function(_, i) { return i === 0 ? 'rgba(251,191,36,.15)' : 'rgba(59,130,246,.15)' })
    const bdBaz = labels.map(function(_, i) { return i === 0 ? '#fbbf24' : '#3b82f6' })
    const bgCmp = labels.map(function(_, i) { return i === 0 ? 'rgba(251,191,36,.5)' : 'rgba(59,130,246,.5)' })
    const ds: any[] = [{label: selDonem || 'Baz', data: bazData, backgroundColor: bgBaz, borderColor: bdBaz, borderWidth: 2, borderRadius: 5}]
    if (selCmpDonem) ds.push({label: selCmpDonem, data: cmpData, backgroundColor: bgCmp, borderColor: bdBaz, borderWidth: 1, borderRadius: 5})
    return (
      <Bar data={{
        labels: labels,
        datasets: ds
      }} options={{
        responsive: true, maintainAspectRatio: false,
        plugins: {legend:{display:!!selCmpDonem, position:'top', labels:{color:'#8496b0', font:{size:9}, boxWidth:10}},
          tooltip:{callbacks:{label:function(ctx) {
            return ctx.dataset.label + ': ' + (usePuan ? ctx.parsed.y + ' puan' : fmtKpi(ctx.parsed.y as number, fmt))
          }}}},
        scales: {
          y: {min:0, max:maxVal * 1.2, grid:{color:'rgba(255,255,255,.05)'},
            ticks:{color:'#8496b0', font:{size:9}, callback:function(v) {
              return usePuan ? v + '' : fmtKpi(Number(v), fmt)
            }}},
          x: {grid:{display:false}, ticks:{color:'#8496b0', font:{size:9}, maxRotation:30}}
        }
      }}/>
    )
  }

  const tabs = [
    ['katSkor',  'Kategori Skor'],
    ['kpiSkor',  'KPI Skor'],
    ['kpiDeger', 'KPI Degerleri'],
    ['markaSkor','Marka Skor'],
    ['markaKpi', 'Marka KPI'],
  ]

  return (
    <div className={styles.wrap}>
      <Topbar title="Bolge Analizi" subtitle={bolgeList.length + ' bolge'}/>
      <div className={styles.content}>

        {/* Tab seçici */}
        <div style={{display:'flex', gap:6, marginBottom:14, flexWrap:'wrap'}}>
          {tabs.map(function(t) {
            return (
              <button key={t[0]} onClick={function() { setActiveTab(t[0]) }}
                style={{padding:'6px 14px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                  border: '1px solid ' + (activeTab === t[0] ? 'var(--blue)' : 'var(--bd)'),
                  background: activeTab === t[0] ? 'rgba(59,130,246,.1)' : 'var(--surf2)',
                  color: activeTab === t[0] ? 'var(--blue)' : 'var(--tx2)'}}>
                {t[1]}
              </button>
            )
          })}
        </div>

        {/* ══ KATEGORİ SKOR ══ */}
        {activeTab === 'katSkor' && (
          <div>
            {/* Tablo */}
            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)'}}>
                      <th style={thS}>Bolge</th>
                      {KATS.map(function(k) {
                        return (
                          <th key={k.key} onClick={function() { setSelKat(k.key) }}
                            style={{...thS, textAlign:'center', minWidth:90, cursor:'pointer',
                              color: selKat === k.key ? 'var(--blue)' : 'var(--tx3)',
                              background: selKat === k.key ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            {k.label}{selKat === k.key ? ' ↓' : ''}
                          </th>
                        )
                      })}
                      <th style={{...thS, textAlign:'center', minWidth:80, position:'sticky', right:0, background:'var(--surf2)'}}>
                        Skor{selCmpDonem ? ' / ' + selCmpDonem.replace('20','') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                      <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                      {KATS.map(function(k) {
                        const v  = trBaz ? (k.key === 'genel' ? trBaz.genel  : ((trBaz[k.key  as keyof typeof trBaz]  as number) || 0)) : 0
                        const vc = trCmp ? (k.key === 'genel' ? trCmp.genel  : ((trCmp[k.key  as keyof typeof trCmp]  as number) || 0)) : null
                        const chg = chgPct(v, vc)
                        return (
                          <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(v),
                            outline: selKat === k.key ? '2px solid ' + scoreColor(v) + '77' : 'none', outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(v)}}>{v}</div>
                            {vc !== null && <div style={{fontSize:9, color:'var(--tx3)'}}>{vc}</div>}
                            {chg !== null && <div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                          </td>
                        )
                      })}
                      <td style={{...tdS, textAlign:'center', position:'sticky', right:0, background:'var(--surf)'}}>
                        <div style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(trBaz ? trBaz.genel : 0)}}>{trBaz ? trBaz.genel : '-'}</div>
                        {trCmp && <div style={{fontSize:9, color:'var(--tx3)'}}>{trCmp.genel}</div>}
                      </td>
                    </tr>
                    {bolgeData.map(function(b, bi) {
                      const bazG = b.bazScore ? b.bazScore.genel : 0
                      const cmpG = b.cmpScore ? b.cmpScore.genel : null
                      const allBazSorted = bolgeData.slice().sort(function(a,b2) { return (b2.bazScore ? b2.bazScore.genel : 0) - (a.bazScore ? a.bazScore.genel : 0) })
                      const allCmpSorted = bolgeData.slice().sort(function(a,b2) { return (b2.cmpScore ? b2.cmpScore.genel : 0) - (a.cmpScore ? a.cmpScore.genel : 0) })
                      const bazRank = allBazSorted.findIndex(function(x) { return x.bolge === b.bolge }) + 1
                      const cmpRank = selCmpDonem ? allCmpSorted.findIndex(function(x) { return x.bolge === b.bolge }) + 1 : null
                      const rankDiff = cmpRank ? bazRank - cmpRank : null
                      return (
                        <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600}}>{b.bolge}</td>
                          {KATS.map(function(k) {
                            const bv = b.bazScore ? (k.key === 'genel' ? b.bazScore.genel : ((b.bazScore[k.key as keyof typeof b.bazScore] as number) || 0)) : 0
                            const cv = b.cmpScore ? (k.key === 'genel' ? b.cmpScore.genel : ((b.cmpScore[k.key as keyof typeof b.cmpScore] as number) || null)) : null
                            const chg = chgPct(bv, cv)
                            return (
                              <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(bv),
                                outline: selKat === k.key ? '2px solid ' + scoreColor(bv) + '77' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:scoreColor(bv)}}>{bv || '-'}</div>
                                {cv !== null && <div style={{fontSize:9, color:'var(--tx3)'}}>{cv}</div>}
                                {chg !== null && <div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                              </td>
                            )
                          })}
                          <td style={{...tdS, textAlign:'center', position:'sticky', right:0, background:'var(--surf)'}}>
                            <div style={{display:'flex', alignItems:'center', gap:4}}>
                              <div style={{flex:1, background:'var(--surf3)', borderRadius:3, height:4, overflow:'hidden', minWidth:28}}>
                                <div style={{width:Math.min(bazG,100)+'%', height:4, borderRadius:3, background:scoreColor(bazG)+'99'}}/>
                              </div>
                              <div>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:scoreColor(bazG)}}>{bazG}</div>
                                {cmpG !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{cmpG}</div>}
                                {rankDiff !== null && (
                                  <div style={{fontSize:8, fontWeight:700, color:rankDiff > 0 ? '#10b981' : rankDiff < 0 ? '#f87171' : 'var(--tx3)'}}>
                                    {rankDiff > 0 ? '+' + rankDiff : rankDiff < 0 ? rankDiff : '-'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{KATS.find(function(k) { return k.key === selKat })?.label} — Bolge Karsilastirmasi</h3>
                <span className={styles.hint}>Kategori tıklayarak degistir</span>
              </div>
              <div style={{height:220}}>
                {barChart(['Tum TR'].concat(bolgeList), [trKatBaz].concat(barKatBaz), [trKatCmp].concat(barKatCmp), barKatMax, 'int', true)}
              </div>
            </div>
          </div>
        )}

        {/* ══ KPI SKOR ══ */}
        {activeTab === 'kpiSkor' && (
          <div>
            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)'}}>
                      <th style={thS}>Bolge</th>
                      {KATS.map(function(k) {
                        return (
                          <th key={k.key} onClick={function() { setSelKat(k.key) }}
                            style={{...thS, textAlign:'center', minWidth:90, cursor:'pointer',
                              color: selKat === k.key ? 'var(--blue)' : 'var(--tx3)',
                              background: selKat === k.key ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            {k.label}{selKat === k.key ? ' ↓' : ''}
                          </th>
                        )
                      })}
                      <th style={{...thS, textAlign:'center', minWidth:80, position:'sticky', right:0, background:'var(--surf2)'}}>
                        Skor{selCmpDonem ? ' / ' + selCmpDonem.replace('20','') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                      <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                      {KATS.map(function(k) {
                        const v  = trBaz ? (k.key === 'genel' ? trBaz.genel  : ((trBaz[k.key  as keyof typeof trBaz]  as number) || 0)) : 0
                        const vc = trCmp ? (k.key === 'genel' ? trCmp.genel  : ((trCmp[k.key  as keyof typeof trCmp]  as number) || 0)) : null
                        const chg = chgPct(v, vc)
                        return (
                          <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(v),
                            outline: selKat === k.key ? '2px solid ' + scoreColor(v) + '77' : 'none', outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(v)}}>{v}</div>
                            {vc !== null && <div style={{fontSize:9, color:'var(--tx3)'}}>{vc}</div>}
                            {chg !== null && <div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                          </td>
                        )
                      })}
                      <td style={{...tdS, textAlign:'center', position:'sticky', right:0, background:'var(--surf)'}}>
                        <div style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(trBaz ? trBaz.genel : 0)}}>{trBaz ? trBaz.genel : '-'}</div>
                        {trCmp && <div style={{fontSize:9, color:'var(--tx3)'}}>{trCmp.genel}</div>}
                      </td>
                    </tr>
                    {bolgeData.map(function(b, bi) {
                      const bazG = b.bazScore ? b.bazScore.genel : 0
                      const cmpG = b.cmpScore ? b.cmpScore.genel : null
                      const allBazSorted = bolgeData.slice().sort(function(a,b2) { return (b2.bazScore ? b2.bazScore.genel : 0) - (a.bazScore ? a.bazScore.genel : 0) })
                      const allCmpSorted = bolgeData.slice().sort(function(a,b2) { return (b2.cmpScore ? b2.cmpScore.genel : 0) - (a.cmpScore ? a.cmpScore.genel : 0) })
                      const bazRank = allBazSorted.findIndex(function(x) { return x.bolge === b.bolge }) + 1
                      const cmpRank = selCmpDonem ? allCmpSorted.findIndex(function(x) { return x.bolge === b.bolge }) + 1 : null
                      const rankDiff = cmpRank ? bazRank - cmpRank : null
                      return (
                        <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600}}>{b.bolge}</td>
                          {KATS.map(function(k) {
                            const bv = b.bazScore ? (k.key === 'genel' ? b.bazScore.genel : ((b.bazScore[k.key as keyof typeof b.bazScore] as number) || 0)) : 0
                            const cv = b.cmpScore ? (k.key === 'genel' ? b.cmpScore.genel : ((b.cmpScore[k.key as keyof typeof b.cmpScore] as number) || null)) : null
                            const chg = chgPct(bv, cv)
                            return (
                              <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(bv),
                                outline: selKat === k.key ? '2px solid ' + scoreColor(bv) + '77' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:scoreColor(bv)}}>{bv || '-'}</div>
                                {cv !== null && <div style={{fontSize:9, color:'var(--tx3)'}}>{cv}</div>}
                                {chg !== null && <div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                              </td>
                            )
                          })}
                          <td style={{...tdS, textAlign:'center', position:'sticky', right:0, background:'var(--surf)'}}>
                            <div style={{display:'flex', alignItems:'center', gap:4}}>
                              <div style={{flex:1, background:'var(--surf3)', borderRadius:3, height:4, overflow:'hidden', minWidth:28}}>
                                <div style={{width:Math.min(bazG,100)+'%', height:4, borderRadius:3, background:scoreColor(bazG)+'99'}}/>
                              </div>
                              <div>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:scoreColor(bazG)}}>{bazG}</div>
                                {cmpG !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{cmpG}</div>}
                                {rankDiff !== null && (
                                  <div style={{fontSize:8, fontWeight:700, color:rankDiff > 0 ? '#10b981' : rankDiff < 0 ? '#f87171' : 'var(--tx3)'}}>
                                    {rankDiff > 0 ? '+' + rankDiff : rankDiff < 0 ? rankDiff : '-'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{KATS.find(function(k) { return k.key === selKat })?.label} — Bolge Karsilastirmasi</h3>
                <span className={styles.hint}>Kategori tıklayarak degistir</span>
              </div>
              <div style={{height:220}}>
                {barChart(['Tum TR'].concat(bolgeList), [trKatBaz].concat(barKatBaz), [trKatCmp].concat(barKatCmp), barKatMax, 'int', true)}
              </div>
            </div>
          </div>
        )}

        {/* ══ KPI SKOR ══ */}
        {activeTab === 'kpiSkor' && (
          <div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:14}}>
              {KPI_META.map(function(k, i) {
                const trV  = trKpiScores[i] || 0
                const trVC = trKpiScoresCmp ? (trKpiScoresCmp[i] || 0) : 0
                const isAct = selKpi === i
                return (
                  <ScoreCard key={i} label={k.ad + (kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : '')}
                    bazG={trV} cmpG={selCmpDonem ? trVC : null}
                    bazDonem={selDonem} cmpDonem={selCmpDonem}
                    isActive={isAct} onClick={function() { setSelKpi(i) }}/>
                )
              })}
            </div>

            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)'}}>
                      <th style={thS}>Bolge</th>
                      {KPI_META.map(function(k, i) {
                        return (
                          <th key={i} onClick={function() { setSelKpi(i) }}
                            style={{...thS, textAlign:'center', cursor:'pointer', minWidth:68, whiteSpace:'normal', wordBreak:'break-word',
                              color: selKpi === i ? 'var(--blue)' : 'var(--tx3)',
                              background: selKpi === i ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            <div style={{fontSize:8, lineHeight:1.3}}>{k.ad}{kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : ''}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                      <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                      {trKpiScores.map(function(v, i) {
                        return (
                          <td key={i} style={{...tdS, textAlign:'center', background:kpiScoreBg(v), fontFamily:'var(--font-dm-mono)', fontWeight:700, color:kpiScoreColor(v)}}>
                            {v}
                          </td>
                        )
                      })}
                    </tr>
                    {bolgeData.map(function(b) {
                      return (
                        <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600}}>{b.bolge}</td>
                          {b.bazKpiScores.map(function(bv, i) {
                            const cv  = b.cmpKpiScores ? b.cmpKpiScores[i] : null
                            const chg = chgPct(bv, cv)
                            return (
                              <td key={i} onClick={function() { setSelKpi(i) }}
                                style={{...tdS, textAlign:'center', background:kpiScoreBg(bv), cursor:'pointer',
                                  outline: selKpi === i ? '2px solid ' + kpiScoreColor(bv) + '77' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:kpiScoreColor(bv)}}>{bv}</div>
                                {cv !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{cv}</div>}
                                {chg !== null && <div style={{fontSize:7, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{meta.ad} — KPI Puan Karsilastirmasi</h3>
              </div>
              <div style={{height:220}}>
                {barChart(['Tum TR'].concat(bolgeList), [trKpiScores[selKpi]].concat(barKpiScoreBaz), [trKpiScoresCmp ? trKpiScoresCmp[selKpi] : 0].concat(barKpiScoreCmp), barKpiScoreMax, 'int', true)}
              </div>
            </div>
          </div>
        )}

        {/* ══ KPI DEĞERLERİ ══ */}
        {activeTab === 'kpiDeger' && (
          <div>
            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)'}}>
                      <th style={thS}>Bolge</th>
                      {KPI_META.map(function(k, i) {
                        return (
                          <th key={i} onClick={function() { setSelKpi(i) }}
                            style={{...thS, textAlign:'center', cursor:'pointer', minWidth:68, whiteSpace:'normal', wordBreak:'break-word',
                              color: selKpi === i ? 'var(--blue)' : 'var(--tx3)',
                              background: selKpi === i ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            <div style={{fontSize:8, lineHeight:1.3}}>{k.ad}{kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : ''}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                      <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                      {trKpiScores.map(function(v, i) {
                        return (
                          <td key={i} style={{...tdS, textAlign:'center', background:kpiScoreBg(v), fontFamily:'var(--font-dm-mono)', fontWeight:700, color:kpiScoreColor(v)}}>
                            {v}
                          </td>
                        )
                      })}
                    </tr>
                    {bolgeData.map(function(b) {
                      return (
                        <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600}}>{b.bolge}</td>
                          {b.bazKpiScores.map(function(bv, i) {
                            const cv  = b.cmpKpiScores ? b.cmpKpiScores[i] : null
                            const chg = chgPct(bv, cv)
                            return (
                              <td key={i} onClick={function() { setSelKpi(i) }}
                                style={{...tdS, textAlign:'center', background:kpiScoreBg(bv), cursor:'pointer',
                                  outline: selKpi === i ? '2px solid ' + kpiScoreColor(bv) + '77' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:kpiScoreColor(bv)}}>{bv}</div>
                                {cv !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{cv}</div>}
                                {chg !== null && <div style={{fontSize:7, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{meta.ad} — KPI Puan Karsilastirmasi</h3>
              </div>
              <div style={{height:220}}>
                {barChart(['Tum TR'].concat(bolgeList), [trKpiScores[selKpi]].concat(barKpiScoreBaz), [trKpiScoresCmp ? trKpiScoresCmp[selKpi] : 0].concat(barKpiScoreCmp), barKpiScoreMax, 'int', true)}
              </div>
            </div>
          </div>
        )}

        {/* ══ KPI DEĞERLERİ ══ */}
        {activeTab === 'kpiDeger' && (
          <div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14}}>
              {KPI_META.map(function(k, i) {
                const trV  = trKpis[i] || 0
                const trVC = trKpisCmp ? (trKpisCmp[i] || 0) : 0
                const chg  = chgPct(trV, selCmpDonem ? trVC : null)
                const isAct = selKpi === i
                return (
                  <div key={i} onClick={function() { setSelKpi(i) }}
                    style={{background: isAct ? 'rgba(59,130,246,.08)' : 'var(--surf2)',
                      border: '1px solid ' + (isAct ? 'var(--blue)' : 'var(--bd)'),
                      borderRadius:8, padding:'12px 14px', cursor:'pointer', transition:'all .12s'}}>
                    <div style={{fontSize:10, fontWeight:600, lineHeight:1.4, marginBottom:8, color: isAct ? 'var(--blue)' : 'var(--tx2)'}}>
                      {k.ad}{kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : ''}
                    </div>
                    <div style={{display:'flex', alignItems:'flex-end', gap:8}}>
                      <div>
                        {selDonem && <div style={{fontSize:8, color:'var(--tx3)', marginBottom:2}}>{selDonem}</div>}
                        <div style={{fontSize:22, fontWeight:800, fontFamily:'var(--font-dm-mono)', color: isAct ? 'var(--blue)' : 'var(--tx)', lineHeight:1}}>{fmtKpi(trV, k.fmt)}</div>
                      </div>
                      {selCmpDonem && (
                        <div style={{paddingBottom:3}}>
                          <div style={{fontSize:8, color:'var(--tx3)', marginBottom:2}}>{selCmpDonem}</div>
                          <div style={{fontSize:14, fontWeight:600, fontFamily:'var(--font-dm-mono)', color:'var(--tx2)', lineHeight:1}}>{fmtKpi(trVC, k.fmt)}</div>
                        </div>
                      )}
                      {chg !== null && (
                        <div style={{marginLeft:'auto', paddingBottom:3, fontSize:12, fontWeight:700, color:chgColor(lob ? -chg : chg)}}>
                          {chg >= 0 ? '+' : ''}{chg}%
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)'}}>
                      <th style={thS}>Bolge</th>
                      {KPI_META.map(function(k, i) {
                        return (
                          <th key={i} onClick={function() { setSelKpi(i) }}
                            style={{...thS, textAlign:'center', cursor:'pointer', minWidth:72, whiteSpace:'normal', wordBreak:'break-word',
                              color: selKpi === i ? 'var(--blue)' : 'var(--tx3)',
                              background: selKpi === i ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            <div style={{fontSize:8, lineHeight:1.3}}>{k.ad}{kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : ''}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                      <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                      {trKpis.map(function(v, i) {
                        return (
                          <td key={i} style={{...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:'#fbbf24',
                            outline: selKpi === i ? '2px solid #fbbf2466' : 'none', outlineOffset:-1}}>
                            {fmtKpi(v, KPI_META[i].fmt)}
                          </td>
                        )
                      })}
                    </tr>
                    {bolgeData.map(function(b) {
                      return (
                        <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600}}>{b.bolge}</td>
                          {b.bazKpis.map(function(bazV, i) {
                            const trVal = trKpis[i] || 0
                            const cmpV  = b.cmpKpis ? (b.cmpKpis[i] || null) : null
                            const hc    = heatColor(bazV, trVal, !isLowerBetter(i))
                            const chg   = chgPct(bazV, cmpV)
                            return (
                              <td key={i} onClick={function() { setSelKpi(i) }}
                                style={{...tdS, textAlign:'center', background:hc.bg, cursor:'pointer',
                                  outline: selKpi === i ? '2px solid ' + hc.color + '55' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:hc.color}}>{fmtKpi(bazV, KPI_META[i].fmt)}</div>
                                {cmpV !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{fmtKpi(cmpV, KPI_META[i].fmt)}</div>}
                                {chg !== null && <div style={{fontSize:7, fontWeight:700, color:chgColor(isLowerBetter(i) ? -chg : chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}><h3>{meta.ad}{unit ? ' (' + unit + ')' : ''} — Bolge Karsilastirmasi</h3></div>
              <div style={{height:220}}>
                {barChart(['Tum TR'].concat(bolgeList), [trKpis[selKpi]].concat(barKpiBaz), [trKpisCmp ? trKpisCmp[selKpi] : 0].concat(barKpiCmp), barKpiMax, meta.fmt, false)}
              </div>
            </div>
          </div>
        )}

        {/* ══ MARKA SKOR — Kategoriler bazında ══ */}
        {activeTab === 'markaSkor' && (
          <div>
            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto', overflowY:'auto', maxHeight:480}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, tableLayout:'auto'}}>
                  <thead>
                    <tr style={{background:'var(--surf2)', position:'sticky', top:0, zIndex:3}}>
                      <th style={{...thS, minWidth:120}}>#  Marka</th>
                      <th style={{...thS, minWidth:65}}>Seg.</th>
                      {KATS.map(function(k) {
                        return (
                          <th key={k.key} onClick={function() { setSelKat(k.key) }}
                            style={{...thS, textAlign:'center', minWidth:80, cursor:'pointer',
                              color: selKat === k.key ? 'var(--blue)' : 'var(--tx3)',
                              background: selKat === k.key ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            {k.label}{selKat === k.key ? ' ↓' : ''}
                          </th>
                        )
                      })}
                      <th style={{...thS, textAlign:'center', minWidth:90, position:'sticky', right:0, background:'var(--surf2)'}}>
                        Skor{selCmpDonem ? ' / ' + selCmpDonem.replace('20','') : ''} / Δ Sıra
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {markalar.map(function(m, i) {
                      const cmpRanked = selCmpDonem ? markalar.slice().sort(function(a,b) { return (b.cmpScore || 0) - (a.cmpScore || 0) }) : []
                      const cmpRank = selCmpDonem ? cmpRanked.findIndex(function(x) { return x.marka === m.marka }) + 1 : null
                      const rankDiff = cmpRank ? (i + 1) - cmpRank : null
                      const sc = m.score >= 80 ? '#10b981' : m.score >= 65 ? '#3b82f6' : m.score >= 50 ? '#f59e0b' : '#ef4444'
                      return (
                        <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600, color:SEGMENT_HEX[m.segment] || 'var(--tx)', whiteSpace:'nowrap'}}>
                            <span style={{color:'var(--tx3)', fontSize:8, marginRight:4}}>{i+1}</span>{m.marka}
                          </td>
                          <td style={tdS}>
                            <span style={{background:SEGMENT_BG[m.segment], color:SEGMENT_COLORS[m.segment],
                              padding:'1px 5px', borderRadius:20, fontSize:8, fontWeight:700, textTransform:'uppercase',
                              border:'1px solid ' + SEGMENT_COLORS[m.segment] + '44'}}>
                              {m.segment}
                            </span>
                          </td>
                          {KATS.map(function(k) {
                            const getKatScore = function(seg: string, bolge: string, yas: string, donem: string, key: string) {
                              const s = getScore(seg, bolge, yas, donem)
                              if (!s) return 0
                              if (key === 'genel') return s.genel
                              return (s[key as keyof typeof s] as number) || 0
                            }
                            const bv = getKatScore(m.segment, selBolge, selYas, selDonem, k.key)
                            const cv = selCmpDonem ? getKatScore(m.segment, selBolge, selYas, selCmpDonem, k.key) : null
                            const chg = chgPct(bv, cv)
                            return (
                              <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(bv),
                                outline: selKat === k.key ? '2px solid ' + scoreColor(bv) + '77' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:scoreColor(bv)}}>{bv || '-'}</div>
                                {cv !== null && <div style={{fontSize:9, color:'var(--tx3)'}}>{cv}</div>}
                                {chg !== null && <div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                              </td>
                            )
                          })}
                          <td style={{...tdS, position:'sticky', right:0, background:'var(--surf)'}}>
                            <div style={{display:'flex', alignItems:'center', gap:4}}>
                              <div style={{flex:1, background:'var(--surf3)', borderRadius:3, height:4, overflow:'hidden', minWidth:28}}>
                                <div style={{width:m.score+'%', height:4, borderRadius:3, background:sc}}/>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:sc}}>{m.score}</div>
                                {m.cmpScore !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{m.cmpScore}</div>}
                                {rankDiff !== null && (
                                  <div style={{fontSize:8, fontWeight:700, color:rankDiff > 0 ? '#10b981' : rankDiff < 0 ? '#f87171' : 'var(--tx3)'}}>
                                    {rankDiff > 0 ? '+' + rankDiff : rankDiff < 0 ? rankDiff : '-'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}><h3>{KATS.find(function(k) { return k.key === selKat })?.label} — Marka Skor Karsilastirmasi</h3>
                <span className={styles.hint}>Kategori tıklayarak degistir</span>
              </div>
              <div style={{overflowX:'auto'}}><div style={{minWidth:markalar.slice(0,20).length*52, height:240}}>
                {barChart(
                  markalar.slice(0,20).map(function(m) { return m.marka }),
                  markalar.slice(0,20).map(function(m) {
                    const s = getScore(m.segment, selBolge, selYas, selDonem)
                    if (!s) return 0
                    if (selKat === 'genel') return s.genel
                    return (s[selKat as keyof typeof s] as number) || 0
                  }),
                  markalar.slice(0,20).map(function(m) {
                    if (!selCmpDonem) return 0
                    const s = getScore(m.segment, selBolge, selYas, selCmpDonem)
                    if (!s) return 0
                    if (selKat === 'genel') return s.genel
                    return (s[selKat as keyof typeof s] as number) || 0
                  }),
                  105, 'int', true
                )}
              </div></div>
            </div>
          </div>
        )}

        {/* ══ MARKA KPI ══ */}
        {activeTab === 'markaKpi' && (
          <div>
            <div style={{display:'flex', gap:4, marginBottom:10, flexWrap:'wrap'}}>
              {KPI_META.map(function(k, i) {
                return (
                  <button key={i} onClick={function() { setSelKpi(i) }}
                    style={{padding:'3px 10px', borderRadius:4, fontSize:10, cursor:'pointer', fontWeight: selKpi === i ? 700 : 400,
                      border: '1px solid ' + (selKpi === i ? 'var(--blue)' : 'var(--bd)'),
                      background: selKpi === i ? 'rgba(59,130,246,.1)' : 'transparent',
                      color: selKpi === i ? 'var(--blue)' : 'var(--tx3)'}}>
                    {k.ad}{kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : ''}
                  </button>
                )
              })}
            </div>

            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto', overflowY:'auto', maxHeight:400}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)', position:'sticky', top:0, zIndex:3}}>
                      <th style={{...thS, minWidth:120}}>Marka</th>
                      <th style={{...thS, textAlign:'center', color:'#fbbf24', minWidth:80}}>Tum TR</th>
                      {bolgeList.map(function(b) { return <th key={b} style={{...thS, textAlign:'center', minWidth:80}}>{b}</th> })}
                    </tr>
                  </thead>
                  <tbody>
                    {markalar.map(function(m, i) {
                      const trVal = getKpisFromCube(m.segment, '', selYas, selDonem)[selKpi] || 0
                      return (
                        <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600, color:SEGMENT_HEX[m.segment] || 'var(--tx)', whiteSpace:'nowrap'}}>
                            <span style={{color:'var(--tx3)', fontSize:8, marginRight:3}}>{i+1}</span>{m.marka}
                          </td>
                          <td style={{...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:'#fbbf24'}}>
                            {fmtKpi(trVal, meta.fmt)}
                          </td>
                          {bolgeList.map(function(b) {
                            const bv = getKpisFromCube(m.segment, b, selYas, selDonem)[selKpi] || 0
                            const hc = heatColor(bv, trVal, !isLowerBetter(selKpi))
                            return (
                              <td key={b} style={{...tdS, textAlign:'center', background:hc.bg}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:hc.color}}>{fmtKpi(bv, meta.fmt)}</div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHd}><h3>{meta.ad}{unit ? ' (' + unit + ')' : ''} — Marka Karsilastirmasi</h3></div>
              <div style={{overflowX:'auto'}}><div style={{minWidth:markalar.slice(0,20).length*52, height:240}}>
                {barChart(markalar.slice(0,20).map(function(m) { return m.marka }),
                  barMarkaBaz, barMarkaCmp, barMarkaMax, meta.fmt, false)}
              </div></div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'6px 8px', borderBottom:'1px solid var(--bd)'}
