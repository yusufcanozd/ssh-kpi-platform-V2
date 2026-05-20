'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter,
  getKpiScores, kpiScoreColor, kpiScoreBg, chgColor, chgBg
} from '@/lib/kpi'
import styles from './page.module.css'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number|'ov'>('ov')

  // Segment KPI puanları — baz + karşılaştırma dönem
  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s===selSeg).map(s => ({
      seg: s,
      bazScores: getKpiScores(s, selBolge, selYas, selDonem),
      cmpScores: selCmpDonem ? getKpiScores(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  // Marka sıralama — baz dönem
  const markalar = useMemo(() =>
    getMarkaRanking(selSeg, selBolge, selYas, selDonem),
    [selSeg, selBolge, selYas, selDonem])

  // Karşılaştırma dönem sıralaması
  const marklarCmp = useMemo(() =>
    selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : [],
    [selSeg, selBolge, selYas, selCmpDonem])

  // Marka KPI puanları — baz + cmp
  const markaScores = useMemo(() =>
    markalar.map(m => ({
      ...m,
      bazKpiScores: getKpiScores(m.segment, selBolge, selYas, selDonem),
      cmpKpiScores: selCmpDonem ? getKpiScores(m.segment, selBolge, selYas, selCmpDonem) : null,
    })),
    [markalar, selBolge, selYas, selDonem, selCmpDonem])

  const filterLabel = [selBolge||'Tüm TR', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')
  const scoreColor  = (v: number) => v>=80?'#10b981':v>=65?'#3b82f6':v>=50?'#f59e0b':'#ef4444'

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* ── Segment 4x3 KPI Puan Matrisi ── */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${segData.length},1fr)`,gap:10,marginBottom:16}}>
          {segData.map(s=>(
            <div key={s.seg} style={{
              background: SEGMENT_BG[s.seg],
              border:`1px solid ${SEGMENT_COLORS[s.seg]}55`,
              borderRadius:10, padding:'12px 14px'
            }}>
              {/* Başlık */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${SEGMENT_COLORS[s.seg]}33`}}>
                <span style={{fontSize:12,fontWeight:700,color:SEGMENT_COLORS[s.seg]}}>{s.seg}</span>
                <span style={{fontSize:9,color:'var(--tx3)'}}>{filterLabel}</span>
              </div>

              {/* 4x3 KPI puan grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                {KPI_META.map((k,i)=>{
                  const bazP  = s.bazScores[i]
                  const cmpP  = s.cmpScores?.[i] ?? null
                  const chg   = cmpP !== null && cmpP > 0
                    ? Math.round((bazP - cmpP) / cmpP * 100 * 10) / 10
                    : null
                  return (
                    <div key={k.no} style={{
                      background: kpiScoreBg(bazP),
                      border:`1px solid ${kpiScoreColor(bazP)}44`,
                      borderRadius:6, padding:'6px 8px', textAlign:'center'
                    }}>
                      {/* KPI adı */}
                      <div style={{fontSize:7,color:'var(--tx3)',lineHeight:1.3,marginBottom:6,
                        minHeight:20,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {k.ad}
                      </div>
                      {/* Baz + cmp + değişim — ekran görüntüsündeki format */}
                      <div style={{display:'flex',alignItems:'flex-end',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
                        {/* Baz puan — büyük */}
                        <div>
                          {selDonem && <div style={{fontSize:7,color:'var(--tx3)',marginBottom:1}}>{selDonem}</div>}
                          <div style={{fontSize:20,fontWeight:800,fontFamily:'var(--font-dm-mono)',
                            color:kpiScoreColor(bazP),lineHeight:1}}>
                            {bazP}
                          </div>
                          <div style={{fontSize:7,color:'var(--tx3)',marginTop:1}}>puan</div>
                        </div>
                        {/* Cmp puan + değişim */}
                        {cmpP !== null && (
                          <div style={{paddingBottom:4}}>
                            {selCmpDonem && <div style={{fontSize:7,color:'var(--tx3)',marginBottom:1}}>{selCmpDonem}</div>}
                            <div style={{fontSize:13,fontWeight:700,fontFamily:'var(--font-dm-mono)',
                              color:'var(--tx2)',lineHeight:1}}>
                              {cmpP}
                            </div>
                          </div>
                        )}
                        {chg !== null && (
                          <div style={{paddingBottom:5,marginLeft:'auto'}}>
                            <div style={{fontSize:10,fontWeight:700,color:chgColor(chg)}}>
                              {chg>=0?'▲ +':'▼ '}{Math.abs(chg)}%
                            </div>
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

        {/* ── Marka KPI Puan Tablosu ── */}
        <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto',overflowY:'auto',maxHeight:490,position:'relative'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,tableLayout:'auto'}}>
              <thead>
                <tr style={{background:'var(--surf2)',position:'sticky',top:0,zIndex:3}}>
                  <th style={thS}>#</th>
                  <th style={thS}>Marka</th>
                  <th style={thS}>Seg.</th>
                  {KPI_META.map((k,i)=>(
                    <th key={i} onClick={()=>setSortKpi(i)}
                      style={{...thS,cursor:'pointer',minWidth:68,textAlign:'center',
                        color:sortKpi===i?'var(--blue)':'var(--tx3)',
                        background:sortKpi===i?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                      <div style={{fontSize:8,lineHeight:1.3,whiteSpace:'normal',wordBreak:'break-word'}}>
                        {k.ad}
                      </div>
                      {sortKpi===i&&<span style={{fontSize:7}}>↓</span>}
                    </th>
                  ))}
                  <th onClick={()=>setSortKpi('ov')}
                    style={{...thS,cursor:'pointer',minWidth:80,position:'sticky',right:selCmpDonem?60:0,
                      color:sortKpi==='ov'?'var(--blue)':'var(--tx3)',
                      background:sortKpi==='ov'?'rgba(59,130,246,.08)':'var(--surf2)'}}>
                    Skor{sortKpi==='ov'?' ↓':''}
                  </th>
                  {selCmpDonem&&<th style={{...thS,position:'sticky',right:0,background:'var(--surf2)'}}>Δ Sıra</th>}
                </tr>
              </thead>
              <tbody>
                {markaScores.map((m,i)=>{
                  const cmpM     = marklarCmp.find(x=>x.marka===m.marka)
                  const cmpRank  = marklarCmp.findIndex(x=>x.marka===m.marka)+1
                  const rankDiff = cmpRank>0 ? cmpRank-(i+1) : null
                  const scoreDiff= cmpM ? m.score-cmpM.score : null
                  const sc       = scoreColor(m.score)

                  return (
                    <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                      <td style={tdS}><span style={{color:'var(--tx3)',fontFamily:'var(--font-dm-mono)',fontSize:9}}>{i+1}</span></td>
                      <td style={{...tdS,fontWeight:600,fontSize:11,color:SEGMENT_HEX[m.segment]||'var(--tx)',whiteSpace:'nowrap'}}>{m.marka}</td>
                      <td style={tdS}>
                        <span style={{background:SEGMENT_BG[m.segment],color:SEGMENT_COLORS[m.segment],
                          padding:'1px 6px',borderRadius:20,fontSize:8,fontWeight:700,textTransform:'uppercase',
                          border:`1px solid ${SEGMENT_COLORS[m.segment]}44`,whiteSpace:'nowrap'}}>
                          {m.segment}
                        </span>
                      </td>

                      {/* KPI puanları */}
                      {m.bazKpiScores.map((bazP,ki)=>{
                        const cmpP = m.cmpKpiScores?.[ki] ?? null
                        const chg  = cmpP !== null && cmpP > 0
                          ? Math.round((bazP-cmpP)/cmpP*100*10)/10
                          : null
                        return (
                          <td key={ki} style={{
                            ...tdS, textAlign:'center',
                            background: kpiScoreBg(bazP),
                            outline: sortKpi===ki?`2px solid ${kpiScoreColor(bazP)}66`:'none',
                            outlineOffset:-1
                          }}>
                            <div style={{fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,
                              color:kpiScoreColor(bazP)}}>
                              {bazP}
                            </div>
                            {cmpP !== null && (
                              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:2,marginTop:1}}>
                                <span style={{fontSize:8,color:'var(--tx3)',fontFamily:'var(--font-dm-mono)'}}>{cmpP}</span>
                                {chg !== null && (
                                  <span style={{fontSize:7,fontWeight:700,padding:'0 2px',borderRadius:2,
                                    background:chgBg(chg),color:chgColor(chg)}}>
                                    {chg>=0?'+':''}{chg}%
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Genel skor */}
                      <td style={{...tdS,position:'sticky',right:selCmpDonem?60:0,background:'var(--surf)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <div style={{flex:1,background:'var(--surf3)',borderRadius:4,height:4,overflow:'hidden',minWidth:32}}>
                            <div style={{width:`${m.score}%`,height:4,borderRadius:4,background:sc}}/>
                          </div>
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,color:sc,minWidth:20,textAlign:'right'}}>
                            {m.score}
                          </span>
                          {selCmpDonem&&cmpM&&(
                            <span style={{fontSize:9,fontWeight:600,
                              color:scoreDiff!==null&&scoreDiff>0?'#10b981':scoreDiff!==null&&scoreDiff<0?'#f87171':'var(--tx3)'}}>
                              {scoreDiff!==null&&scoreDiff>0?`+${scoreDiff}`:scoreDiff}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sıra farkı */}
                      {selCmpDonem&&(
                        <td style={{...tdS,fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,
                          textAlign:'center',position:'sticky',right:0,background:'var(--surf)',
                          color:rankDiff===null?'var(--tx3)':rankDiff>0?'#10b981':rankDiff<0?'#f87171':'var(--tx3)'}}>
                          {rankDiff===null?'—':rankDiff>0?`▲${rankDiff}`:rankDiff<0?`▼${Math.abs(rankDiff)}`:'—'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Marka Skor Bar Grafiği ── */}
        <div className={styles.card} style={{marginTop:14}}>
          <div className={styles.cardHd}>
            <h3>Marka Skor Karşılaştırması</h3>
            <span className={styles.hint}>
              {selDonem||'Tüm Dönem'}{selCmpDonem?` vs ${selCmpDonem}`:''} · {selSeg||'Tüm Segmentler'}
            </span>
          </div>
          <div style={{overflowX:'auto'}}>
            <div style={{minWidth:markalar.length*52,height:300}}>
              <Bar
                data={{
                  labels: markalar.map(m=>m.marka),
                  datasets:[
                    {
                      label: selDonem||'Baz Dönem',
                      data: markalar.map(m=>m.score),
                      backgroundColor: markalar.map(m=>SEGMENT_HEX[m.segment]+'22'),
                      borderColor: markalar.map(m=>SEGMENT_HEX[m.segment]),
                      borderWidth:2, borderRadius:5,
                    },
                    ...(selCmpDonem?[{
                      label: selCmpDonem,
                      data: markalar.map(m=>marklarCmp.find(x=>x.marka===m.marka)?.score??0),
                      backgroundColor: markalar.map(m=>SEGMENT_HEX[m.segment]+'66'),
                      borderColor: markalar.map(m=>SEGMENT_HEX[m.segment]),
                      borderWidth:1, borderRadius:5,
                    }]:[])
                  ]
                }}
                options={{
                  responsive:true, maintainAspectRatio:false,
                  plugins:{
                    legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:10},boxWidth:12}},
                    tooltip:{callbacks:{
                      title:(items)=>{const m=markalar[items[0].dataIndex];return `${m.marka} (${m.segment})`},
                      label:(ctx)=>`${ctx.dataset.label}: ${ctx.parsed.y} puan`
                    }}
                  },
                  scales:{
                    y:{min:40,max:105,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9}}},
                    x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:8},maxRotation:45,autoSkip:false}}
                  }
                }}/>
            </div>
          </div>
          <div style={{display:'flex',gap:14,marginTop:8,paddingTop:8,borderTop:'1px solid var(--bd)',flexWrap:'wrap'}}>
            {['Mass','Premium','EV'].filter(s=>!selSeg||s===selSeg).map(s=>(
              <div key={s} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
                <div style={{width:12,height:10,borderRadius:2,background:SEGMENT_HEX[s]+'44',border:`1px solid ${SEGMENT_HEX[s]}`}}/>
                {s}
              </div>
            ))}
            <div style={{display:'flex',gap:10,marginLeft:'auto',flexWrap:'wrap'}}>
              {[{c:'#10b981',l:'≥100 puan'},{c:'#f59e0b',l:'90–100'},{c:'#ef4444',l:'<90 puan'}].map(x=>(
                <div key={x.l} style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'var(--tx3)'}}>
                  <div style={{width:8,height:8,borderRadius:2,background:x.c+'44',border:`1px solid ${x.c}`}}/>
                  {x.l}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {
  padding:'8px 10px', textAlign:'left', fontSize:9, fontWeight:700,
  letterSpacing:'.06em', textTransform:'uppercase', color:'var(--tx3)',
  borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'
}
const tdS: React.CSSProperties = {padding:'6px 8px', borderBottom:'1px solid var(--bd)'}
