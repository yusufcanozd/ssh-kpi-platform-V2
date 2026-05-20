'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter, getSegAvg
} from '@/lib/kpi'
import styles from './page.module.css'

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number|'ov'>('ov')

  // Segment ortalamaları — seçili filtreler
  const segAvgs = useMemo(() =>
    SEGMENTLER
      .filter(s => !selSeg || s===selSeg)
      .map(s => ({ seg: s, kpis: getKpisFromCube(s, selBolge, selYas, selDonem) })),
    [selSeg, selBolge, selYas, selDonem])

  // Baz dönem sıralaması
  const markalar = useMemo(() =>
    getMarkaRanking(selSeg, selBolge, selYas, selDonem),
    [selSeg, selBolge, selYas, selDonem])

  // Karşılaştırma dönem sıralaması
  const marklarCmp = useMemo(() =>
    selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : [],
    [selSeg, selBolge, selYas, selCmpDonem])

  const filterLabel = [selBolge||'Tüm TR', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')
  const scoreColor = (v: number) => v>=80?'#10b981':v>=65?'#3b82f6':v>=50?'#f59e0b':'#ef4444'

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* Segment ortalamaları */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${segAvgs.length},1fr)`,gap:8,marginBottom:14}}>
          {segAvgs.map(s=>(
            <div key={s.seg} style={{background:'var(--surf2)',border:`1px solid ${SEGMENT_COLORS[s.seg]}44`,borderRadius:8,padding:'10px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:700,color:SEGMENT_COLORS[s.seg]}}>{s.seg} Segment Ort.</span>
                <span style={{fontSize:9,color:'var(--tx3)'}}>{filterLabel}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:4}}>
                {[0,2,3,4,5,6].map(i=>(
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{fontSize:8,color:'var(--tx3)',marginBottom:1}}>KPI {i+1}</div>
                    <div style={{fontSize:10,fontWeight:600,color:'var(--tx)',fontFamily:'var(--font-dm-mono)'}}>
                      {fmtKpi(s.kpis[i],KPI_META[i].fmt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tablo */}
        <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'var(--surf2)'}}>
                  <th style={thS}>#</th>
                  <th style={thS}>Marka</th>
                  <th style={thS}>Segment</th>
                  <th style={{...thS,color:sortKpi==='ov'?'var(--blue)':'var(--tx3)',
                    background:sortKpi==='ov'?'rgba(59,130,246,.08)':'var(--surf2)',cursor:'pointer',minWidth:90}}
                    onClick={()=>setSortKpi('ov')}>
                    Skor {selDonem||'Tüm'}{sortKpi==='ov'?' ↓':''}
                  </th>
                  {selCmpDonem && (
                    <th style={{...thS,color:'var(--tx3)',minWidth:90}}>
                      Skor {selCmpDonem}
                    </th>
                  )}
                  {selCmpDonem && <th style={thS}>Δ Puan</th>}
                  {selCmpDonem && <th style={thS}>Δ Sıra</th>}
                </tr>
              </thead>
              <tbody>
                {markalar.map((m,i)=>{
                  const cmpM    = marklarCmp.find(x=>x.marka===m.marka)
                  const cmpRank = marklarCmp.findIndex(x=>x.marka===m.marka)+1
                  const rankDiff= cmpRank>0 ? cmpRank-(i+1) : null
                  const scoreDiff=cmpM ? m.score-cmpM.score : null
                  const sc = scoreColor(m.score)

                  return (
                    <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                      <td style={tdS}>
                        <span style={{color:'var(--tx3)',fontFamily:'var(--font-dm-mono)',fontSize:10}}>{i+1}</span>
                      </td>
                      <td style={{...tdS,fontWeight:600,fontSize:12,color:SEGMENT_HEX[m.segment]||'var(--tx)'}}>
                        {m.marka}
                      </td>
                      <td style={tdS}>
                        <span style={{background:SEGMENT_BG[m.segment],color:SEGMENT_COLORS[m.segment],
                          padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,textTransform:'uppercase',
                          border:`1px solid ${SEGMENT_COLORS[m.segment]}44`}}>
                          {m.segment}
                        </span>
                      </td>
                      {/* Baz dönem skor + bar */}
                      <td style={tdS}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{flex:1,background:'var(--surf3)',borderRadius:6,height:5,overflow:'hidden',minWidth:50}}>
                            <div style={{width:`${m.score}%`,height:5,borderRadius:6,background:sc}}/>
                          </div>
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,
                            color:sc,minWidth:22,textAlign:'right'}}>
                            {m.score}
                          </span>
                        </div>
                      </td>
                      {/* Karşılaştırma dönem skoru */}
                      {selCmpDonem && (
                        <td style={tdS}>
                          {cmpM ? (
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{flex:1,background:'var(--surf3)',borderRadius:6,height:5,overflow:'hidden',minWidth:50}}>
                                <div style={{width:`${cmpM.score}%`,height:5,borderRadius:6,
                                  background:scoreColor(cmpM.score),opacity:.6}}/>
                              </div>
                              <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,
                                color:'var(--tx2)',minWidth:22,textAlign:'right'}}>
                                {cmpM.score}
                              </span>
                            </div>
                          ) : <span style={{color:'var(--tx3)',fontSize:10}}>—</span>}
                        </td>
                      )}
                      {/* Puan farkı */}
                      {selCmpDonem && (
                        <td style={{...tdS,fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,
                          color:scoreDiff===null?'var(--tx3)':scoreDiff>0?'#10b981':scoreDiff<0?'#f87171':'var(--tx3)'}}>
                          {scoreDiff===null?'—':scoreDiff>0?`+${scoreDiff}`:scoreDiff}
                        </td>
                      )}
                      {/* Sıra farkı */}
                      {selCmpDonem && (
                        <td style={{...tdS,fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,
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

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {
  padding:'9px 10px',textAlign:'left',fontSize:9,fontWeight:700,
  letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',
  borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'
}
const tdS: React.CSSProperties = {padding:'7px 10px',borderBottom:'1px solid var(--bd)'}
