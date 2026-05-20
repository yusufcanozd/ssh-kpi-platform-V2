'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG, BOLGE_COLORS,
  fmtKpi, getKpisFromCube, getN, heatColor, isLowerBetter
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(4) // KPI5 default
  const [viewSeg, setViewSeg] = useState('Mass')

  // Tüm Türkiye referans kpis — sadece seg/yas/donem filtreli (bölge yok)
  const trKpis = useMemo(() =>
    getKpisFromCube(selSeg||viewSeg, '', selYas, selDonem),
    [selSeg, viewSeg, selYas, selDonem])

  // Seçili bölgeler — filtre varsa sadece o, yoksa hepsi
  const bolgeList = selBolge ? [selBolge] : BOLGELER

  // Her bölge için kpis
  const bolgeKpis = useMemo(() =>
    bolgeList.map(b => ({
      bolge: b,
      kpis: getKpisFromCube(selSeg||viewSeg, b, selYas, selDonem),
      n: getN(selSeg||viewSeg, b, selYas, selDonem)
    })),
    [selSeg, viewSeg, selBolge, selYas, selDonem, bolgeList])

  const activeSeg = selSeg || viewSeg

  // Bar grafik için seçili KPI
  const barLabels = ['Tüm Türkiye', ...bolgeList]
  const barData   = [trKpis[selKpi], ...bolgeKpis.map(b=>b.kpis[selKpi])]
  const barColors = ['rgba(99,102,241,.5)', ...bolgeList.map((_,i)=>BOLGE_COLORS[i%BOLGE_COLORS.length]+'88')]
  const barBorders= ['#6366f1', ...bolgeList.map((_,i)=>BOLGE_COLORS[i%BOLGE_COLORS.length])]

  const filterLabel = [activeSeg, selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi" subtitle={filterLabel}/>
      <div className={styles.content}>

        {/* Bölge özet bar'ları */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8,marginBottom:16}}>
          {BOLGELER.map(b=>{
            const bn  = getN(activeSeg, b, selYas, selDonem)
            const all = getN(activeSeg, '', selYas, selDonem)||1
            const pct = (bn/all*100).toFixed(0)
            return (
              <div key={b} style={{background:selBolge===b?'rgba(59,130,246,.08)':'var(--surf2)',
                borderRadius:8,padding:'10px 8px',textAlign:'center',
                border:`1px solid ${selBolge===b?'var(--blue)':'var(--bd)'}`}}>
                <div style={{fontSize:8,fontWeight:700,color:'var(--tx3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em',lineHeight:1.3}}>{b}</div>
                <div style={{height:28,display:'flex',alignItems:'flex-end',justifyContent:'center',marginBottom:3}}>
                  <div style={{width:18,borderRadius:'2px 2px 0 0',background:'rgba(59,130,246,.5)',borderTop:'2px solid #3b82f6',height:`${pct}%`,minHeight:4}}/>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:'var(--font-dm-mono)'}}>
                  {bn.toLocaleString('tr-TR')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Isı haritası */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge × KPI Isı Haritası</h3>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {/* Segment seçimi — sidebar'da seçilmemişse buradan */}
              {!selSeg && SEGMENTLER.map(s=>(
                <button key={s} onClick={()=>setViewSeg(s)}
                  style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:600,cursor:'pointer',
                    border:`1px solid ${viewSeg===s?SEGMENT_COLORS[s]:'var(--bd)'}`,
                    background:viewSeg===s?SEGMENT_BG[s]:'var(--surf2)',
                    color:viewSeg===s?SEGMENT_COLORS[s]:'var(--tx2)'}}>
                  {s}
                </button>
              ))}
              <span style={{fontSize:9,color:'var(--tx3)'}}>{filterLabel}</span>
            </div>
          </div>

          {/* KPI seçici satırı */}
          <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
            {KPI_META.map((k,i)=>(
              <button key={i} onClick={()=>setSelKpi(i)}
                style={{padding:'2px 8px',borderRadius:4,fontSize:9,cursor:'pointer',
                  border:`1px solid ${selKpi===i?'var(--blue)':'var(--bd)'}`,
                  background:selKpi===i?'rgba(59,130,246,.1)':'var(--surf2)',
                  color:selKpi===i?'var(--blue)':'var(--tx3)'}}>
                KPI {k.no}
              </button>
            ))}
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',fontSize:10,width:'100%'}}>
              <thead>
                <tr>
                  <th style={{...thS,width:140}}>Bölge</th>
                  {KPI_META.map((k,i)=>(
                    <th key={i} onClick={()=>setSelKpi(i)}
                      style={{...thS,cursor:'pointer',
                        color:selKpi===i?'var(--blue)':'var(--tx3)',
                        background:selKpi===i?'rgba(59,130,246,.06)':'transparent'}}>
                      <div style={{fontSize:8}}>KPI {k.no}</div>
                      <div style={{fontSize:7,color:'var(--tx3)',fontWeight:400}}>{k.ad.substring(0,7)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Tüm Türkiye referans satırı — sabit */}
                <tr style={{borderBottom:'2px solid var(--blue)',background:'rgba(59,130,246,.04)'}}>
                  <td style={{padding:'7px 10px',fontWeight:700,color:'var(--blue)',fontSize:11}}>
                    🇹🇷 Tüm Türkiye
                  </td>
                  {trKpis.map((v,i)=>(
                    <td key={i} style={{padding:'5px 6px',textAlign:'center',
                      fontFamily:'var(--font-dm-mono)',fontWeight:700,fontSize:10,color:'var(--blue)',
                      outline:selKpi===i?'2px solid #3b82f655':'none',outlineOffset:-1}}>
                      {fmtKpi(v,KPI_META[i].fmt)}
                    </td>
                  ))}
                </tr>
                {/* Bölge satırları */}
                {bolgeKpis.map(row=>(
                  <tr key={row.bolge} style={{borderBottom:'1px solid var(--bd)'}}>
                    <td style={{padding:'7px 10px',fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap'}}>
                      {row.bolge}
                    </td>
                    {row.kpis.map((v,i)=>{
                      const ref = trKpis[i]||0
                      const {bg,color} = heatColor(v,ref,!isLowerBetter(i))
                      return (
                        <td key={i} style={{padding:'5px 6px',textAlign:'center',
                          fontFamily:'var(--font-dm-mono)',fontWeight:600,fontSize:10,
                          background:bg,color,
                          outline:selKpi===i?`2px solid ${color}55`:'none',outlineOffset:-1}}>
                          {fmtKpi(v,KPI_META[i].fmt)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Renk açıklaması */}
          <div style={{display:'flex',gap:12,marginTop:10,paddingTop:10,borderTop:'1px solid var(--bd)',flexWrap:'wrap'}}>
            {[
              {c:'#10b981',bg:'rgba(16,185,129,.2)',label:'≥%15 Tüm TR üstü'},
              {c:'#60a5fa',bg:'rgba(59,130,246,.15)',label:'%5–15 üstü'},
              {c:'#fbbf24',bg:'rgba(245,158,11,.12)',label:'Ortalama'},
              {c:'#f87171',bg:'rgba(239,68,68,.15)',label:'Tüm TR altı'},
            ].map(x=>(
              <div key={x.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
                <div style={{width:14,height:10,borderRadius:2,background:x.bg,border:`1px solid ${x.c}`}}/>
                {x.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bar Grafik — seçili KPI, Tüm TR vs Bölgeler */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {selKpi+1}: {KPI_META[selKpi].ad} — Tüm Türkiye vs Bölgeler</h3>
            <span className={styles.hint}>Tüm Türkiye sabit referans · {filterLabel}</span>
          </div>
          <div className={styles.chartWrap} style={{height:260}}>
            <Bar
              data={{labels:barLabels,datasets:[{
                label:KPI_META[selKpi].ad,data:barData,
                backgroundColor:barColors,borderColor:barBorders,borderWidth:1.5,borderRadius:6
              }]}}
              options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:false},
                  tooltip:{callbacks:{label:(ctx)=>
                    `${ctx.label}: ${fmtKpi(ctx.parsed.y as number,KPI_META[selKpi].fmt)}`}}},
                scales:{
                  y:{grid:{color:'rgba(255,255,255,.05)'},
                    ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),KPI_META[selKpi].fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:9}}}}}}/>
          </div>
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'7px 8px',textAlign:'center',fontSize:9,fontWeight:700,color:'var(--tx3)',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}
