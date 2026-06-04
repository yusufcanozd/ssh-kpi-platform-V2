import React from 'react'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG, CATEGORY_OPTIONS, BOLGELER, YAS_GRUPLARI, DONEMLER,
  fmtKpi, fmtSkor0, scoreColor, scoreBarWidth, isLowerBetter, heatColor,
} from '@/lib/kpi'
import ReportSectionHeader from '@/components/report/ReportSectionHeader'
import { YorumBlok, KATS, thS, tdS } from '@/components/report/ReportShared'

interface Props {
  d: any
  yorumlar: Record<string, string>
  bazStr: string
  cmpStr: string | null
  runtimeCalc: any
  selBolge: string
  selYas: string
}

export default function ReportBrandPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas }: Props) {
  return (
              <div className="rapor-sayfa">
                <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                  <ReportSectionHeader icon="🏆" title="Marka Sıralaması" />
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead>
                        <tr style={{ background:'var(--surf2)' }}>
                          <th style={thS}>#</th>
                          <th style={thS}>Marka</th>
                          <th style={thS}>Segment</th>
                          <th style={thS}>Skor</th>
                          {cmpStr && <th style={thS}>Önceki</th>}
                          {cmpStr && <th style={thS}>Δ</th>}
                          {KATS.map(k => <th key={k.key} style={{ ...thS, color:k.color }}>{k.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {d.tumMarkalar.slice(0,20).map((m: any, i: number) => {
                          const segSc = runtimeCalc.getScore(m.segment, selBolge, selYas, bazStr)
                          const diff = m.cmpScore !== null ? m.score - m.cmpScore : null
                          return (
                            <tr key={m.marka} style={{ borderBottom:'1px solid var(--bd)' }}>
                              <td style={{ ...tdS, color:'var(--tx3)', fontSize:9 }}>{i+1}</td>
                              <td style={{ ...tdS, fontWeight:700, color:SEGMENT_HEX[m.segment]||'var(--tx)' }}>{m.marka}</td>
                              <td style={tdS}><span style={{ background:SEGMENT_BG[m.segment], color:SEGMENT_HEX[m.segment], padding:'1px 6px', borderRadius:20, fontSize:8, fontWeight:700, border:'1px solid ' + SEGMENT_HEX[m.segment] + '44' }}>{m.segment}</span></td>
                              <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontWeight:700, color:m.score>=100?'#10b981':m.score>=90?'#f59e0b':'#ef4444' }}>{m.score}</td>
                              {cmpStr && <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)', fontSize:9 }}>{m.cmpScore??'—'}</td>}
                              {cmpStr && <td style={tdS}>{diff!==null?<span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</span>:'—'}</td>}
                              {KATS.map(k => {
                                const v = segSc ? (segSc as any)[k.key]??0 : 0
                                return <td key={k.key} style={{ ...tdS, textAlign:'center', fontSize:9, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</td>
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <YorumBlok text={yorumlar.marka} color="#f59e0b" />
                </div>
              </div>
  )
}
