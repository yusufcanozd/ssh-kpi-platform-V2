'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter
} from '@/lib/kpi'
import styles from './page.module.css'

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number|'ov'>('ov')

  // Segment ortalamaları — tüm 12 KPI
  const segAvgs = useMemo(() =>
    SEGMENTLER
      .filter(s => !selSeg || s===selSeg)
      .map(s => ({ seg: s, kpis: getKpisFromCube(s, selBolge, selYas, selDonem) })),
    [selSeg, selBolge, selYas, selDonem])

  // Marka sıralaması — baz dönem
  const markalar = useMemo(() =>
    getMarkaRanking(selSeg, selBolge, selYas, selDonem),
    [selSeg, selBolge, selYas, selDonem])

  // Karşılaştırma dönem sıralaması
  const marklarCmp = useMemo(() =>
    selCmpDonem ? getMarkaRanking(selSeg, selBolge, selYas, selCmpDonem) : [],
    [selSeg, selBolge, selYas, selCmpDonem])

  const filterLabel = [selBolge||'Tüm TR', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')
  const scoreColor  = (v: number) => v>=80?'#10b981':v>=65?'#3b82f6':v>=50?'#f59e0b':'#ef4444'

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* ── Segment Ortalamaları — 12 KPI tam tablo ── */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${segAvgs.length},1fr)`,gap:10,marginBottom:16}}>
          {segAvgs.map(s=>{
            const hexBg  = SEGMENT_HEX_BG[s.seg]  // açık bg
            const hexClr = SEGMENT_HEX[s.seg]      // segment rengi
            const cssClr = SEGMENT_COLORS[s.seg]   // CSS var renk
            const cssBg  = SEGMENT_BG[s.seg]       // CSS var bg
            return (
              <div key={s.seg} style={{
                background: cssBg,
                border:`1px solid ${cssClr}55`,
                borderRadius:10, padding:'12px 14px'
              }}>
                {/* Başlık */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${cssClr}33`}}>
                  <span style={{fontSize:12,fontWeight:700,color:cssClr}}>{s.seg}</span>
                  <span style={{fontSize:9,color:'var(--tx3)'}}>{filterLabel}</span>
                </div>

                {/* 12 KPI — 4x3 grid */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                  {KPI_META.map((k,i)=>{
                    const v = s.kpis[i]
                    return (
                      <div key={k.no} style={{
                        background:'rgba(0,0,0,.12)',
                        borderRadius:6, padding:'6px 8px', textAlign:'center'
                      }}>
                        <div style={{fontSize:8,color:'var(--tx3)',lineHeight:1.3,marginBottom:3,minHeight:22,
                          display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {k.ad}
                        </div>
                        <div style={{fontSize:11,fontWeight:700,fontFamily:'var(--font-dm-mono)',color:'var(--tx)'}}>
                          {fmtKpi(v,k.fmt)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Marka KPI Tablosu ── */}
        <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
          {/* overflowX + sticky header: wrapper scroll, thead sticky */}
          <div style={{overflowX:'auto',overflowY:'auto',maxHeight:490,position:'relative'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,tableLayout:'auto'}}>
              <thead>
                <tr style={{background:'var(--surf2)',position:'sticky',top:0,zIndex:3}}>
                  <th style={thS}>#</th>
                  <th style={thS}>Marka</th>
                  <th style={thS}>Seg.</th>
                  {KPI_META.map((k,i)=>(
                    <th key={i} onClick={()=>setSortKpi(i)}
                      style={{...thS,cursor:'pointer',minWidth:68,maxWidth:90,textAlign:'center',
                        color:sortKpi===i?'var(--blue)':'var(--tx3)',
                        background:sortKpi===i?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                      <div style={{fontSize:8,lineHeight:1.3,whiteSpace:'normal',wordBreak:'break-word'}}>
                        {k.ad}
                      </div>
                      {sortKpi===i&&<span style={{fontSize:7}}>↓</span>}
                    </th>
                  ))}
                  <th onClick={()=>setSortKpi('ov')}
                    style={{...thS,cursor:'pointer',minWidth:80,position:'sticky',right:0,
                      color:sortKpi==='ov'?'var(--blue)':'var(--tx3)',
                      background:sortKpi==='ov'?'rgba(59,130,246,.08)':'var(--surf2)'}}>
                    Skor{sortKpi==='ov'?' ↓':''}
                    {selCmpDonem&&<div style={{fontSize:7,fontWeight:400,color:'var(--tx3)'}}>{selCmpDonem}</div>}
                  </th>
                  {selCmpDonem&&<th style={{...thS,position:'sticky',right:80,background:'var(--surf2)'}}>Δ Sıra</th>}
                </tr>
              </thead>
              <tbody>
                {markalar.map((m,i)=>{
                  const mKpis    = getKpisFromCube(m.segment, selBolge, selYas, selDonem)
                  const segAvg   = segAvgs.find(s=>s.seg===m.segment)?.kpis ?? []
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
                      {mKpis.map((v,ki)=>{
                        const ref = segAvg[ki]??0
                        const {bg,color} = heatColor(v,ref,!isLowerBetter(ki))
                        return (
                          <td key={ki} style={{...tdS,textAlign:'center',background:bg,color,
                            fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:500,
                            outline:sortKpi===ki?`2px solid ${color}55`:'none',outlineOffset:-1}}>
                            {fmtKpi(v,KPI_META[ki].fmt)}
                          </td>
                        )
                      })}
                      <td style={{...tdS,position:'sticky',right:selCmpDonem?80:0,background:'var(--surf)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <div style={{flex:1,background:'var(--surf3)',borderRadius:4,height:4,overflow:'hidden',minWidth:32}}>
                            <div style={{width:`${m.score}%`,height:4,borderRadius:4,background:sc}}/>
                          </div>
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,color:sc,minWidth:20,textAlign:'right'}}>{m.score}</span>
                          {selCmpDonem&&cmpM&&(
                            <span style={{fontSize:9,fontWeight:600,
                              color:scoreDiff!==null&&scoreDiff>0?'#10b981':scoreDiff!==null&&scoreDiff<0?'#f87171':'var(--tx3)'}}>
                              {scoreDiff!==null&&scoreDiff>0?`+${scoreDiff}`:scoreDiff}
                            </span>
                          )}
                        </div>
                      </td>
                      {selCmpDonem&&(
                        <td style={{...tdS,fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,textAlign:'center',
                          position:'sticky',right:0,background:'var(--surf)',
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

        {/* Renk açıklaması */}
        <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
          {[
            {c:'#10b981',bg:'rgba(16,185,129,.2)',label:'≥%15 segment üstü'},
            {c:'#60a5fa',bg:'rgba(59,130,246,.15)',label:'%5–15 üstü'},
            {c:'#fbbf24',bg:'rgba(245,158,11,.12)',label:'Ortalama'},
            {c:'#f87171',bg:'rgba(239,68,68,.15)',label:'Segment altı'},
          ].map(x=>(
            <div key={x.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
              <div style={{width:12,height:10,borderRadius:3,background:x.bg,border:`1px solid ${x.c}`}}/>
              {x.label}
            </div>
          ))}
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
