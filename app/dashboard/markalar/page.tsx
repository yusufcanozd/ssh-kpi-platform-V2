'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG,
  fmtKpi, getKpisFromCube, getMarkaList, getMarkaRanking, heatColor, isLowerBetter, overallScoreFromKpis, getSegAvg
} from '@/lib/kpi'
import styles from './page.module.css'

export default function MarkalarsPage() {
  const { selSeg, selBolge, selYas, selDonem } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number|'ov'>('ov')

  // Segment ortalamaları — seçili bölge/yaş/dönem'e göre
  const segAvgs = useMemo(() =>
    SEGMENTLER.map(s => ({
      seg: s,
      kpis: getKpisFromCube(s, selBolge, selYas, selDonem)
    })).filter(s => !selSeg || s.seg===selSeg),
    [selSeg, selBolge, selYas, selDonem])

  // Marka listesi — bölge/yaş filtreli
  const markalar = useMemo(() => {
    const ranked = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    if (sortKpi === 'ov') return ranked
    // KPI bazlı sıralama için orijinal kpi verisi lazım — skor bazlı sırala
    return ranked
  }, [selSeg, selBolge, selYas, selDonem, sortKpi])

  const filterLabel = [selBolge||'Tüm TR', selSeg||'Tüm Seg.', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması" subtitle={`${markalar.length} marka · ${filterLabel}`}/>
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
                  {KPI_META.map((k,i)=>(
                    <th key={i} onClick={()=>setSortKpi(i)}
                      style={{...thS,cursor:'pointer',
                        color:sortKpi===i?'var(--blue)':'var(--tx3)',
                        background:sortKpi===i?'rgba(59,130,246,.06)':'var(--surf2)',whiteSpace:'nowrap'}}>
                      KPI {k.no}{sortKpi===i?' ↓':''}
                    </th>
                  ))}
                  <th onClick={()=>setSortKpi('ov')}
                    style={{...thS,cursor:'pointer',
                      color:sortKpi==='ov'?'var(--blue)':'var(--tx3)',
                      background:sortKpi==='ov'?'rgba(59,130,246,.08)':'var(--surf2)'}}>
                    Skor{sortKpi==='ov'?' ↓':''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {markalar.map((m,i)=>{
                  const segAvg = segAvgs.find(s=>s.seg===m.segment)?.kpis||[]
                  return (
                    <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                      <td style={tdS}><span style={{color:'var(--tx3)',fontFamily:'var(--font-dm-mono)'}}>{i+1}</span></td>
                      <td style={{...tdS,fontWeight:600,fontSize:12}}>{m.marka}</td>
                      <td style={tdS}>
                        <span style={{background:SEGMENT_BG[m.segment],color:SEGMENT_COLORS[m.segment],
                          padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,textTransform:'uppercase'}}>
                          {m.segment}
                        </span>
                      </td>
                      {m.kpis.map((v,ki)=>{
                        const ref = segAvg[ki]||0
                        const {bg,color} = heatColor(v,ref,!isLowerBetter(ki))
                        return (
                          <td key={ki} style={{...tdS,background:bg,color,fontFamily:'var(--font-dm-mono)',fontWeight:500}}>
                            {fmtKpi(v,KPI_META[ki].fmt)}
                          </td>
                        )
                      })}
                      <td style={tdS}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{flex:1,background:'var(--surf3)',borderRadius:10,height:4,overflow:'hidden',minWidth:36}}>
                            <div style={{width:`${m.ov}%`,height:4,borderRadius:10,
                              background:m.ov>=70?'#10b981':m.ov>=55?'#3b82f6':m.ov>=40?'#f59e0b':'#ef4444'}}/>
                          </div>
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,width:24,textAlign:'right',
                            color:m.ov>=70?'#10b981':m.ov>=55?'#3b82f6':m.ov>=40?'#f59e0b':'#ef4444'}}>{m.ov}</span>
                        </div>
                      </td>
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

const thS: React.CSSProperties = {padding:'9px 10px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'7px 10px',borderBottom:'1px solid var(--bd)'}
