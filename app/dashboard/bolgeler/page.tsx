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

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi,    setSelKpi]    = useState(3)
  const [selKat,    setSelKat]    = useState('musteri')
  const [activeTab, setActiveTab] = useState('skor')

  const bolgeList = selBolge ? [selBolge] : BOLGELER
  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)
  const unit = kpiUnit(meta.fmt)

  const trBaz  = useMemo(function() { return getScore(selSeg, '', selYas, selDonem) },  [selSeg, selYas, selDonem])
  const trCmp  = useMemo(function() { return selCmpDonem ? getScore(selSeg, '', selYas, selCmpDonem) : null }, [selSeg, selYas, selCmpDonem])
  const trKpis = useMemo(function() { return getKpisFromCube(selSeg, '', selYas, selDonem) }, [selSeg, selYas, selDonem])

  const bolgeData = useMemo(function() {
    return bolgeList.map(function(b) {
      return {
        bolge:    b,
        bazScore: getScore(selSeg, b, selYas, selDonem),
        cmpScore: selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null,
        bazKpis:  getKpisFromCube(selSeg, b, selYas, selDonem),
        cmpKpis:  selCmpDonem ? getKpisFromCube(selSeg, b, selYas, selCmpDonem) : null,
      }
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const markalar = useMemo(function() {
    return getMarkaRanking(selSeg, selBolge, selYas, selDonem).map(function(m) {
      return Object.assign({}, m, {
        bazKpis: getKpisFromCube(m.segment, selBolge, selYas, selDonem),
        cmpKpis: selCmpDonem ? getKpisFromCube(m.segment, selBolge, selYas, selCmpDonem) : null,
      })
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  // KPI bar — bolgeler
  const barKpiBaz = bolgeList.map(function(b) { return getKpisFromCube(selSeg, b, selYas, selDonem)[selKpi] || 0 })
  const barKpiCmp = bolgeList.map(function(b) { return selCmpDonem ? (getKpisFromCube(selSeg, b, selYas, selCmpDonem)[selKpi] || 0) : 0 })
  const barKpiMax = Math.max.apply(null, [trKpis[selKpi] || 0].concat(barKpiBaz).concat(barKpiCmp).concat([0.001]))

  // Kategori bar — seçili kategori, bolgeler
  const katKey = selKat as 'musteri'|'ticari'|'operasyonel'|'bayi'|'kapsam'
  const barKatBaz = bolgeList.map(function(b) {
    const s = getScore(selSeg, b, selYas, selDonem)
    return s ? (s[katKey] as number || 0) : 0
  })
  const barKatCmp = bolgeList.map(function(b) {
    if (!selCmpDonem) return 0
    const s = getScore(selSeg, b, selYas, selCmpDonem)
    return s ? (s[katKey] as number || 0) : 0
  })
  const trKatBaz = trBaz ? (trBaz[katKey] as number || 0) : 0
  const trKatCmp = trCmp ? (trCmp[katKey] as number || 0) : 0
  const barKatMax = Math.max.apply(null, [trKatBaz, trKatCmp].concat(barKatBaz).concat(barKatCmp).concat([10]))

  // Marka bar
  const barMarkaBaz = markalar.slice(0, 20).map(function(m) { return m.bazKpis[selKpi] || 0 })
  const barMarkaCmp = markalar.slice(0, 20).map(function(m) { return m.cmpKpis ? (m.cmpKpis[selKpi] || 0) : 0 })
  const barMarkaMax = Math.max.apply(null, barMarkaBaz.concat(barMarkaCmp).concat([0.001]))

  const tabs = [['skor','Skor'], ['kpi','KPI Degerleri'], ['marka','Marka']]

  return (
    <div className={styles.wrap}>
      <Topbar title="Bolge Analizi" subtitle={bolgeList.length + ' bolge'}/>
      <div className={styles.content}>

        <div style={{display:'flex', gap:8, marginBottom:14}}>
          {tabs.map(function(t) {
            return (
              <button key={t[0]} onClick={function() { setActiveTab(t[0]) }}
                style={{padding:'6px 16px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                  border: '1px solid ' + (activeTab === t[0] ? 'var(--blue)' : 'var(--bd)'),
                  background: activeTab === t[0] ? 'rgba(59,130,246,.1)' : 'var(--surf2)',
                  color: activeTab === t[0] ? 'var(--blue)' : 'var(--tx2)'}}>
                {t[1]}
              </button>
            )
          })}
        </div>

        {/* ══ SKOR TABLOSU ══ */}
        {activeTab === 'skor' && (
          <div>
            {/* Kategori kartları — ekran görüntüsü formatında */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:14}}>
              {KATS.map(function(k) {
                const trV   = trBaz  ? (trBaz[k.key  as keyof typeof trBaz]  as number || 0) : 0
                const trVC  = trCmp  ? (trCmp[k.key  as keyof typeof trCmp]  as number || 0) : 0
                const chg   = chgPct(trV, selCmpDonem ? trVC : null)
                const isAct = selKat === k.key
                return (
                  <div key={k.key} onClick={function() { setSelKat(k.key) }}
                    style={{background: isAct ? 'rgba(59,130,246,.08)' : 'var(--surf2)',
                      border: '1px solid ' + (isAct ? 'var(--blue)' : 'var(--bd)'),
                      borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'all .12s'}}>
                    <div style={{fontSize:10, fontWeight:700, color: isAct ? 'var(--blue)' : 'var(--tx2)', marginBottom:8}}>
                      {k.label}
                    </div>
                    <div style={{display:'flex', alignItems:'flex-end', gap:8}}>
                      <div>
                        {selDonem && <div style={{fontSize:7, color:'var(--tx3)', marginBottom:1}}>{selDonem}</div>}
                        <div style={{fontSize:28, fontWeight:800, fontFamily:'var(--font-dm-mono)',
                          color:scoreColor(trV), lineHeight:1}}>{trV || '-'}</div>
                        <div style={{fontSize:8, color:'var(--tx3)', marginTop:2}}>puan</div>
                      </div>
                      {selCmpDonem && (
                        <div style={{paddingBottom:4}}>
                          <div style={{fontSize:7, color:'var(--tx3)', marginBottom:1}}>{selCmpDonem}</div>
                          <div style={{fontSize:18, fontWeight:700, fontFamily:'var(--font-dm-mono)',
                            color:'var(--tx2)', lineHeight:1}}>{trVC}</div>
                        </div>
                      )}
                      {chg !== null && (
                        <div style={{marginLeft:'auto', paddingBottom:4, fontSize:12, fontWeight:700,
                          color: chg >= 0 ? '#10b981' : chg >= -10 ? '#f59e0b' : '#f87171'}}>
                          {chg >= 0 ? '+' : ''}{chg}%
                        </div>
                      )}
                    </div>
                    <div style={{background:'rgba(0,0,0,.12)', borderRadius:4, height:3, overflow:'hidden', marginTop:8}}>
                      <div style={{width: Math.min(trV, 100) + '%', height:3, borderRadius:4,
                        background: trV >= 100 ? 'rgba(16,185,129,.5)' : trV >= 90 ? 'rgba(245,158,11,.5)' : 'rgba(239,68,68,.45)'}}/>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bölge × Kategori tablosu */}
            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr style={{background:'var(--surf2)'}}>
                      <th style={thS}>Bolge</th>
                      <th style={{...thS, textAlign:'center', minWidth:80}}>Genel</th>
                      {KATS.map(function(k) {
                        return (
                          <th key={k.key} onClick={function() { setSelKat(k.key) }}
                            style={{...thS, textAlign:'center', minWidth:80, cursor:'pointer',
                              color: selKat === k.key ? 'var(--blue)' : 'var(--tx3)',
                              background: selKat === k.key ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                            {k.label}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                      <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                      <td style={{...tdS, textAlign:'center'}}>
                        <span style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(trBaz ? trBaz.genel : 0)}}>
                          {trBaz ? trBaz.genel : '-'}
                        </span>
                      </td>
                      {KATS.map(function(k) {
                        const v = trBaz ? (trBaz[k.key as keyof typeof trBaz] as number || 0) : 0
                        return <td key={k.key} style={{...tdS, textAlign:'center'}}><span style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:scoreColor(v)}}>{v}</span></td>
                      })}
                    </tr>
                    {bolgeData.map(function(b) {
                      const bazG = b.bazScore ? b.bazScore.genel : 0
                      const cmpG = b.cmpScore ? b.cmpScore.genel : null
                      const chg  = chgPct(bazG, cmpG)
                      return (
                        <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600}}>{b.bolge}</td>
                          <td style={{...tdS, textAlign:'center', background:scoreBg(bazG)}}>
                            <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:scoreColor(bazG)}}>{bazG || '-'}</div>
                            {cmpG !== null && <div style={{fontSize:8, color:'var(--tx3)'}}>{cmpG}</div>}
                            {chg !== null && <div style={{fontSize:7, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                          </td>
                          {KATS.map(function(k) {
                            const bv = b.bazScore ? (b.bazScore[k.key as keyof typeof b.bazScore] as number || 0) : 0
                            const cv = b.cmpScore ? (b.cmpScore[k.key as keyof typeof b.cmpScore] as number || null) : null
                            const cg = chgPct(bv, cv)
                            return (
                              <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(bv),
                                outline: selKat === k.key ? '2px solid var(--blue)' : 'none', outlineOffset:-1}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:scoreColor(bv)}}>{bv || '-'}</div>
                                {cv !== null && cg !== null && <div style={{fontSize:7, fontWeight:700, color:chgColor(cg)}}>{cg >= 0 ? '+' : ''}{cg}%</div>}
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

            {/* Kategori bar grafik */}
            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{KATS.find(function(k) { return k.key === selKat })?.label} Skoru — Bolge Karsilastirmasi</h3>
                <span className={styles.hint}>Kategori tıklayarak degistir</span>
              </div>
              <div style={{height:220}}>
                <Bar data={{
                  labels: ['Tum TR'].concat(bolgeList),
                  datasets: [{
                    label: selDonem || 'Baz',
                    data: [trKatBaz].concat(barKatBaz),
                    backgroundColor: ['rgba(251,191,36,.15)'].concat(bolgeList.map(function() { return 'rgba(59,130,246,.15)' })),
                    borderColor: ['#fbbf24'].concat(bolgeList.map(function() { return '#3b82f6' })),
                    borderWidth: 2, borderRadius: 5,
                  }].concat(selCmpDonem ? [{
                    label: selCmpDonem,
                    data: [trKatCmp].concat(barKatCmp),
                    backgroundColor: ['rgba(251,191,36,.5)'].concat(bolgeList.map(function() { return 'rgba(59,130,246,.5)' })),
                    borderColor: ['#fbbf24'].concat(bolgeList.map(function() { return '#3b82f6' })),
                    borderWidth: 1, borderRadius: 5,
                  }] : [])
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {legend:{display:!!selCmpDonem, position:'top', labels:{color:'#8496b0', font:{size:9}, boxWidth:10}}},
                  scales: {
                    y: {min:0, max:barKatMax * 1.2, grid:{color:'rgba(255,255,255,.05)'}, ticks:{color:'#8496b0', font:{size:9}}},
                    x: {grid:{display:false}, ticks:{color:'#8496b0', font:{size:9}, maxRotation:30}}
                  }
                }}/>
              </div>
            </div>
          </div>
        )}

        {/* ══ KPI DEGERLERI ══ */}
        {activeTab === 'kpi' && (
          <div>
            {/* 4x3 Segment kartları — ekran görüntüsü formatı */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:14}}>
              {KPI_META.map(function(k, i) {
                const trV  = trKpis[i] || 0
                const cmpKpis = selCmpDonem ? getKpisFromCube(selSeg, '', selYas, selCmpDonem) : null
                const trVC = cmpKpis ? (cmpKpis[i] || 0) : 0
                const chg  = chgPct(trV, selCmpDonem ? trVC : null)
                const isAct = selKpi === i
                return (
                  <div key={i} onClick={function() { setSelKpi(i) }}
                    style={{background: isAct ? 'rgba(59,130,246,.08)' : 'var(--surf2)',
                      border: '1px solid ' + (isAct ? 'var(--blue)' : 'var(--bd)'),
                      borderRadius:8, padding:'10px 10px 8px', cursor:'pointer', transition:'all .12s'}}>
                    <div style={{fontSize:8, lineHeight:1.3, marginBottom:6,
                      minHeight:20, display:'flex', alignItems:'center',
                      color: isAct ? 'var(--blue)' : 'var(--tx3)', fontWeight: isAct ? 600 : 400}}>
                      {k.ad}{unit ? ' (' + kpiUnit(k.fmt) + ')' : ''}
                    </div>
                    <div style={{display:'flex', alignItems:'flex-end', gap:5}}>
                      <div>
                        {selDonem && <div style={{fontSize:6, color:'var(--tx3)', marginBottom:1}}>{selDonem}</div>}
                        <div style={{fontSize:16, fontWeight:800, fontFamily:'var(--font-dm-mono)',
                          color: isAct ? 'var(--blue)' : 'var(--tx)', lineHeight:1}}>
                          {fmtKpi(trV, k.fmt)}
                        </div>
                      </div>
                      {selCmpDonem && (
                        <div style={{paddingBottom:2}}>
                          <div style={{fontSize:6, color:'var(--tx3)', marginBottom:1}}>{selCmpDonem}</div>
                          <div style={{fontSize:11, fontWeight:600, fontFamily:'var(--font-dm-mono)', color:'var(--tx2)', lineHeight:1}}>
                            {fmtKpi(trVC, k.fmt)}
                          </div>
                        </div>
                      )}
                      {chg !== null && (
                        <div style={{marginLeft:'auto', fontSize:9, fontWeight:700, color:chgColor(lob ? -chg : chg)}}>
                          {chg >= 0 ? '+' : ''}{chg}%
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tablo */}
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
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:10, fontWeight:700, color:hc.color}}>
                                  {fmtKpi(bazV, KPI_META[i].fmt)}
                                </div>
                                {cmpV !== null && chg !== null && (
                                  <div style={{fontSize:7, fontWeight:700, color:chgColor(isLowerBetter(i) ? -chg : chg)}}>
                                    {chg >= 0 ? '+' : ''}{chg}%
                                  </div>
                                )}
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

            {/* Bar grafik */}
            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{meta.ad}{unit ? ' (' + unit + ')' : ''} — Bolge Karsilastirmasi</h3>
              </div>
              <div style={{height:220}}>
                <Bar data={{
                  labels: ['Tum TR'].concat(bolgeList),
                  datasets: [{
                    label: selDonem || 'Baz',
                    data: [trKpis[selKpi]].concat(barKpiBaz),
                    backgroundColor: ['rgba(251,191,36,.15)'].concat(bolgeList.map(function() { return 'rgba(59,130,246,.15)' })),
                    borderColor: ['#fbbf24'].concat(bolgeList.map(function() { return '#3b82f6' })),
                    borderWidth: 2, borderRadius: 5,
                  }].concat(selCmpDonem ? [{
                    label: selCmpDonem,
                    data: [getKpisFromCube(selSeg, '', selYas, selCmpDonem)[selKpi]].concat(barKpiCmp),
                    backgroundColor: ['rgba(251,191,36,.5)'].concat(bolgeList.map(function() { return 'rgba(59,130,246,.5)' })),
                    borderColor: ['#fbbf24'].concat(bolgeList.map(function() { return '#3b82f6' })),
                    borderWidth: 1, borderRadius: 5,
                  }] : [])
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {legend:{display:!!selCmpDonem, position:'top', labels:{color:'#8496b0', font:{size:9}, boxWidth:10}},
                    tooltip:{callbacks:{label:function(ctx) { return ctx.label + ': ' + fmtKpi(ctx.parsed.y as number, meta.fmt) }}}},
                  scales: {
                    y: {min:0, max:barKpiMax * 1.2, grid:{color:'rgba(255,255,255,.05)'},
                      ticks:{color:'#8496b0', font:{size:9}, callback:function(v) { return fmtKpi(Number(v), meta.fmt) }}},
                    x: {grid:{display:false}, ticks:{color:'#8496b0', font:{size:9}, maxRotation:30}}
                  }
                }}/>
              </div>
            </div>
          </div>
        )}

        {/* ══ MARKA DETAYI ══ */}
        {activeTab === 'marka' && (
          <div>
            {/* KPI seçici */}
            <div style={{display:'flex', gap:4, marginBottom:10, flexWrap:'wrap'}}>
              {KPI_META.map(function(k, i) {
                return (
                  <button key={i} onClick={function() { setSelKpi(i) }}
                    style={{padding:'3px 8px', borderRadius:4, fontSize:8, cursor:'pointer',
                      border: '1px solid ' + (selKpi === i ? 'var(--blue)' : 'var(--bd)'),
                      background: selKpi === i ? 'rgba(59,130,246,.1)' : 'transparent',
                      color: selKpi === i ? 'var(--blue)' : 'var(--tx3)'}}>
                    {k.ad.substring(0, 14)}
                  </button>
                )
              })}
            </div>

            {/* Marka tablosu */}
            <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
              <div style={{overflowX:'auto', overflowY:'auto', maxHeight:400}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, tableLayout:'auto'}}>
                  <thead>
                    <tr style={{background:'var(--surf2)', position:'sticky', top:0, zIndex:3}}>
                      <th style={{...thS, minWidth:120}}>Marka</th>
                      <th style={{...thS, textAlign:'center', color:'#fbbf24', minWidth:80}}>Tum TR</th>
                      {bolgeList.map(function(b) {
                        return <th key={b} style={{...thS, textAlign:'center', minWidth:80}}>{b}</th>
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {markalar.map(function(m, i) {
                      const trVal = getKpisFromCube(m.segment, '', selYas, selDonem)[selKpi] || 0
                      return (
                        <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{...tdS, fontWeight:600, color:SEGMENT_HEX[m.segment] || 'var(--tx)', whiteSpace:'nowrap'}}>
                            <span style={{color:'var(--tx3)', fontSize:8, marginRight:3}}>{i + 1}</span>
                            {m.marka}
                          </td>
                          <td style={{...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:'#fbbf24'}}>
                            {fmtKpi(trVal, meta.fmt)}
                          </td>
                          {bolgeList.map(function(b) {
                            const bazV = getKpisFromCube(m.segment, b, selYas, selDonem)[selKpi] || 0
                            const hc   = heatColor(bazV, trVal, !isLowerBetter(selKpi))
                            return (
                              <td key={b} style={{...tdS, textAlign:'center', background:hc.bg}}>
                                <div style={{fontFamily:'var(--font-dm-mono)', fontSize:10, fontWeight:700, color:hc.color}}>
                                  {fmtKpi(bazV, meta.fmt)}
                                </div>
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

            {/* Marka bar grafik */}
            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h3>{meta.ad}{unit ? ' (' + unit + ')' : ''} — Marka Karsilastirmasi</h3>
                <span className={styles.hint}>Ilk 20 marka</span>
              </div>
              <div style={{overflowX:'auto'}}>
                <div style={{minWidth: markalar.slice(0,20).length * 52, height:240}}>
                  <Bar data={{
                    labels: markalar.slice(0, 20).map(function(m) { return m.marka }),
                    datasets: [{
                      label: selDonem || 'Baz',
                      data: barMarkaBaz,
                      backgroundColor: markalar.slice(0, 20).map(function(m) { return SEGMENT_HEX[m.segment] + '22' }),
                      borderColor:     markalar.slice(0, 20).map(function(m) { return SEGMENT_HEX[m.segment] }),
                      borderWidth: 2, borderRadius: 5,
                    }].concat(selCmpDonem ? [{
                      label: selCmpDonem,
                      data: barMarkaCmp,
                      backgroundColor: markalar.slice(0, 20).map(function(m) { return SEGMENT_HEX[m.segment] + '66' }),
                      borderColor:     markalar.slice(0, 20).map(function(m) { return SEGMENT_HEX[m.segment] }),
                      borderWidth: 1, borderRadius: 5,
                    }] : [])
                  }} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: {legend:{display:!!selCmpDonem, position:'top', labels:{color:'#8496b0', font:{size:9}, boxWidth:10}},
                      tooltip:{callbacks:{label:function(ctx) { return ctx.dataset.label + ': ' + fmtKpi(ctx.parsed.y as number, meta.fmt) }}}},
                    scales: {
                      y: {min:0, max:barMarkaMax * 1.2, grid:{color:'rgba(255,255,255,.05)'},
                        ticks:{color:'#8496b0', font:{size:9}, callback:function(v) { return fmtKpi(Number(v), meta.fmt) }}},
                      x: {grid:{display:false}, ticks:{color:'#8496b0', font:{size:8}, maxRotation:45, autoSkip:false}}
                    }
                  }}/>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'6px 8px', borderBottom:'1px solid var(--bd)'}
