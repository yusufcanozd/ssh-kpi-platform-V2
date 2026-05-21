'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX,
  fmtKpi, getKpisFromCube, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, kpiUnit, chgColor,
  getKpiScores, kpiScoreColor, kpiScoreBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function pctChg(a: number, b: number | null): number | null {
  if (!b) return null
  return Math.round((a - b) / Math.abs(b) * 1000) / 10
}

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(3)
  const [mode, setMode] = useState<'kpiDeger'|'kpiSkor'|'katSkor'>('katSkor')

  const bolgeList = selBolge ? [selBolge] : BOLGELER
  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)
  const unit = kpiUnit(meta.fmt)

  // TR referans
  const trKpis = useMemo(() => getKpisFromCube(selSeg, '', selYas, selDonem), [selSeg, selYas, selDonem])
  const trKpisCmp = useMemo(() => selCmpDonem ? getKpisFromCube(selSeg, '', selYas, selCmpDonem) : null, [selSeg, selYas, selCmpDonem])
  const trScore = useMemo(() => getScore(selSeg, '', selYas, selDonem), [selSeg, selYas, selDonem])
  const trScoreCmp = useMemo(() => selCmpDonem ? getScore(selSeg, '', selYas, selCmpDonem) : null, [selSeg, selYas, selCmpDonem])
  const trKpiScores = useMemo(() => getKpiScores(selSeg, '', selYas, selDonem), [selSeg, selYas, selDonem])
  const trKpiScoresCmp = useMemo(() => selCmpDonem ? getKpiScores(selSeg, '', selYas, selCmpDonem) : null, [selSeg, selYas, selCmpDonem])

  // Bölge verileri
  const bolgeData = useMemo(() => bolgeList.map(b => ({
    bolge: b,
    kpis:      getKpisFromCube(selSeg, b, selYas, selDonem),
    kpisCmp:   selCmpDonem ? getKpisFromCube(selSeg, b, selYas, selCmpDonem) : null,
    kpiScores: getKpiScores(selSeg, b, selYas, selDonem),
    kpiScoresCmp: selCmpDonem ? getKpiScores(selSeg, b, selYas, selCmpDonem) : null,
    score:     getScore(selSeg, b, selYas, selDonem),
    scoreCmp:  selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null,
  })), [selSeg, selBolge, selYas, selDonem, selCmpDonem])

  // Bar grafik verileri — seçili KPI, satır=bölgeler
  const barLabels = ['Tüm TR', ...bolgeList]

  const barBaz = mode === 'kpiDeger'
    ? [trKpis[selKpi], ...bolgeData.map(b => b.kpis[selKpi] || 0)]
    : mode === 'kpiSkor'
    ? [trKpiScores[selKpi], ...bolgeData.map(b => b.kpiScores[selKpi] || 0)]
    : [trScore?.genel || 0, ...bolgeData.map(b => b.score?.genel || 0)]

  const barCmp = selCmpDonem
    ? mode === 'kpiDeger'
      ? [trKpisCmp?.[selKpi] || 0, ...bolgeData.map(b => b.kpisCmp?.[selKpi] || 0)]
      : mode === 'kpiSkor'
      ? [trKpiScoresCmp?.[selKpi] || 0, ...bolgeData.map(b => b.kpiScoresCmp?.[selKpi] || 0)]
      : [trScoreCmp?.genel || 0, ...bolgeData.map(b => b.scoreCmp?.genel || 0)]
    : []

  const barMax = Math.max(...barBaz, ...barCmp, 0.001) * 1.2
  const filterLabel = [selSeg||'Tüm Seg.', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')

  const KATS = [
    {key:'genel', label:'Genel'}, {key:'musteri', label:'Müşteri'},
    {key:'ticari', label:'Ticari'}, {key:'operasyonel', label:'Operasyonel'},
    {key:'bayi', label:'Bayi Ağı'}, {key:'kapsam', label:'Kapsam'},
  ]

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi"
        subtitle={`${bolgeList.length} bölge · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* Mod seçici */}
        <div style={{display:'flex', gap:8, marginBottom:14}}>
          {([['katSkor','Kategori Skor'],['kpiSkor','KPI Puan'],['kpiDeger','KPI Değerleri']] as const).map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)}
              style={{padding:'6px 16px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                border:`1px solid ${mode===m?'var(--blue)':'var(--bd)'}`,
                background:mode===m?'rgba(59,130,246,.1)':'var(--surf2)',
                color:mode===m?'var(--blue)':'var(--tx2)'}}>
              {l}
            </button>
          ))}
        </div>

        {/* KPI seçici — KPI modlarında görünür */}
        {mode !== 'katSkor' && (
          <div style={{display:'flex', gap:4, marginBottom:12, flexWrap:'wrap'}}>
            {KPI_META.map((k,i)=>(
              <button key={i} onClick={()=>setSelKpi(i)}
                style={{padding:'3px 10px', borderRadius:4, fontSize:10, cursor:'pointer',
                  fontWeight:selKpi===i?700:400,
                  border:`1px solid ${selKpi===i?'var(--blue)':'var(--bd)'}`,
                  background:selKpi===i?'rgba(59,130,246,.1)':'transparent',
                  color:selKpi===i?'var(--blue)':'var(--tx3)'}}>
                {k.ad}{kpiUnit(k.fmt)?` (${kpiUnit(k.fmt)})`:''}
              </button>
            ))}
          </div>
        )}

        {/* ── Tablo — satır: bölge, sütun: KPI veya kategori ── */}
        <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
          <div style={{overflowX:'auto', overflowY:'auto', maxHeight:400}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, tableLayout:'auto'}}>
              <thead>
                <tr style={{background:'var(--surf2)', position:'sticky', top:0, zIndex:3}}>
                  <th style={thS}>Bölge</th>
                  {mode === 'katSkor'
                    ? KATS.map(k=>(
                        <th key={k.key} style={{...thS, textAlign:'center', minWidth:80}}>{k.label}</th>
                      ))
                    : KPI_META.map((k,i)=>(
                        <th key={i} onClick={()=>setSelKpi(i)}
                          style={{...thS, textAlign:'center', cursor:'pointer', minWidth:70, whiteSpace:'normal', wordBreak:'break-word',
                            color:selKpi===i?'var(--blue)':'var(--tx3)',
                            background:selKpi===i?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                          <div style={{fontSize:8, lineHeight:1.3}}>{k.ad}{kpiUnit(k.fmt)?` (${kpiUnit(k.fmt)})`:''}
                          {selKpi===i&&<span style={{fontSize:7}}> ↓</span>}</div>
                        </th>
                      ))
                  }
                </tr>
              </thead>
              <tbody>
                {/* Tüm TR referans satırı */}
                <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                  <td style={{...tdS, fontWeight:700, color:'#fbbf24'}}>🇹🇷 Tüm TR</td>
                  {mode === 'katSkor'
                    ? KATS.map(k=>{
                        const v  = trScore  ? (k.key==='genel' ? trScore.genel  : (trScore[k.key  as keyof typeof trScore]  as number||0)) : 0
                        const vc = trScoreCmp ? (k.key==='genel' ? trScoreCmp.genel : (trScoreCmp[k.key as keyof typeof trScoreCmp] as number||0)) : null
                        const chg = pctChg(v, vc)
                        return (
                          <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(v)}}>
                            <div style={{fontFamily:'var(--font-dm-mono)', fontSize:13, fontWeight:800, color:scoreColor(v)}}>{v}</div>
                            {vc!==null&&<div style={{fontSize:9, color:'var(--tx3)'}}>{vc}</div>}
                            {chg!==null&&<div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg>=0?'+':''}{chg}%</div>}
                          </td>
                        )
                      })
                    : KPI_META.map((_,i)=>{
                        const v   = mode==='kpiSkor' ? trKpiScores[i] : trKpis[i]||0
                        const vc  = mode==='kpiSkor' ? (trKpiScoresCmp?.[i]||null) : (trKpisCmp?.[i]||null)
                        const chg = pctChg(v, vc)
                        const bg  = mode==='kpiSkor' ? kpiScoreBg(v) : heatColor(v,trKpis[i]||1,!isLowerBetter(i)).bg
                        const col = mode==='kpiSkor' ? kpiScoreColor(v) : '#fbbf24'
                        return (
                          <td key={i} style={{...tdS, textAlign:'center', background:bg,
                            outline:selKpi===i?'2px solid #fbbf2466':'none', outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:col}}>
                              {mode==='kpiSkor' ? v : fmtKpi(v, KPI_META[i].fmt)}
                            </div>
                            {vc!==null&&<div style={{fontSize:8, color:'var(--tx3)'}}>{mode==='kpiSkor' ? vc : fmtKpi(vc, KPI_META[i].fmt)}</div>}
                            {chg!==null&&<div style={{fontSize:7, fontWeight:700, color:chgColor(isLowerBetter(i)?-chg:chg)}}>{chg>=0?'+':''}{chg}%</div>}
                          </td>
                        )
                      })
                  }
                </tr>
                {/* Bölge satırları */}
                {bolgeData.map(b=>(
                  <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)',
                    background:selBolge===b.bolge?'rgba(59,130,246,.04)':'transparent'}}>
                    <td style={{...tdS, fontWeight:600, color:'var(--tx)', whiteSpace:'nowrap'}}>{b.bolge}</td>
                    {mode === 'katSkor'
                      ? KATS.map(k=>{
                          const v  = b.score   ? (k.key==='genel' ? b.score.genel   : (b.score[k.key   as keyof typeof b.score]   as number||0)) : 0
                          const vc = b.scoreCmp ? (k.key==='genel' ? b.scoreCmp.genel : (b.scoreCmp[k.key as keyof typeof b.scoreCmp] as number||null)) : null
                          const chg = pctChg(v, vc)
                          return (
                            <td key={k.key} style={{...tdS, textAlign:'center', background:scoreBg(v)}}>
                              <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:scoreColor(v)}}>{v||'-'}</div>
                              {vc!==null&&<div style={{fontSize:9, color:'var(--tx3)'}}>{vc}</div>}
                              {chg!==null&&<div style={{fontSize:8, fontWeight:700, color:chgColor(chg)}}>{chg>=0?'+':''}{chg}%</div>}
                            </td>
                          )
                        })
                      : KPI_META.map((_,i)=>{
                          const v   = mode==='kpiSkor' ? b.kpiScores[i] : b.kpis[i]||0
                          const vc  = mode==='kpiSkor' ? (b.kpiScoresCmp?.[i]||null) : (b.kpisCmp?.[i]||null)
                          const ref = mode==='kpiSkor' ? trKpiScores[i] : trKpis[i]||1
                          const chg = pctChg(v, vc)
                          const hc  = mode==='kpiSkor' ? {bg:kpiScoreBg(v), color:kpiScoreColor(v)} : heatColor(v, ref, !isLowerBetter(i))
                          return (
                            <td key={i} onClick={()=>setSelKpi(i)}
                              style={{...tdS, textAlign:'center', background:hc.bg, cursor:'pointer',
                                outline:selKpi===i?`2px solid ${hc.color}55`:'none', outlineOffset:-1}}>
                              <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:hc.color}}>
                                {mode==='kpiSkor' ? v : fmtKpi(v, KPI_META[i].fmt)}
                              </div>
                              {vc!==null&&<div style={{fontSize:8, color:'var(--tx3)'}}>{mode==='kpiSkor' ? vc : fmtKpi(vc, KPI_META[i].fmt)}</div>}
                              {chg!==null&&<div style={{fontSize:7, fontWeight:700, color:chgColor(isLowerBetter(i)?-chg:chg)}}>{chg>=0?'+':''}{chg}%</div>}
                            </td>
                          )
                        })
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bar grafik — seçili KPI veya kategori skoru, satır=bölgeler */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>
              {mode==='katSkor' ? 'Genel Skor' : mode==='kpiSkor' ? `KPI ${meta.no}: ${meta.ad} — Puan` : `KPI ${meta.no}: ${meta.ad}${unit?` (${unit})`:''}`}
              {' '}— Bölge Karşılaştırması
            </h3>
            <span className={styles.hint}>{filterLabel} · {mode==='kpiDeger'&&lob?'↓ Düşük daha iyi':'↑ Yüksek daha iyi'}</span>
          </div>
          <div style={{height:240}}>
            <Bar
              data={{
                labels: barLabels,
                datasets: [
                  {
                    label: selDonem||'Baz Dönem',
                    data: barBaz,
                    backgroundColor: barLabels.map((_,i)=>i===0?'rgba(251,191,36,.15)':'rgba(59,130,246,.15)'),
                    borderColor:     barLabels.map((_,i)=>i===0?'#fbbf24':'#3b82f6'),
                    borderWidth:2, borderRadius:5,
                  },
                  ...(selCmpDonem?[{
                    label: selCmpDonem,
                    data: barCmp,
                    backgroundColor: barLabels.map((_,i)=>i===0?'rgba(251,191,36,.5)':'rgba(59,130,246,.5)'),
                    borderColor:     barLabels.map((_,i)=>i===0?'#fbbf24':'#3b82f6'),
                    borderWidth:1, borderRadius:5,
                  }]:[])
                ]
              }}
              options={{
                responsive:true, maintainAspectRatio:false,
                plugins:{
                  legend:{display:!!selCmpDonem, position:'top', labels:{color:'#8496b0', font:{size:10}, boxWidth:12}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${mode==='kpiDeger'?fmtKpi(ctx.parsed.y as number, meta.fmt):ctx.parsed.y+' puan'}`}}
                },
                scales:{
                  y:{min:0, max:barMax, grid:{color:'rgba(255,255,255,.05)'},
                    ticks:{color:'#8496b0', font:{size:9}, callback:(v)=>mode==='kpiDeger'?fmtKpi(Number(v),meta.fmt):String(v)}},
                  x:{grid:{display:false}, ticks:{color:'#8496b0', font:{size:9}, maxRotation:30}}
                }
              }}
            />
          </div>
        </div>

        {/* Renk açıklaması */}
        <div style={{display:'flex', gap:12, marginTop:8, flexWrap:'wrap'}}>
          {mode==='katSkor'
            ? [{c:'#10b981',bg:'rgba(16,185,129,.2)',l:'≥100 puan'},{c:'#f59e0b',bg:'rgba(245,158,11,.12)',l:'90-100'},{c:'#ef4444',bg:'rgba(239,68,68,.12)',l:'<90 puan'}]
              .map(x=>(<div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}><div style={{width:12,height:10,borderRadius:3,background:x.bg,border:`1px solid ${x.c}`}}/>{x.l}</div>))
            : [{c:'#10b981',bg:'rgba(16,185,129,.2)',l:'TR üstü'},{c:'#60a5fa',bg:'rgba(59,130,246,.15)',l:'%5-15 üstü'},{c:'#fbbf24',bg:'rgba(245,158,11,.12)',l:'Ortalama'},{c:'#f87171',bg:'rgba(239,68,68,.15)',l:'TR altı'}]
              .map(x=>(<div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}><div style={{width:12,height:10,borderRadius:3,background:x.bg,border:`1px solid ${x.c}`}}/>{x.l}</div>))
          }
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'6px 8px', borderBottom:'1px solid var(--bd)'}
