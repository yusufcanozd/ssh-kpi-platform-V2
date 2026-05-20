'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG, CAT_COLORS,
  fmtKpi, getKpisFromCube, isLowerBetter
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function KpilerPage() {
  const { selSeg, selBolge, selYas, selDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(3)

  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)

  // Seçili filtreye göre tüm segment KPI'ları
  const segData = useMemo(() =>
    SEGMENTLER
      .filter(s => !selSeg || s===selSeg)
      .map(s => ({
        seg: s,
        kpis: getKpisFromCube(s, selBolge, selYas, selDonem)
      })),
    [selSeg, selBolge, selYas, selDonem])

  // Seçili KPI için bar grafik
  const maxVal = Math.max(...segData.map(s=>s.kpis[selKpi]||0), 0.001)

  const filterLabel = [selBolge||'Tüm TR', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay" subtitle={filterLabel}/>
      <div className={styles.content}>

        {/* 12 KPI kartı — seçili filtreye göre */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
          {KPI_META.map((k,i)=>{
            // Genel ortalama — tüm segmentlerin ortalaması
            const vals = SEGMENTLER.map(s=>getKpisFromCube(s,selBolge,selYas,selDonem)[i]||0)
            const avg  = vals.reduce((a,b)=>a+b,0)/vals.length
            return (
              <div key={k.no} onClick={()=>setSelKpi(i)}
                style={{background:selKpi===i?'rgba(59,130,246,.06)':'var(--surf)',
                  border:`1px solid ${selKpi===i?'var(--blue)':'var(--bd)'}`,
                  borderRadius:9,padding:'10px 12px',cursor:'pointer',transition:'all .12s'}}>
                <div style={{fontSize:9,fontWeight:700,color:CAT_COLORS[k.kat]||'var(--tx3)',
                  marginBottom:3,textTransform:'uppercase',letterSpacing:'.05em'}}>{k.kat}</div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--tx)',marginBottom:4,lineHeight:1.3}}>
                  KPI {k.no} · {k.ad}
                </div>
                <div style={{fontSize:14,fontWeight:700,fontFamily:'var(--font-dm-mono)',
                  color:selKpi===i?'var(--blue)':'var(--tx)'}}>
                  {fmtKpi(avg,k.fmt)}
                </div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:2}}>{filterLabel}</div>
              </div>
            )
          })}
        </div>

        {/* Seçili KPI segment bar grafik */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {meta.no}: {meta.ad}</h3>
            <span className={styles.hint}>{filterLabel} · {lob?'↓ Düşük daha iyi':'↑ Yüksek daha iyi'}</span>
          </div>
          <div className={styles.chartWrap} style={{height:220}}>
            <Bar
              data={{
                labels: segData.map(s=>s.seg),
                datasets:[{
                  label: meta.ad,
                  data: segData.map(s=>s.kpis[selKpi]),
                  backgroundColor: segData.map(s=>SEGMENT_HEX_BG[s.seg]),
                  borderColor: segData.map(s=>SEGMENT_HEX[s.seg]),
                  borderWidth:1.5,borderRadius:8
                }]
              }}
              options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:false},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${fmtKpi(ctx.parsed.y as number,meta.fmt)}`}}},
                scales:{
                  y:{min:0,max:maxVal*1.2,grid:{color:'rgba(255,255,255,.05)'},
                    ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),meta.fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:11}}}}}}/>
          </div>
        </div>

        {/* Segment × KPI tam tablo */}
        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Segment × KPI Tam Tablo</h3>
            <span className={styles.hint}>{filterLabel}</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'var(--surf2)'}}>
                  <th style={thS}>Segment</th>
                  {KPI_META.map(k=>(
                    <th key={k.no} style={{...thS,textAlign:'center'}}>
                      <div>KPI {k.no}</div>
                      <div style={{fontSize:7,fontWeight:400,color:'var(--tx3)'}}>{k.ad.substring(0,8)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segData.map(s=>(
                  <tr key={s.seg} style={{borderBottom:'1px solid var(--bd)'}}>
                    <td style={{padding:'8px 12px',fontWeight:700,color:SEGMENT_COLORS[s.seg]}}>
                      <span style={{background:SEGMENT_BG[s.seg],padding:'2px 8px',borderRadius:20,fontSize:10}}>
                        {s.seg}
                      </span>
                    </td>
                    {s.kpis.map((v,i)=>(
                      <td key={i} style={{padding:'7px 8px',textAlign:'center',
                        fontFamily:'var(--font-dm-mono)',fontSize:10,color:'var(--tx)',
                        fontWeight:selKpi===i?700:400,
                        background:selKpi===i?'rgba(59,130,246,.04)':'transparent'}}>
                        {fmtKpi(v,KPI_META[i].fmt)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px',textAlign:'left',fontSize:9,fontWeight:700,
  color:'var(--tx3)',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}
