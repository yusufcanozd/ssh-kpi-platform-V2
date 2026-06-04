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

export default function ReportComparisonPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas, kats = KATS }: Props) {
  return (
                <div className="rapor-sayfa">
                  <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                    <ReportSectionHeader icon="⚖️" title={'Dönem Karşılaştırması: ' + bazStr + ' vs ' + cmpStr} />
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                      {[
                        { label:'Baz Dönem (' + bazStr + ')', val:d.trScore?.genel??0, color:'var(--blue)' },
                        { label:'Değişim', val:null as null, color:'var(--tx2)' },
                        { label:'Karş. Dönem (' + cmpStr + ')', val:d.trScoreCmp?.genel??0, color:'var(--tx2)' },
                      ].map((item, ii) => (
                        <div key={ii} style={{ background:'var(--surf2)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                          <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.08em' }}>{item.label}</div>
                          {ii === 1 ? (function() {
                            const diff = (d.trScore?.genel??0) - (d.trScoreCmp?.genel??0)
                            return <div style={{ fontSize:28, fontWeight:900, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</div>
                          })() : (
                            <div style={{ fontSize:36, fontWeight:900, fontFamily:'var(--font-dm-mono)', color:item.color }}>{item.val}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ overflowX:'auto', marginBottom:14 }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                        <thead>
                          <tr style={{ background:'var(--surf2)' }}>
                            <th style={thS}>Segment</th>
                            <th style={{ ...thS, textAlign:'center' }}>{bazStr}</th>
                            <th style={{ ...thS, textAlign:'center' }}>{cmpStr}</th>
                            <th style={{ ...thS, textAlign:'center' }}>Δ</th>
                            {kats.map(k => <th key={k.key} style={{ ...thS, color:k.color, textAlign:'center' }}>{k.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {d.segData.map((s: any) => {
                            const diff = s.scoreCmp ? (s.score?.genel??0) - s.scoreCmp.genel : null
                            return (
                              <tr key={s.seg} style={{ borderBottom:'1px solid var(--bd)' }}>
                                <td style={{ ...tdS, fontWeight:700, color:SEGMENT_HEX[s.seg] }}>{s.seg}</td>
                                <td style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:700, color:(s.score?.genel??0)>=100?'#10b981':(s.score?.genel??0)>=90?'#f59e0b':'#ef4444' }}>{s.score?.genel??'—'}</td>
                                <td style={{ ...tdS, textAlign:'center', fontFamily:'var(--font-dm-mono)', color:'var(--tx3)' }}>{s.scoreCmp?.genel??'—'}</td>
                                <td style={{ ...tdS, textAlign:'center' }}>{diff!==null?<span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{diff}</span>:'—'}</td>
                                {kats.map(k => {
                                  const v = s.score?(s.score as any)[k.key]??0:0
                                  const vc = s.scoreCmp?(s.scoreCmp as any)[k.key]??0:null
                                  const dv = vc!==null?v-vc:null
                                  return (
                                    <td key={k.key} style={{ ...tdS, textAlign:'center', fontSize:9 }}>
                                      <div style={{ fontFamily:'var(--font-dm-mono)', fontWeight:700, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</div>
                                      {dv!==null&&<div style={{ fontSize:7, color:dv>=0?'#10b981':'#ef4444' }}>{dv>=0?'+':''}{dv}</div>}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {d.kayiplar.length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#ef4444', marginBottom:8 }}>⚠ Kritik Gerileme Alanları</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                          {d.kayiplar.slice(0,6).map((k: any) => (
                            <div key={k.i} style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 12px' }}>
                              <div style={{ fontSize:9, color:'var(--tx2)', marginBottom:5, lineHeight:1.3 }}>{k.ad}</div>
                              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                <div>
                                  <div style={{ fontSize:7, color:'var(--tx3)' }}>{bazStr}</div>
                                  <div style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'#ef4444' }}>{fmtKpi(k.curr, k.fmt)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize:7, color:'var(--tx3)' }}>{cmpStr}</div>
                                  <div style={{ fontSize:11, fontFamily:'var(--font-dm-mono)', color:'var(--tx3)' }}>{fmtKpi(k.prev, k.fmt)}</div>
                                </div>
                                <div style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'#ef4444' }}>{k.pct>0?'+':''}{k.pct}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <YorumBlok text={yorumlar.karsilastirma} color="#8b5cf6" />
                  </div>
                </div>
  )
}
