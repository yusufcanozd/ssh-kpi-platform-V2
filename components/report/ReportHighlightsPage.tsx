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

export default function ReportHighlightsPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas, kats = KATS }: Props) {
  return (
              <div className="rapor-sayfa">
                <div style={{ background:'linear-gradient(135deg,#0f2744,#1a3a5c,#0f2040)', borderRadius:12, padding:'28px 32px', color:'#fff' }}>
                  <div style={{ fontSize:14, fontWeight:800, marginBottom:20 }}>💡 360° Stratejik Değerlendirme ve Öneriler</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Güçlü Yönler</div>
                      {[...d.katData].sort((a: any, b: any) => b.trVal - a.trVal).slice(0,2).map((k: any) => (
                        <div key={k.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', flexShrink:0, display:'inline-block' }} />
                          <span style={{ fontSize:10, color:'#e2e8f0', fontWeight:600 }}>{k.label}: <strong>{k.trVal}</strong> puan{k.cmpVal!==null?' (önceki: '+k.cmpVal+')':''}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#f87171', marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Gelişim Alanları</div>
                      {[...d.katData].sort((a: any, b: any) => a.trVal - b.trVal).slice(0,2).map((k: any) => (
                        <div key={k.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'8px 12px' }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:'#f87171', flexShrink:0, display:'inline-block' }} />
                          <span style={{ fontSize:10, color:'#e2e8f0', fontWeight:600 }}>{k.label}: <strong>{k.trVal}</strong> puan{k.cmpVal!==null?' (önceki: '+k.cmpVal+')':''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {yorumlar.strateji && (
                    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:8, padding:'16px 18px', fontSize:11, lineHeight:1.9, color:'#e2e8f0', borderLeft:'3px solid #34d399' }}>
                      {yorumlar.strateji}
                    </div>
                  )}
                  <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.1)', fontSize:8, color:'#475569', display:'flex', justifyContent:'space-between' }}>
                    <span>{'SSH Rekabet Analizi · Baz: ' + bazStr + (cmpStr?' · Karş: '+cmpStr:'')}</span>
                    <span>{(selBolge||'Tüm Türkiye') + ' · ' + new Date().toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>
  )
}
