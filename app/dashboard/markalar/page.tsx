'use client'
import { useMemo } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import { fmt, scoreColor, SEGMENT_COLORS } from '@/lib/kpi'
import styles from './page.module.css'

function groupByBrand(scores: any[]) {
  const map: Record<string, any> = {}
  scores.forEach(s => {
    if (!map[s.brand_id]) map[s.brand_id] = { id: s.brand_id, name: s.brand_name, segment: s.brand_segment, n:0, op:0, cu:0, sv:0, co:0, ov:0 }
    const b = map[s.brand_id]; b.n++; b.op+=s.score_op; b.cu+=s.score_cu; b.sv+=s.score_sv; b.co+=s.score_co; b.ov+=s.score_overall
  })
  return Object.values(map).map(b => ({ ...b, op:+(b.op/b.n).toFixed(1), cu:+(b.cu/b.n).toFixed(1), sv:+(b.sv/b.n).toFixed(1), co:+(b.co/b.n).toFixed(1), ov:+(b.ov/b.n).toFixed(1) })).sort((a:any,b:any) => b.ov-a.ov)
}

export default function MarkalarsPage() {
  const { brandScores } = useDashboardCtx()
  const brands = useMemo(() => groupByBrand(brandScores), [brandScores])
  const spBg = (seg: string) => seg==='Premium'?'rgba(139,92,246,.15)':seg==='Mass'?'rgba(59,130,246,.15)':'rgba(16,185,129,.12)'

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması" subtitle={`${brands.length} marka`} />
      <div className={styles.content}>
        <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'var(--surf2)'}}>
                {['#','Marka','Segment','Operasyonel','Müşteri','Servis','Kapsam','Genel Skor'].map(h => (
                  <th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brands.map((b:any, i:number) => (
                <tr key={b.id} style={{borderBottom:'1px solid var(--bd)'}}>
                  <td style={{padding:'8px 12px',color:'var(--tx3)',fontFamily:'var(--font-dm-mono)',fontSize:11}}>{i+1}</td>
                  <td style={{padding:'8px 12px',fontWeight:600,fontSize:12}}>{b.name}</td>
                  <td style={{padding:'8px 12px'}}>
                    <span style={{background:spBg(b.segment),color:SEGMENT_COLORS[b.segment as keyof typeof SEGMENT_COLORS],padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,textTransform:'uppercase'}}>{b.segment}</span>
                  </td>
                  {['op','cu','sv','co'].map(k => <td key={k} style={{padding:'8px 12px',fontFamily:'var(--font-dm-mono)',fontSize:11,color:scoreColor(b[k])}}>{fmt(b[k])}</td>)}
                  <td style={{padding:'8px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,background:'var(--surf3)',borderRadius:10,height:5,overflow:'hidden'}}><div style={{width:`${b.ov}%`,height:5,borderRadius:10,background:scoreColor(b.ov)}}/></div>
                      <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,color:scoreColor(b.ov),width:34,textAlign:'right'}}>{fmt(b.ov)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
