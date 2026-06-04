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

export default function ReportRegionPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas, kats = KATS }: Props) {
  return (
              <div className="rapor-sayfa">
                <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                  <ReportSectionHeader icon="🗺" title="Bölge Analizi" />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:12 }}>
                    <div>
                      {d.bolgeData.map((b: any) => {
                        const sc = b.score?.genel??0
                        const scC = b.scoreCmp?.genel??null
                        const maxSc = Math.max(...d.bolgeData.map((x: any) => x.score?.genel??0), 1)
                        const c = scoreColor(sc)
                        const diff = scC !== null ? sc - scC : null
                        return (
                          <div key={b.bolge} style={{ marginBottom:8 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:9, color:'var(--tx2)', fontWeight:600 }}>{b.bolge||'Tüm TR'}</span>
                              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                {diff !== null && <span style={{ fontSize:9, fontWeight:700, color:diff>=0?'#10b981':'#ef4444' }}>{diff>=0?'▲ +':'▼ '}{fmtSkor0(Math.abs(diff))}</span>}
                                <span style={{ fontSize:10, fontWeight:700, color:c, fontFamily:'var(--font-dm-mono)' }}>{fmtSkor0(sc)}</span>
                              </div>
                            </div>
                            <div style={{ background:'var(--surf3)', borderRadius:4, height:8, overflow:'hidden' }}>
                              <div style={{ width:scoreBarWidth(sc), height:'100%', background:c, borderRadius:4 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div>
                      {d.yasData.map((y: any) => {
                        const sc = y.score?.genel??0
                        return (
                          <div key={y.yas} style={{ background:'var(--surf2)', borderRadius:8, padding:'8px 10px', marginBottom:8 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:10, fontWeight:700 }}>{y.yas} Yıl</span>
                              <span style={{ background:sc>=100?'#d1fae5':sc>=90?'#fef3c7':'#fee2e2', color:sc>=100?'#10b981':sc>=90?'#f59e0b':'#ef4444', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:800, fontFamily:'var(--font-dm-mono)' }}>{sc}</span>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
                              {kats.map(k => {
                                const v = y.score ? (y.score as any)[k.key]??0 : 0
                                return <div key={k.key} style={{ textAlign:'center' }}>
                                  <div style={{ fontSize:7, color:'var(--tx3)', marginBottom:2 }}>{k.label}</div>
                                  <div style={{ fontSize:10, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</div>
                                </div>
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <YorumBlok text={yorumlar.bolge} color="#8b5cf6" />
                </div>

                <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                  <ReportSectionHeader icon="🔷" title="Segment Analizi" />
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(' + SEGMENTLER.length + ',1fr)', gap:12 }}>
                    {d.segData.map((s: any) => (
                      <div key={s.seg} style={{ background:SEGMENT_BG[s.seg], border:'1px solid ' + SEGMENT_HEX[s.seg] + '55', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:'1px solid ' + SEGMENT_HEX[s.seg] + '33' }}>
                          <span style={{ fontSize:13, fontWeight:800, color:SEGMENT_HEX[s.seg] }}>{s.seg}</span>
                          <span style={{ background:s.score?.genel>=100?'#d1fae5':s.score?.genel>=90?'#fef3c7':'#fee2e2', color:s.score?.genel>=100?'#10b981':s.score?.genel>=90?'#f59e0b':'#ef4444', borderRadius:6, padding:'2px 7px', fontSize:11, fontWeight:800 }}>{s.score?.genel??0}</span>
                        </div>
                        <div style={{ marginBottom:8, padding:'4px 6px', background:SEGMENT_HEX[s.seg]+'15', borderRadius:5 }}>
                          <div style={{ display:'flex', justifyContent:'space-between' }}>
                            <span style={{ fontSize:9, fontWeight:800, color:SEGMENT_HEX[s.seg] }}>Genel</span>
                            <span style={{ fontSize:10, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:SEGMENT_HEX[s.seg] }}>
                              {s.score?.genel??0}
                              {s.scoreCmp && <span style={{ fontSize:8, color:'var(--tx3)', marginLeft:4 }}>({s.scoreCmp.genel})</span>}
                            </span>
                          </div>
                        </div>
                        {kats.map(k => {
                          const v = s.score ? (s.score as any)[k.key]??0 : 0
                          const vc = s.scoreCmp ? (s.scoreCmp as any)[k.key]??0 : null
                          const dv = vc !== null ? v - vc : null
                          return (
                            <div key={k.key} style={{ display:'flex', justifyContent:'space-between', marginBottom:3, padding:'1px 4px' }}>
                              <span style={{ fontSize:8, color:'var(--tx3)' }}>{k.label}</span>
                              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                                {dv !== null && <span style={{ fontSize:7, fontWeight:700, color:dv>=0?'#10b981':'#ef4444' }}>{dv>=0?'+':''}{dv}</span>}
                                <span style={{ fontSize:9, fontWeight:700, color:v>=100?'#10b981':v>=90?'#f59e0b':'#ef4444' }}>{v}</span>
                              </div>
                            </div>
                          )
                        })}
                        <div style={{ borderTop:'1px solid ' + SEGMENT_HEX[s.seg] + '33', paddingTop:6, marginTop:6 }}>
                          <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:3 }}>Top 3 Marka</div>
                          {s.markalar.slice(0,3).map((m: any, i: number) => (
                            <div key={m.marka} style={{ display:'flex', justifyContent:'space-between', marginBottom:2, fontSize:8 }}>
                              <span style={{ color:'var(--tx2)' }}>{i+1}. {m.marka}</span>
                              <span style={{ fontWeight:700, color:SEGMENT_HEX[s.seg] }}>{m.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
  )
}
