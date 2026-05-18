'use client'
import { useMemo } from 'react'
import { useDashboardCtx } from '@/context/DashboardContext'
import Topbar from '@/components/layout/Topbar'
import { groupByBrand, fmt, scoreColor, SEGMENT_COLORS } from '@/lib/kpi'
import styles from '../page.module.css'

export default function MarkalarsPage() {
  const { scores, loading } = useDashboardCtx()
  const brands = useMemo(() => groupByBrand(scores), [scores])

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması" subtitle={`${brands.length} marka · ağırlıklı genel skor`} />
      <div className={styles.content}>
        {loading && <div className={styles.loading}><span className="loading-spin" /> Yükleniyor...</div>}
        <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'var(--surf2)'}}>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  #
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  Marka
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  Segment
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  Operasyonel
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  Müşteri
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  Servis
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)'}}>
                  Kapsam
                </th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)',width:160}}>
                  Genel Skor
                </th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b, i) => {
                const pct = Math.max(0, b.ov)
                const color = scoreColor(b.ov)
                const segColor = SEGMENT_COLORS[b.segment as keyof typeof SEGMENT_COLORS]
                const spBg = b.segment==='Premium'?'rgba(139,92,246,.15)':b.segment==='Mass'?'rgba(59,130,246,.15)':'rgba(16,185,129,.12)'
                return (
                  <tr key={b.id} style={{borderBottom:'1px solid var(--bd)'}}>
                    <td style={{padding:'8px 12px',color:'var(--tx3)',fontFamily:'var(--font-dm-mono)',fontSize:11}}>{i+1}</td>
                    <td style={{padding:'8px 12px',fontWeight:600,fontSize:12}}>{b.name}</td>
                    <td style={{padding:'8px 12px'}}>
                      <span style={{background:spBg,color:segColor,padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,textTransform:'uppercase'}}>{b.segment}</span>
                    </td>
                    <td style={{padding:'8px 12px',fontFamily:'var(--font-dm-mono)',fontSize:11,color:scoreColor(b.op)}}>{fmt(b.op)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'var(--font-dm-mono)',fontSize:11,color:scoreColor(b.cu)}}>{fmt(b.cu)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'var(--font-dm-mono)',fontSize:11,color:scoreColor(b.sv)}}>{fmt(b.sv)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'var(--font-dm-mono)',fontSize:11,color:scoreColor(b.co)}}>{fmt(b.co)}</td>
                    <td style={{padding:'8px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,background:'var(--surf3)',borderRadius:10,height:5,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:5,borderRadius:10,background:color}}/>
                        </div>
                        <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,color,width:34,textAlign:'right'}}>{fmt(b.ov)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
