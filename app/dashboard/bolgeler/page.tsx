'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, kpiUnit, chgColor, chgBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const KATS = [
  {key:'musteri',    label:'Musteri'},
  {key:'ticari',     label:'Ticari'},
  {key:'operasyonel',label:'Operasyonel'},
  {key:'bayi',       label:'Bayi Agi'},
  {key:'kapsam',     label:'Kapsam'},
]

function chgPct(baz: number, cmp: number | null): number | null {
  if (!cmp) return null
  return Math.round((baz - cmp) / Math.abs(cmp) * 1000) / 10
}

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(3)
  const [activeTab, setActiveTab] = useState('skor')

  const bolgeList = selBolge ? [selBolge] : BOLGELER
  const meta = KPI_META[selKpi]
  const lob = isLowerBetter(selKpi)
  const unit = kpiUnit(meta.fmt)

  const trBaz = useMemo(function() {
    return getScore(selSeg, '', selYas, selDonem)
  }, [selSeg, selYas, selDonem])

  const trKpis = useMemo(function() {
    return getKpisFromCube(selSeg, '', selYas, selDonem)
  }, [selSeg, selYas, selDonem])

  const bolgeData = useMemo(function() {
    return bolgeList.map(function(b) {
      return {
        bolge: b,
        bazScore: getScore(selSeg, b, selYas, selDonem),
        cmpScore: selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null,
        bazKpis: getKpisFromCube(selSeg, b, selYas, selDonem),
        cmpKpis: selCmpDonem ? getKpisFromCube(selSeg, b, selYas, selCmpDonem) : null,
      }
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  const markalar = useMemo(function() {
    return getMarkaRanking(selSeg, '', selYas, selDonem)
  }, [selSeg, selYas, selDonem])

  const barBazData = bolgeList.map(function(b) {
    return getKpisFromCube(selSeg, b, selYas, selDonem)[selKpi] || 0
  })
  const barCmpData = bolgeList.map(function(b) {
    return selCmpDonem ? (getKpisFromCube(selSeg, b, selYas, selCmpDonem)[selKpi] || 0) : 0
  })
  const barMax = Math.max.apply(null, [trKpis[selKpi] || 0].concat(barBazData).concat(barCmpData).concat([0.001]))

  const tabs = [['skor', 'Skor Tablosu'], ['kpi', 'KPI Degerleri'], ['marka', 'Marka Detayi']]

  return (
    <div className={styles.wrap}>
      <Topbar title="Bolge Analizi" subtitle={bolgeList.length + ' bolge'}/>
      <div className={styles.content}>

        <div style={{display:'flex', gap:8, marginBottom:14}}>
          {tabs.map(function(t) {
            return (
              <button key={t[0]} onClick={function() { setActiveTab(t[0]) }}
                style={{padding:'6px 16px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                  border:'1px solid ' + (activeTab === t[0] ? 'var(--blue)' : 'var(--bd)'),
                  background: activeTab === t[0] ? 'rgba(59,130,246,.1)' : 'var(--surf2)',
                  color: activeTab === t[0] ? 'var(--blue)' : 'var(--tx2)'}}>
                {t[1]}
              </button>
            )
          })}
        </div>

        {activeTab === 'skor' && (
          <div className={styles.card} style={{padding:0, overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--surf2)'}}>
                    <th style={thS}>Bolge</th>
                    <th style={{...thS, textAlign:'center', minWidth:80}}>Genel Skor</th>
                    {KATS.map(function(k) {
                      return <th key={k.key} style={{...thS, textAlign:'center', minWidth:90}}>{k.label}</th>
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                    <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>Tum TR</td>
                    <td style={{...tdS, textAlign:'center'}}>
                      <span style={{fontFamily:'var(--font-dm-mono)', fontSize:14, fontWeight:800, color:scoreColor(trBaz ? trBaz.genel : 0)}}>
                        {trBaz ? trBaz.genel : '-'}
                      </span>
                    </td>
                    {KATS.map(function(k) {
                      const val = trBaz ? (trBaz[k.key as keyof typeof trBaz] as number || 0) : 0
                      return (
                        <td key={k.key} style={{...tdS, textAlign:'center'}}>
                          <span style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:scoreColor(val)}}>{val || '-'}</span>
                        </td>
                      )
                    })}
                  </tr>
                  {bolgeData.map(function(b) {
                    const bazG = b.bazScore ? b.bazScore.genel : 0
                    const cmpG = b.cmpScore ? b.cmpScore.genel : null
                    const chg = chgPct(bazG, cmpG)
                    return (
                      <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                        <td style={{...tdS, fontWeight:600, color:'var(--tx)'}}>{b.bolge}</td>
                        <td style={{...tdS, textAlign:'center', background:scoreBg(bazG)}}>
                          <div style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(bazG)}}>{bazG || '-'}</div>
                          {cmpG !== null && <div style={{fontSize:9, color:'var(--tx3)'}}>{cmpG}</div>}
                          {chg !== null && <div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg >= 0 ? '+' : ''}{chg}%</div>}
                        </td>
                        {KATS.map(function(k) {
                          const bazV = b.bazScore ? (b.bazScore[k.key as keyof typeof b.bazScore] as number || 0) : 0
                          const cmpV = b.cmpScore ? (b.cmpScore[k.key as keyof typeof b.cmpScore] as number || null) : null
                          const chgK = chgPct(bazV, cmpV)
                          return (
                            <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(bazV)}}>
                              <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:scoreColor(bazV)}}>{bazV || '-'}</div>
                              {cmpV !== null && chgK !== null && <div style={{fontSize:7, fontWeight:700, color:chgColor(chgK)}}>{chgK >= 0 ? '+' : ''}{chgK}%</div>}
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
        )}

        {activeTab === 'kpi' && (
          <div className={styles.card} style={{padding:0, overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--surf2)'}}>
                    <th style={thS}>Bolge</th>
                    {KPI_META.map(function(k, i) {
                      return (
                        <th key={i} onClick={function() { setSelKpi(i) }}
                          style={{...thS, textAlign:'center', cursor:'pointer', minWidth:72,
                            color: selKpi === i ? 'var(--blue)' : 'var(--tx3)',
                            background: selKpi === i ? 'rgba(59,130,246,.06)' : 'var(--surf2)'}}>
                          <div style={{fontSize:8, lineHeight:1.3, whiteSpace:'normal', wordBreak:'break-word'}}>
                            {k.ad}{kpiUnit(k.fmt) ? ' (' + kpiUnit(k.fmt) + ')' : ''}
                          </div>
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
                        <td key={i} style={{...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:'#fbbf24'}}>
                          {fmtKpi(v, KPI_META[i].fmt)}
                        </td>
                      )
                    })}
                  </tr>
                  {bolgeData.map(function(b) {
                    return (
                      <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                        <td style={{...tdS, fontWeight:600, color:'var(--tx)'}}>{b.bolge}</td>
                        {b.bazKpis.map(function(bazV, i) {
                          const trVal = trKpis[i] || 0
                          const cmpV = b.cmpKpis ? (b.cmpKpis[i] || null) : null
                          const hc = heatColor(bazV, trVal, !isLowerBetter(i))
                          const chg = chgPct(bazV, cmpV)
                          return (
                            <td key={i} onClick={function() { setSelKpi(i) }}
                              style={{...tdS, textAlign:'center', background:hc.bg, cursor:'pointer'}}>
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
            <div className={styles.card} style={{marginTop:14}}>
              <div className={styles.cardHd}>
                <h3>{meta.ad}{unit ? ' (' + unit + ')' : ''}</h3>
              </div>
              <div style={{height:220}}>
                <Bar data={{
                  labels: ['Tum TR'].concat(bolgeList),
                  datasets: [{
                    label: selDonem || 'Baz',
                    data: [trKpis[selKpi]].concat(barBazData),
                    backgroundColor: ['rgba(251,191,36,.15)'].concat(bolgeList.map(function() { return 'rgba(59,130,246,.15)' })),
                    borderColor: ['#fbbf24'].concat(bolgeList.map(function() { return '#3b82f6' })),
                    borderWidth: 2,
                    borderRadius: 5,
                  }]
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {legend:{display:false}},
                  scales: {
                    y: {min:0, grid:{color:'rgba(255,255,255,.05)'}, ticks:{color:'#8496b0', font:{size:9}}},
                    x: {grid:{display:false}, ticks:{color:'#8496b0', font:{size:9}, maxRotation:30}}
                  }
                }}/>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marka' && (
          <div className={styles.card} style={{padding:0, overflow:'hidden'}}>
            <div style={{overflowX:'auto', overflowY:'auto', maxHeight:480}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--surf2)', position:'sticky', top:0, zIndex:3}}>
                    <th style={thS}>Marka</th>
                    <th style={{...thS, textAlign:'center', color:'#fbbf24'}}>Tum TR</th>
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
                          <span style={{color:'var(--tx3)', fontSize:8, marginRight:3}}>{i+1}</span>
                          {m.marka}
                        </td>
                        <td style={{...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:'#fbbf24'}}>
                          {fmtKpi(trVal, meta.fmt)}
                        </td>
                        {bolgeList.map(function(b) {
                          const bazV = getKpisFromCube(m.segment, b, selYas, selDonem)[selKpi] || 0
                          const hc = heatColor(bazV, trVal, !isLowerBetter(selKpi))
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
        )}

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'6px 8px', borderBottom:'1px solid var(--bd)'}
