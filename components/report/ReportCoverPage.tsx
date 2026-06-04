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

export default function ReportCoverPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas }: Props) {
  return (
              <div className="rapor-sayfa">
                <div style={{ background:'linear-gradient(135deg,#0f1c2e,#1a3353,#0d2240)', borderRadius:12, padding:'32px 36px', color:'#fff', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'rgba(59,130,246,.1)' }} />
                  <div style={{ position:'relative', zIndex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.2em', color:'#60a5fa', textTransform:'uppercase', marginBottom:6 }}>Türkiye Otomotiv Sektörü</div>
                        <div style={{ fontSize:28, fontWeight:900, lineHeight:1.15, marginBottom:4 }}>SSH Rekabet Analizi</div>
                        <div style={{ fontSize:13, color:'#93c5fd' }}>Satış Sonrası Hizmet KPI Performans Raporu</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Baz Dönem</div>
                        <div style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', fontFamily:'var(--font-dm-mono)' }}>{bazStr}</div>
                        {cmpStr && (
                          <div style={{ marginTop:6 }}>
                            <div style={{ fontSize:9, color:'#93c5fd', marginBottom:2, textTransform:'uppercase', letterSpacing:'.1em' }}>Karşılaştırma Dönemi</div>
                            <div style={{ fontSize:14, fontWeight:700, color:'#94a3b8', fontFamily:'var(--font-dm-mono)' }}>{cmpStr}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Genel Skor</div>
                        <div style={{ fontSize:48, fontWeight:900, fontFamily:'var(--font-dm-mono)', lineHeight:1, color:(d.trScore?.genel??0)>=100?'#34d399':(d.trScore?.genel??0)>=90?'#fbbf24':'#f87171' }}>{d.trScore?.genel??'—'}</div>
                      </div>
                      {d.trScoreCmp && (
                        <div style={{ borderLeft:'1px solid rgba(255,255,255,.12)', paddingLeft:28 }}>
                          <div style={{ fontSize:9, color:'#93c5fd', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>Önceki Dönem</div>
                          <div style={{ fontSize:26, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'#94a3b8', lineHeight:1 }}>{d.trScoreCmp.genel}</div>
                          <div style={{ marginTop:6 }}>
                            {(function() { const diff = (d.trScore?.genel??0) - d.trScoreCmp.genel; return <span style={{ fontSize:13, fontWeight:700, color:diff>=0?'#34d399':'#f87171' }}>{diff>=0?'▲ +':'▼ '}{diff} puan</span> })()}
                          </div>
                        </div>
                      )}
                      <div style={{ borderLeft:'1px solid rgba(255,255,255,.12)', paddingLeft:28 }}>
                        <div style={{ fontSize:9, color:'#93c5fd', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Kapsam</div>
                        {[SEGMENTLER.length + ' Segment', KPI_META.length + ' KPI', BOLGELER.length + ' Bölge'].map(t => (
                          <div key={t} style={{ fontSize:11, color:'#cbd5e1', marginBottom:3 }}>· {t}</div>
                        ))}
                      </div>
                    </div>
                    <YorumBlok text={yorumlar.genelBakis} color="#60a5fa" />
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(' + KATS.length + ',1fr)', gap:10 }}>
                  {d.katData.map((k: any) => {
                    const delta = k.cmpVal !== null ? k.trVal - k.cmpVal : null
                    return (
                      <div key={k.key} style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'12px', textAlign:'center', borderTop:'3px solid ' + k.color }}>
                        <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:6, fontWeight:600 }}>{k.label}</div>
                        <div style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-dm-mono)', color:k.color }}>{k.trVal}</div>
                        {delta !== null && <div style={{ fontSize:9, marginTop:3, fontWeight:700, color:delta>=0?'#10b981':'#ef4444' }}>{delta>=0?'▲ +':'▼ '}{delta}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
  )
}
