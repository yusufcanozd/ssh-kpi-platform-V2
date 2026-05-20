'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG, CAT_COLORS,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter,
  chgColor, chgBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function KpilerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number>(3)

  // Segment KPI değerleri — baz + cmp dönem
  const segData = useMemo(() =>
    SEGMENTLER.filter(s => !selSeg || s===selSeg).map(s => ({
      seg: s,
      baz: getKpisFromCube(s, selBolge, selYas, selDonem),
      cmp: selCmpDonem ? getKpisFromCube(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  // Marka sıralaması — KPI değeri üzerinden sırala
  const markalar = useMemo(() => {
    const ranked = getMarkaRanking(selSeg, selBolge, selYas, selDonem)
    const lob = isLowerBetter(sortKpi)
    return ranked.map(m => ({
      ...m,
      baz: getKpisFromCube(m.segment, selBolge, selYas, selDonem),
      cmp: selCmpDonem ? getKpisFromCube(m.segment, selBolge, selYas, selCmpDonem) : null,
    })).sort((a,b) => {
      const av = a.baz[sortKpi] ?? 0
      const bv = b.baz[sortKpi] ?? 0
      return lob ? av - bv : bv - av
    })
  }, [selSeg, selBolge, selYas, selDonem, selCmpDonem, sortKpi])

  // Seçili KPI bar grafik — tüm markalar
  const meta   = KPI_META[sortKpi]
  const lob    = isLowerBetter(sortKpi)
  const maxVal = Math.max(...markalar.map(m=>m.baz[sortKpi]||0), 0.001)

  const filterLabel = [
    selBolge||'Tüm TR', selSeg||'Tüm Seg.',
    selYas==='Tümü'?'Tüm Yaş':selYas+'y',
    selDonem||'Tüm Dönem'
  ].join(' · ')

  // Değişim % hesapla
  function chgPct(baz: number, cmp: number | null): number | null {
    if (cmp === null || !cmp) return null
    return Math.round((baz - cmp) / Math.abs(cmp) * 1000) / 10
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay"
        subtitle={`${markalar.length} marka · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* ── Segment 4x3 KPI Gerçek Değer Matrisi ── */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${segData.length},1fr)`,gap:10,marginBottom:16}}>
          {segData.map(s=>(
            <div key={s.seg} style={{
              background: SEGMENT_BG[s.seg],
              border:`1px solid ${SEGMENT_COLORS[s.seg]}55`,
              borderRadius:10, padding:'12px 14px'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${SEGMENT_COLORS[s.seg]}33`}}>
                <span style={{fontSize:12,fontWeight:700,color:SEGMENT_COLORS[s.seg]}}>{s.seg}</span>
                <span style={{fontSize:9,color:'var(--tx3)'}}>{filterLabel}</span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                {KPI_META.map((k,i)=>{
                  const bazV  = s.baz[i]
                  const cmpV  = s.cmp?.[i] ?? null
                  const chg   = chgPct(bazV, cmpV)
                  const isActive = sortKpi === i
                  // Isı rengi — seçili KPI'da aktif hücre highlight
                  const bgStyle = isActive
                    ? `${SEGMENT_HEX[s.seg]}33`
                    : 'rgba(0,0,0,.12)'

                  return (
                    <div key={k.no}
                      onClick={()=>setSortKpi(i)}
                      style={{
                        background: bgStyle,
                        border: isActive ? `1px solid ${SEGMENT_HEX[s.seg]}88` : '1px solid transparent',
                        borderRadius:6, padding:'6px 8px', textAlign:'center',
                        cursor:'pointer', transition:'all .12s'
                      }}>
                      <div style={{fontSize:7,color:'var(--tx3)',lineHeight:1.3,marginBottom:6,
                        minHeight:20,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {k.ad}
                      </div>
                      {/* Baz + cmp değer — ekran görüntüsü formatı */}
                      <div style={{display:'flex',alignItems:'flex-end',gap:5,justifyContent:'center',flexWrap:'wrap'}}>
                        <div>
                          {selDonem && <div style={{fontSize:7,color:'var(--tx3)',marginBottom:1}}>{selDonem}</div>}
                          <div style={{fontSize:16,fontWeight:800,fontFamily:'var(--font-dm-mono)',
                            color:SEGMENT_COLORS[s.seg],lineHeight:1}}>
                            {fmtKpi(bazV,k.fmt)}
                          </div>
                        </div>
                        {cmpV !== null && (
                          <div style={{paddingBottom:3}}>
                            {selCmpDonem && <div style={{fontSize:7,color:'var(--tx3)',marginBottom:1}}>{selCmpDonem}</div>}
                            <div style={{fontSize:11,fontWeight:600,fontFamily:'var(--font-dm-mono)',
                              color:'var(--tx2)',lineHeight:1}}>
                              {fmtKpi(cmpV,k.fmt)}
                            </div>
                          </div>
                        )}
                        {chg !== null && (
                          <div style={{paddingBottom:4,marginLeft:'auto'}}>
                            <div style={{fontSize:9,fontWeight:700,color:chgColor(lob ? -chg : chg)}}>
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

        {/* ── Seçili KPI Bar Grafik ── */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {meta.no}: {meta.ad} — Marka Dağılımı</h3>
            <span className={styles.hint}>
              {filterLabel}{selCmpDonem?` vs ${selCmpDonem}`:''} · {lob?'↓ Düşük daha iyi':'↑ Yüksek daha iyi'}
            </span>
          </div>
          <div style={{overflowX:'auto'}}>
            <div style={{minWidth: markalar.length*52, height:260}}>
              <Bar data={{
                labels: markalar.map(m=>m.marka),
                datasets:[
                  {
                    label: selDonem||'Baz Dönem',
                    data: markalar.map(m=>m.baz[sortKpi]),
                    backgroundColor: markalar.map(m=>SEGMENT_HEX[m.segment]+'22'),
                    borderColor: markalar.map(m=>SEGMENT_HEX[m.segment]),
                    borderWidth:2, borderRadius:5,
                  },
                  ...(selCmpDonem ? [{
                    label: selCmpDonem,
                    data: markalar.map(m=>m.cmp?.[sortKpi]??0),
                    backgroundColor: markalar.map(m=>SEGMENT_HEX[m.segment]+'66'),
                    borderColor: markalar.map(m=>SEGMENT_HEX[m.segment]),
                    borderWidth:1, borderRadius:5,
                  }] : [])
                ]
              }} options={{
                responsive:true, maintainAspectRatio:false,
                plugins:{
                  legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:10},boxWidth:12}},
                  tooltip:{callbacks:{
                    title:(items)=>{const m=markalar[items[0].dataIndex];return `${m.marka} (${m.segment})`},
                    label:(ctx)=>`${ctx.dataset.label}: ${fmtKpi(ctx.parsed.y as number,meta.fmt)}`
                  }}
                },
                scales:{
                  y:{min:0,max:maxVal*1.2,grid:{color:'rgba(255,255,255,.05)'},
                    ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),meta.fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:8},maxRotation:45,autoSkip:false}}
                }
              }}/>
            </div>
          </div>
        </div>

        {/* ── Marka KPI Değer Tablosu ── */}
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
                      <div style={{fontSize:8,lineHeight:1.3,whiteSpace:'normal',wordBreak:'break-word'}}>{k.ad}</div>
                      {sortKpi===i&&<span style={{fontSize:7}}>{lob?'↑':'↓'}</span>}
                    </th>
                  ))}
                  <th style={{...thS,position:'sticky',right:0,background:'var(--surf2)',minWidth:60}}>
                    Skor
                  </th>
                </tr>
              </thead>
              <tbody>
                {markalar.map((m,i)=>{
                  const segAvgBaz = getKpisFromCube(m.segment, selBolge, selYas, selDonem)
                  const trBaz     = getKpisFromCube('', selBolge, selYas, selDonem)

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

                      {/* KPI gerçek değerleri — TR'ye göre ısı rengi */}
                      {m.baz.map((bazV,ki)=>{
                        const ref  = trBaz[ki] ?? 0
                        const {bg,color} = heatColor(bazV, ref, !isLowerBetter(ki))
                        const cmpV = m.cmp?.[ki] ?? null
                        const chg  = chgPct(bazV, cmpV)
                        const isAct = sortKpi===ki

                        return (
                          <td key={ki} onClick={()=>setSortKpi(ki)}
                            style={{...tdS,textAlign:'center',background:bg,cursor:'pointer',
                              outline:isAct?`2px solid ${color}66`:'none',outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,color}}>
                              {fmtKpi(bazV,KPI_META[ki].fmt)}
                            </div>
                            {cmpV !== null && (
                              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:2,marginTop:1}}>
                                <span style={{fontSize:8,color:'var(--tx3)',fontFamily:'var(--font-dm-mono)'}}>
                                  {fmtKpi(cmpV,KPI_META[ki].fmt)}
                                </span>
                                {chg !== null && (
                                  <span style={{fontSize:7,fontWeight:700,padding:'0 2px',borderRadius:2,
                                    background:chgBg(isLowerBetter(ki)?-chg:chg),
                                    color:chgColor(isLowerBetter(ki)?-chg:chg)}}>
                                    {chg>=0?'+':''}{chg}%
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Genel skor */}
                      <td style={{...tdS,position:'sticky',right:0,background:'var(--surf)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <div style={{flex:1,background:'var(--surf3)',borderRadius:4,height:4,overflow:'hidden',minWidth:28}}>
                            <div style={{width:`${m.score}%`,height:4,borderRadius:4,
                              background:m.score>=80?'#10b981':m.score>=65?'#3b82f6':m.score>=50?'#f59e0b':'#ef4444'}}/>
                          </div>
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,minWidth:18,textAlign:'right',
                            color:m.score>=80?'#10b981':m.score>=65?'#3b82f6':m.score>=50?'#f59e0b':'#ef4444'}}>
                            {m.score}
                          </span>
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
            {c:'#10b981',bg:'rgba(16,185,129,.2)',label:'Tüm TR üstü'},
            {c:'#60a5fa',bg:'rgba(59,130,246,.15)',label:'%5–15 üstü'},
            {c:'#fbbf24',bg:'rgba(245,158,11,.12)',label:'Ortalama'},
            {c:'#f87171',bg:'rgba(239,68,68,.15)',label:'Tüm TR altı'},
          ].map(x=>(
            <div key={x.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
              <div style={{width:12,height:10,borderRadius:3,background:x.bg,border:`1px solid ${x.c}`}}/>
              {x.label}
            </div>
          ))}
          <span style={{fontSize:9,color:'var(--tx3)',marginLeft:8}}>
            · Isı rengi Tüm TR ortalamasına göre · Tıklayarak sırala
          </span>
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
