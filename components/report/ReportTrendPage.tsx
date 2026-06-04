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

export default function ReportTrendPage({ d, yorumlar, bazStr, cmpStr, runtimeCalc, selBolge, selYas }: Props) {
  return (
              <div className="rapor-sayfa">
                <div style={{ background:'var(--surf)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 16px' }}>
                  <ReportSectionHeader icon="📈" title={`Dönemsel Trend (${d.trendDonemler.join(' → ')})`} />
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {KPI_META.slice(0,8).map((k, idx) => {
                      const vals = d.trendDonemler.map((dt: string) => runtimeCalc.getKpisFromCube('', selBolge, selYas, dt)[idx]??0)
                      const lob = isLowerBetter(idx)
                      const first = vals[0], last = vals[vals.length-1]
                      const trend = first ? ((last-first)/Math.abs(first)*100) : 0
                      const tc = (lob?trend<0:trend>0)?'#10b981':Math.abs(trend)<2?'#9ca3af':'#ef4444'
                      const minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV-minV||1
                      const W = 130, H = 40
                      const pts = vals.map((v: number, i: number) => ({ x: (i/(vals.length-1))*W, y: H-((v-minV)/range)*H*.8-H*.1 }))
                      const pathD = pts.map((p: any, i: number) => (i===0?'M':'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
                      return (
                        <div key={idx} style={{ background:'var(--surf2)', borderRadius:8, padding:10 }}>
                          <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:6, lineHeight:1.3, minHeight:24 }}>{k.ad}</div>
                          <svg width={W} height={H+16} style={{ overflow:'visible' }}>
                            <path d={pathD} fill="none" stroke={tc} strokeWidth={1.5} strokeLinecap="round" />
                            {pts.map((p: any, pi: number) => (
                              <g key={pi}>
                                <circle cx={p.x} cy={p.y} r={2.5} fill={tc} />
                                <text x={p.x} y={H+13} textAnchor="middle" fontSize={7} fill="#9ca3af">{d.trendDonemler[pi]?.split('-')[1]}</text>
                              </g>
                            ))}
                          </svg>
                          <div style={{ fontSize:8, fontWeight:700, color:tc, marginTop:4 }}>{trend>0?'▲ +':trend<0?'▼ ':'→ '}{Math.abs(Math.round(trend*10)/10)}% trend</div>
                        </div>
                      )
                    })}
                  </div>
                  <YorumBlok text={yorumlar.trend} color="#06b6d4" />
                </div>
              </div>
  )
}
