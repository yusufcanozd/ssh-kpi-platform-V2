import React from 'react'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG, CATEGORY_OPTIONS, BOLGELER, YAS_GRUPLARI, DONEMLER,
  fmtKpi, fmtSkor0, scoreColor, scoreBarWidth, isLowerBetter, heatColor,
} from '@/lib/kpi'
import ReportSectionHeader from '@/components/report/ReportSectionHeader'
import { YorumBlok, KATS, thS, tdS } from '@/components/report/ReportShared'

interface Props {
  kats?: Array<{ key: string; label: string; color: string }>
  d: any
  yorumlar: Record<string, string>
  bazStr: string
  cmpStr: string | null
  runtimeCalc: any
  selBolge: string
  selYas: string
}

export default function ReportKpiDetailPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas, kats = KATS }: Props) {
  return (
              <div className="rapor-sayfa">
                <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                  <ReportSectionHeader icon="📊" title="KPI Detay Analizi" />
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead>
                        <tr style={{ background:'var(--surf2)' }}>
                          <th style={thS}>KPI</th>
                          <th style={thS}>Tüm TR</th>
                          {cmpStr && <th style={thS}>Önceki</th>}
                          {cmpStr && <th style={thS}>Δ</th>}
                          {SEGMENTLER.map(seg => <th key={seg} style={{ ...thS, color:SEGMENT_HEX[seg] }}>{seg}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {KPI_META.map((k, i) => {
                          const trV = d.trKpis[i]??0
                          const cV  = d.trKpisCmp?.[i]??0
                          const lob = isLowerBetter(i)
                          const pct = cV ? ((trV-cV)/Math.abs(cV)*100) : 0
                          return (
                            <tr key={i} style={{ borderBottom:'1px solid var(--bd)' }}>
                              <td style={{ ...tdS, fontSize:9 }}>{k.ad}</td>
                              <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontWeight:700, textAlign:'center' }}>{fmtKpi(trV, k.fmt)}</td>
                              {cmpStr && <td style={{ ...tdS, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)', textAlign:'center', fontSize:9 }}>{fmtKpi(cV, k.fmt)}</td>}
                              {cmpStr && <td style={{ ...tdS, textAlign:'center' }}>{cV?<span style={{ fontSize:9, fontWeight:700, color:(lob?pct<0:pct>0)?'#10b981':Math.abs(pct)<1?'#9ca3af':'#ef4444' }}>{pct>0?'▲ +':'▼ '}{Math.abs(Math.round(pct*10)/10)}%</span>:'—'}</td>}
                              {d.segData.map((s: any) => {
                                const sv = s.kpis[i]??0
                                const hc = heatColor(sv, trV, !lob)
                                return <td key={s.seg} style={{ ...tdS, fontFamily:'var(--font-dm-mono)', fontSize:9, textAlign:'center', color:hc.color, background:hc.bg }}>{fmtKpi(sv, k.fmt)}</td>
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <YorumBlok text={yorumlar.kpiDetay} color="#f59e0b" />
                </div>
              </div>
  )
}
