'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  fmtKpi, getKpisFromCube, getMarkaRanking, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, kpiUnit, chgColor, chgBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const KATS = [
  {key:'musteri',    label:'Müşteri'},
  {key:'ticari',     label:'Ticari'},
  {key:'operasyonel',label:'Operasyonel'},
  {key:'bayi',       label:'Bayi Ağı'},
  {key:'kapsam',     label:'Kapsam'},
]

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState<number>(3)
  const [activeTab, setActiveTab] = useState<'skor'|'kpi'|'marka'>('skor')

  const bolgeList = selBolge ? [selBolge] : BOLGELER
  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)
  const unit = kpiUnit(meta.fmt)

  // Tüm TR referans
  const trBaz  = useMemo(() => getScore(selSeg,'',selYas,selDonem),  [selSeg,selYas,selDonem])
  const trKpis = useMemo(() => getKpisFromCube(selSeg,'',selYas,selDonem), [selSeg,selYas,selDonem])

  // Her bölge için veriler
  const bolgeData = useMemo(() => bolgeList.map(b=>({
    bolge: b,
    bazScore: getScore(selSeg, b, selYas, selDonem),
    cmpScore: selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null,
    bazKpis:  getKpisFromCube(selSeg, b, selYas, selDonem),
    cmpKpis:  selCmpDonem ? getKpisFromCube(selSeg, b, selYas, selCmpDonem) : null,
  })), [selSeg,selBolge,selYas,selDonem,selCmpDonem,bolgeList])

  // Marka listesi
  const markalar = useMemo(() => {
    const cmpRanked = selCmpDonem ? getMarkaRanking(selSeg,'',selYas,selCmpDonem) : []
    return getMarkaRanking(selSeg,'',selYas,selDonem).map(m=>({
      ...m,
      cmpScore: cmpRanked.find(x=>x.marka===m.marka)?.score??null,
    }))
  }, [selSeg,selYas,selDonem,selCmpDonem])

  // Bar grafik
  const barBazData = bolgeList.map(b=>getKpisFromCube(selSeg,b,selYas,selDonem)[selKpi]??0)
  const barCmpData = bolgeList.map(b=>selCmpDonem?getKpisFromCube(selSeg,b,selYas,selCmpDonem)[selKpi]??0:0)
  const barMax = Math.max(...barBazData,...barCmpData,trKpis[selKpi]||0,0.001)

  const filterLabel = [selSeg||'Tüm Seg.',selYas==='Tümü'?'Tüm Yaş':selYas+'y',selDonem||'Tüm Dönem'].join(' · ')

  function chgPct(baz:number, cmp:number|null) {
    if(!cmp) return null
    return Math.round((baz-cmp)/Math.abs(cmp)*1000)/10
  }

  const kpiHeaders = KPI_META.map(function(k, idx) {
    return { no: k.no, ad: k.ad, kat: k.kat, fmt: k.fmt, i: idx, u: kpiUnit(k.fmt) }
  })

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi"
        subtitle={`${bolgeList.length} bölge · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* Tab seçici */}
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {([['skor','Skor Tablosu'],['kpi','KPI Değerleri'],['marka','Marka Detayı']] as const).map(([tab,label])=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{padding:'6px 16px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
                border:`1px solid ${activeTab===tab?'var(--blue)':'var(--bd)'}`,
                background:activeTab===tab?'rgba(59,130,246,.1)':'var(--surf2)',
                color:activeTab===tab?'var(--blue)':'var(--tx2)'}}>
              {label}
            </button>
          ))}
        </div>

        {/* ══ SKOR TABLOSU — satır:bölge, sütun:kategori ══ */}
        {activeTab==='skor' && (<>
          <div className={styles.card} style={{padding:0,overflow:'hidden',marginBottom:14}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--surf2)'}}>
                    <th style={thS}>Bölge</th>
                    <th style={{...thS,textAlign:'center',minWidth:80}}>Genel Skor</th>
                    {KATS.map(k=>(
                      <th key={k.key} style={{...thS,textAlign:'center',minWidth:90}}>{k.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Tüm TR referans satırı */}
                  <tr style={{borderBottom:'2px solid var(--bd2)',background:'rgba(251,191,36,.05)'}}>
                    <td style={{...tdS,fontWeight:700,color:'#fbbf24'}}>🇹🇷 Tüm TR</td>
                    <td style={{...tdS,textAlign:'center'}}>
                      <span style={{fontFamily:'var(--font-dm-mono)',fontSize:14,fontWeight:800,color:scoreColor(trBaz?.genel??0)}}>
                        {trBaz?.genel??'—'}
                      </span>
                    </td>
                    {KATS.map(k=>{
                      const val = trBaz?.[k.key as keyof typeof trBaz] as number??0
                      return (
                        <td key={k.key} style={{...tdS,textAlign:'center'}}>
                          <span style={{fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,color:scoreColor(val)}}>{val||'—'}</span>
                        </td>
                      )
                    })}
                  </tr>
                  {/* Bölge satırları */}
                  {bolgeData.map(b=>{
                    const bazG = b.bazScore?.genel??0
                    const cmpG = b.cmpScore?.genel??null
                    const chg  = chgPct(bazG,cmpG)
                    return (
                      <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)',
                        background:selBolge===b.bolge?'rgba(59,130,246,.04)':'transparent'}}>
                        <td style={{...tdS,fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap'}}>{b.bolge}</td>
                        {/* Genel skor */}
                        <td style={{...tdS,textAlign:'center',background:scoreBg(bazG)}}>
                          <div style={{fontFamily:'var(--font-dm-mono)',fontSize:13,fontWeight:800,color:scoreColor(bazG)}}>{bazG||'—'}</div>
                          {cmpG!==null&&<div style={{fontSize:9,color:'var(--tx3)'}}>{cmpG}</div>}
                          {chg!==null&&<div style={{fontSize:8,fontWeight:700,color:chgColor(chg)}}>{chg>=0?'▲+':'▼'}{Math.abs(chg)}%</div>}
                        </td>
                        {/* Kategori puanları */}
                        {KATS.map(k=>{
                          const bazV = b.bazScore?.[k.key as keyof typeof b.bazScore] as number??0
                          const cmpV = b.cmpScore?.[k.key as keyof typeof b.cmpScore] as number??null
                          const chgK = chgPct(bazV,cmpV)
                          return (
                            <td key={k.key} style={{...tdS,textAlign:'center',background:scoreBg(bazV)}}>
                              <div style={{fontFamily:'var(--font-dm-mono)',fontSize:11,fontWeight:700,color:scoreColor(bazV)}}>{bazV||'—'}</div>
                              {cmpV!==null&&chgK!==null&&<div style={{fontSize:7,fontWeight:700,color:chgColor(chgK)}}>{chgK>=0?'▲+':'▼'}{Math.abs(chgK)}%</div>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 12 KPI Puan tablosu — satır:bölge, sütun:KPI */}
          <div className={styles.card} style={{padding:0,overflow:'hidden',marginBottom:14}}>
            <div style={{padding:'10px 14px 8px',borderBottom:'1px solid var(--bd)',fontWeight:600,fontSize:11,color:'var(--tx2)'}}>
              12 KPI Puan — Satır: Bölge · Sütun: KPI · Tıklayarak KPI seç
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--surf2)'}}>
                    <th style={thS}>Bölge</th>
                    {kpiHeaders.map(k=>(
                      <th key={k.no} onClick={()=>setSelKpi(k.i)}
                        style={{...thS,textAlign:'center',cursor:'pointer',minWidth:68,whiteSpace:'normal',wordBreak:'break-word',
                          color:selKpi===k.i?'var(--blue)':'var(--tx3)',
                          background:selKpi===k.i?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                        <div style={{fontSize:8,lineHeight:1.3}}>{k.ad}{k.u?` (${k.u})`:''}</div>
                        {selKpi===k.i&&<div style={{fontSize:7}}>↓</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Tüm TR referans */}
                  <tr style={{borderBottom:'2px solid var(--bd2)',background:'rgba(251,191,36,.05)'}}>
                    <td style={{...tdS,fontWeight:700,color:'#fbbf24',whiteSpace:'nowrap'}}>🇹🇷 Tüm TR</td>
                    {KPI_META.map((_,i)=>(
                      <td key={i} style={{...tdS,textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:700,color:'#fbbf24',
                        outline:selKpi===i?'2px solid #fbbf2466':'none',outlineOffset:-1}}>
                        100
                      </td>
                    ))}
                  </tr>
                  {/* Bölge satırları */}
                  {bolgeData.map(b=>(
                    <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)',
                      background:selBolge===b.bolge?'rgba(59,130,246,.04)':'transparent'}}>
                      <td style={{...tdS,fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap'}}>{b.bolge}</td>
                      {b.bazKpis.map((bazV,i)=>{
                        const trVal = trKpis[i]??0
                        const cmpV  = b.cmpKpis?.[i]??null
                        const {bg,color} = heatColor(bazV,trVal,!isLowerBetter(i))
                        const chg   = chgPct(bazV,cmpV)
                        const puan  = trVal>0?Math.round((isLowerBetter(i)?trVal/bazV:bazV/trVal)*100):0
                        return (
                          <td key={i} onClick={()=>setSelKpi(i)}
                            style={{...tdS,textAlign:'center',background:bg,cursor:'pointer',
                              outline:selKpi===i?`2px solid ${color}55`:'none',outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,color}}>{puan}</div>
                            {cmpV!==null&&chg!==null&&<div style={{fontSize:7,fontWeight:700,color:chgColor(isLowerBetter(i)?-chg:chg)}}>{chg>=0?'+':''}{chg}%</div>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar grafik */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>{meta.ad}{unit?` (${unit})`:''} — Bölge Karşılaştırması</h3>
              <span className={styles.hint}>{filterLabel} · {lob?'↓':'↑'}</span>
            </div>
            <div style={{height:220}}>
              <Bar data={{
                labels:['Tüm TR',...bolgeList],
                datasets:[
                  {label:selDonem||'Baz',data:[trKpis[selKpi],...barBazData],
                    backgroundColor:['rgba(251,191,36,.15)',...bolgeList.map(()=>'rgba(59,130,246,.15)')],
                    borderColor:['#fbbf24',...bolgeList.map(()=>'#3b82f6')],borderWidth:2,borderRadius:5},
                  ...(selCmpDonem?[{label:selCmpDonem,
                    data:[getKpisFromCube(selSeg,'',selYas,selCmpDonem)[selKpi],...barCmpData],
                    backgroundColor:['rgba(251,191,36,.5)',...bolgeList.map(()=>'rgba(59,130,246,.5)')],
                    borderColor:['#fbbf24',...bolgeList.map(()=>'#3b82f6')],borderWidth:1,borderRadius:5}]:[])
                ]
              }} options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:9},boxWidth:10}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${fmtKpi(ctx.parsed.y as number,meta.fmt)}`}}},
                scales:{y:{min:0,max:barMax*1.2,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),meta.fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:9},maxRotation:30}}}}}/>
            </div>
          </div>
        </>)}

        {/* ══ KPI DEĞERLERİ — satır:bölge, sütun:KPI ══ */}
        {activeTab==='kpi' && (
          <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'10px 14px 8px',borderBottom:'1px solid var(--bd)',fontWeight:600,fontSize:11,color:'var(--tx2)'}}>
              KPI Gerçek Değerleri — Satır: Bölge · Sütun: KPI · Isı rengi Tüm TR'ye göre
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--surf2)'}}>
                    <th style={thS}>Bölge</th>
                    {kpiHeaders.map(k=>(
                      <th key={k.no} onClick={()=>setSelKpi(k.i)}
                        style={{...thS,textAlign:'center',cursor:'pointer',minWidth:72,whiteSpace:'normal',wordBreak:'break-word',
                          color:selKpi===k.i?'var(--blue)':'var(--tx3)',
                          background:selKpi===k.i?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                        <div style={{fontSize:8,lineHeight:1.3}}>{k.ad}{k.u?` (${k.u})`:''}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Tüm TR */}
                  <tr style={{borderBottom:'2px solid var(--bd2)',background:'rgba(251,191,36,.05)'}}>
                    <td style={{...tdS,fontWeight:700,color:'#fbbf24'}}>🇹🇷 Tüm TR</td>
                    {trKpis.map((v,i)=>(
                      <td key={i} style={{...tdS,textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:700,color:'#fbbf24',
                        outline:selKpi===i?'2px solid #fbbf2466':'none',outlineOffset:-1}}>
                        {fmtKpi(v,KPI_META[i].fmt)}
                      </td>
                    ))}
                  </tr>
                  {/* Bölgeler */}
                  {bolgeData.map(b=>(
                    <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)',
                      background:selBolge===b.bolge?'rgba(59,130,246,.04)':'transparent'}}>
                      <td style={{...tdS,fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap'}}>{b.bolge}</td>
                      {b.bazKpis.map((bazV,i)=>{
                        const trVal = trKpis[i]??0
                        const cmpV  = b.cmpKpis?.[i]??null
                        const {bg,color} = heatColor(bazV,trVal,!isLowerBetter(i))
                        const chg = chgPct(bazV,cmpV)
                        return (
                          <td key={i} onClick={()=>setSelKpi(i)}
                            style={{...tdS,textAlign:'center',background:bg,cursor:'pointer',
                              outline:selKpi===i?`2px solid ${color}55`:'none',outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,color}}>{fmtKpi(bazV,KPI_META[i].fmt)}</div>
                            {cmpV!==null&&(
                              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:2,marginTop:1}}>
                                <span style={{fontSize:7,color:'var(--tx3)',fontFamily:'var(--font-dm-mono)'}}>{fmtKpi(cmpV,KPI_META[i].fmt)}</span>
                                {chg!==null&&<span style={{fontSize:6,fontWeight:700,padding:'0 2px',borderRadius:2,
                                  background:chgBg(isLowerBetter(i)?-chg:chg),color:chgColor(isLowerBetter(i)?-chg:chg)}}>
                                  {chg>=0?'+':''}{chg}%
                                </span>}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Bar grafik — KPI sekmesi */}
          <div className={styles.card} style={{marginTop:14}}>
            <div className={styles.cardHd}>
              <h3>{meta.ad}{unit?` (${unit})`:''} — Bölge Karşılaştırması</h3>
              <span className={styles.hint}>{filterLabel} · {lob?'↓ Düşük daha iyi':'↑ Yüksek daha iyi'}</span>
            </div>
            <div style={{height:220}}>
              <Bar data={{
                labels:['Tüm TR',...bolgeList],
                datasets:[
                  {label:selDonem||'Baz',data:[trKpis[selKpi],...barBazData],
                    backgroundColor:['rgba(251,191,36,.15)',...bolgeList.map(()=>'rgba(59,130,246,.15)')],
                    borderColor:['#fbbf24',...bolgeList.map(()=>'#3b82f6')],borderWidth:2,borderRadius:5},
                  ...(selCmpDonem?[{label:selCmpDonem,
                    data:[getKpisFromCube(selSeg,'',selYas,selCmpDonem)[selKpi],...barCmpData],
                    backgroundColor:['rgba(251,191,36,.5)',...bolgeList.map(()=>'rgba(59,130,246,.5)')],
                    borderColor:['#fbbf24',...bolgeList.map(()=>'#3b82f6')],borderWidth:1,borderRadius:5}]:[])
                ]
              }} options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:9},boxWidth:10}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${fmtKpi(ctx.parsed.y as number,meta.fmt)}`}}},
                scales:{y:{min:0,max:barMax*1.2,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),meta.fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:9},maxRotation:30}}}}}/>
            </div>
          </div>
        )}

        {/* ══ MARKA DETAYI — satır:marka, sütun:bölge ══ */}
        {activeTab==='marka' && (
          <div className={styles.card} style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'10px 14px 6px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{fontWeight:600,fontSize:11,color:'var(--tx2)'}}>
                Marka × Bölge — {meta.ad}{unit?` (${unit})`:''}
              </span>
            </div>
            {/* KPI seçici */}
            <div style={{display:'flex',gap:4,padding:'6px 10px',flexWrap:'wrap',borderBottom:'1px solid var(--bd)',background:'var(--surf2)'}}>
              {KPI_META.map((k,i)=>(
                <button key={i} onClick={()=>setSelKpi(i)}
                  style={{padding:'2px 7px',borderRadius:4,fontSize:8,cursor:'pointer',
                    border:`1px solid ${selKpi===i?'var(--blue)':'var(--bd)'}`,
                    background:selKpi===i?'rgba(59,130,246,.1)':'transparent',
                    color:selKpi===i?'var(--blue)':'var(--tx3)'}}>
                  {k.ad.substring(0,13)}
                </button>
              ))}
            </div>
            <div style={{overflowX:'auto',overflowY:'auto',maxHeight:480}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,tableLayout:'auto'}}>
                <thead>
                  <tr style={{background:'var(--surf2)',position:'sticky',top:0,zIndex:3}}>
                    <th style={{...thS,minWidth:120}}>Marka</th>
                    <th style={{...thS,minWidth:65}}>Seg.</th>
                    <th style={{...thS,textAlign:'center',color:'#fbbf24',minWidth:80}}>Tüm TR</th>
                    {bolgeList.map(b=>(
                      <th key={b} style={{...thS,textAlign:'center',minWidth:80,
                        color:selBolge===b?'var(--blue)':'var(--tx3)',
                        background:selBolge===b?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                        {b}
                      </th>
                    ))}
                    <th style={{...thS,textAlign:'center',position:'sticky',right:0,background:'var(--surf2)',minWidth:70}}>
                      Skor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {markalar.map((m,i)=>{
                    const trVal = getKpisFromCube(m.segment,'',selYas,selDonem)[selKpi]??0
                    return (
                      <tr key={m.marka} style={{borderBottom:'1px solid var(--bd)'}}>
                        <td style={{...tdS,fontWeight:600,color:SEGMENT_HEX[m.segment]||'var(--tx)',whiteSpace:'nowrap'}}>
                          <span style={{color:'var(--tx3)',fontSize:8,marginRight:3,fontFamily:'var(--font-dm-mono)'}}>{i+1}</span>
                          {m.marka}
                        </td>
                        <td style={tdS}>
                          <span style={{background:SEGMENT_BG[m.segment],color:SEGMENT_COLORS[m.segment],
                            padding:'1px 5px',borderRadius:20,fontSize:7,fontWeight:700,textTransform:'uppercase',
                            border:`1px solid ${SEGMENT_COLORS[m.segment]}44`}}>
                            {m.segment}
                          </span>
                        </td>
                        {/* Tüm TR değeri */}
                        <td style={{...tdS,textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:700,color:'#fbbf24'}}>
                          {fmtKpi(trVal,meta.fmt)}
                        </td>
                        {/* Her bölge için seçili KPI değeri */}
                        {bolgeList.map(b=>{
                          const bazV = getKpisFromCube(m.segment,b,selYas,selDonem)[selKpi]??0
                          const {bg,color} = heatColor(bazV,trVal,!isLowerBetter(selKpi))
                          return (
                            <td key={b} style={{...tdS,textAlign:'center',background:bg,
                              outline:selBolge===b?`2px solid ${color}55`:'none',outlineOffset:-1}}>
                              <div style={{fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,color}}>
                                {fmtKpi(bazV,meta.fmt)}
                              </div>
                            </td>
                          )
                        })}
                        {/* Genel skor */}
                        <td style={{...tdS,position:'sticky',right:0,background:'var(--surf)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <div style={{flex:1,background:'var(--surf3)',borderRadius:3,height:4,overflow:'hidden',minWidth:28}}>
                              <div style={{width:`${m.score}%`,height:4,borderRadius:3,
                                background:m.score>=80?'#10b981':m.score>=65?'#3b82f6':m.score>=50?'#f59e0b':'#ef4444'}}/>
                            </div>
                            <span style={{fontFamily:'var(--font-dm-mono)',fontSize:10,fontWeight:700,minWidth:18,textAlign:'right',
                              color:m.score>=80?'#10b981':m.score>=65?'#3b82f6':m.score>=50?'#f59e0b':'#ef4444'}}>
                              {m.score}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Bar grafik — Marka sekmesi */}
          <div className={styles.card} style={{marginTop:14}}>
            <div className={styles.cardHd}>
              <h3>{meta.ad}{unit?` (${unit})`:''} — Bölge Karşılaştırması</h3>
              <span className={styles.hint}>{filterLabel} · {lob?'↓ Düşük daha iyi':'↑ Yüksek daha iyi'}</span>
            </div>
            <div style={{height:220}}>
              <Bar data={{
                labels:['Tüm TR',...bolgeList],
                datasets:[
                  {label:selDonem||'Baz',data:[trKpis[selKpi],...barBazData],
                    backgroundColor:['rgba(251,191,36,.15)',...bolgeList.map(()=>'rgba(59,130,246,.15)')],
                    borderColor:['#fbbf24',...bolgeList.map(()=>'#3b82f6')],borderWidth:2,borderRadius:5},
                  ...(selCmpDonem?[{label:selCmpDonem,
                    data:[getKpisFromCube(selSeg,'',selYas,selCmpDonem)[selKpi],...barCmpData],
                    backgroundColor:['rgba(251,191,36,.5)',...bolgeList.map(()=>'rgba(59,130,246,.5)')],
                    borderColor:['#fbbf24',...bolgeList.map(()=>'#3b82f6')],borderWidth:1,borderRadius:5}]:[])
                ]
              }} options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:9},boxWidth:10}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${fmtKpi(ctx.parsed.y as number,meta.fmt)}`}}},
                scales:{y:{min:0,max:barMax*1.2,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),meta.fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:9},maxRotation:30}}}}}/>
            </div>
          </div>
        )}

        {/* Renk açıklaması */}
        <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
          {[
            {c:'#10b981',bg:'rgba(16,185,129,.2)',label:'Tüm TR üstü'},
            {c:'#60a5fa',bg:'rgba(59,130,246,.15)',label:'%5–15 üstü'},
            {c:'#fbbf24',bg:'rgba(245,158,11,.12)',label:'Ortalama'},
            {c:'#f87171',bg:'rgba(239,68,68,.15)',label:'Tüm TR altı'},
          ].map(x=>(
            <div key={x.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
              <div style={{width:12,height:10,borderRadius:3,background:x.bg,border:`1px solid ${x.c}`}}/>
              {x.label}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--tx3)',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'6px 8px',borderBottom:'1px solid var(--bd)'}
