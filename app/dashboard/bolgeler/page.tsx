'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER,
  fmtKpi, getKpisFromCube, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, kpiUnit, chgColor,
  getKpiScores, kpiScoreColor, kpiScoreBg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const KATS = [
  {key:'genel',       label:'Genel'},
  {key:'musteri',     label:'Müşteri'},
  {key:'ticari',      label:'Ticari'},
  {key:'operasyonel', label:'Operasyonel'},
  {key:'bayi',        label:'Bayi Ağı'},
  {key:'kapsam',      label:'Kapsam'},
]

function pct(a: number, b: number | null): number | null {
  if (!b) return null
  return Math.round((a - b) / Math.abs(b) * 1000) / 10
}

function ScoreCell({ baz, cmp, large }: { baz: number; cmp: number | null; large?: boolean }) {
  const chg = pct(baz, cmp)
  const clr = chgColor(chg ?? 0)
  return (
    <td style={{padding:'6px 8px', borderBottom:'1px solid var(--bd)', textAlign:'center', background:scoreBg(baz)}}>
      <div style={{fontFamily:'var(--font-dm-mono)', fontSize:large?14:12, fontWeight:800, color:scoreColor(baz), lineHeight:1}}>{baz||'-'}</div>
      {cmp!==null && <div style={{fontSize:9, color:'var(--tx3)', marginTop:1}}>{cmp}</div>}
      {chg!==null && <div style={{fontSize:8, fontWeight:700, color:clr, marginTop:1}}>{chg>=0?'+':''}{chg}%</div>}
    </td>
  )
}

function KpiCell({ baz, cmp, fmt, ref, lob, active }: {
  baz: number; cmp: number | null; fmt: string; ref: number; lob: boolean; active: boolean
}) {
  const hc  = heatColor(baz, ref, !lob)
  const chg = pct(baz, cmp)
  return (
    <td style={{padding:'6px 8px', borderBottom:'1px solid var(--bd)', textAlign:'center',
      background: hc.bg, outline: active ? `2px solid ${hc.color}55` : 'none', outlineOffset:-1}}>
      <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:hc.color, lineHeight:1}}>{fmtKpi(baz, fmt)}</div>
      {cmp!==null && <div style={{fontSize:9, color:'var(--tx3)', marginTop:1}}>{fmtKpi(cmp, fmt)}</div>}
      {chg!==null && <div style={{fontSize:7, fontWeight:700, marginTop:1, color:chgColor(lob?-chg:chg)}}>{chg>=0?'+':''}{chg}%</div>}
    </td>
  )
}

function KpiScoreCell({ baz, cmp, active }: { baz: number; cmp: number | null; active: boolean }) {
  const chg = pct(baz, cmp)
  return (
    <td style={{padding:'6px 8px', borderBottom:'1px solid var(--bd)', textAlign:'center',
      background: kpiScoreBg(baz), outline: active ? `2px solid ${kpiScoreColor(baz)}55` : 'none', outlineOffset:-1}}>
      <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:kpiScoreColor(baz), lineHeight:1}}>{baz}</div>
      {cmp!==null && <div style={{fontSize:9, color:'var(--tx3)', marginTop:1}}>{cmp}</div>}
      {chg!==null && <div style={{fontSize:8, fontWeight:700, marginTop:1, color:chgColor(chg)}}>{chg>=0?'+':''}{chg}%</div>}
    </td>
  )
}

function SkorSutun({ bazG, cmpG, bazRank, cmpRank }: { bazG:number; cmpG:number|null; bazRank:number; cmpRank:number|null }) {
  const rankDiff = cmpRank !== null ? bazRank - cmpRank : null
  const sc = bazG>=80?'#10b981':bazG>=65?'#3b82f6':bazG>=50?'#f59e0b':'#ef4444'
  return (
    <td style={{padding:'6px 8px', borderBottom:'1px solid var(--bd)', position:'sticky', right:0, background:'var(--surf)', minWidth:80}}>
      <div style={{display:'flex', alignItems:'center', gap:4}}>
        <div style={{flex:1, background:'var(--surf3)', borderRadius:3, height:4, overflow:'hidden', minWidth:28}}>
          <div style={{width:Math.min(bazG,100)+'%', height:4, borderRadius:3, background:sc+'99'}}/>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:sc}}>{bazG}</div>
          {cmpG!==null && <div style={{fontSize:8, color:'var(--tx3)'}}>{cmpG}</div>}
          {rankDiff!==null && (
            <div style={{fontSize:8, fontWeight:700, color:rankDiff>0?'#10b981':rankDiff<0?'#f87171':'var(--tx3)'}}>
              {rankDiff>0?`+${rankDiff}`:rankDiff<0?rankDiff:'-'}
            </div>
          )}
        </div>
      </div>
    </td>
  )
}

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(3)
  const [selKat, setSelKat] = useState('genel')
  const [mode, setMode]     = useState<'katSkor'|'kpiSkor'|'kpiDeger'>('katSkor')

  const bolgeList = selBolge ? [selBolge] : BOLGELER
  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)
  const unit = kpiUnit(meta.fmt)

  const trKpis        = useMemo(() => getKpisFromCube(selSeg,'',selYas,selDonem), [selSeg,selYas,selDonem])
  const trKpisCmp     = useMemo(() => selCmpDonem?getKpisFromCube(selSeg,'',selYas,selCmpDonem):null, [selSeg,selYas,selCmpDonem])
  const trScore       = useMemo(() => getScore(selSeg,'',selYas,selDonem),  [selSeg,selYas,selDonem])
  const trScoreCmp    = useMemo(() => selCmpDonem?getScore(selSeg,'',selYas,selCmpDonem):null, [selSeg,selYas,selCmpDonem])
  const trKpiScores   = useMemo(() => getKpiScores(selSeg,'',selYas,selDonem), [selSeg,selYas,selDonem])
  const trKpiScoresCmp= useMemo(() => selCmpDonem?getKpiScores(selSeg,'',selYas,selCmpDonem):null, [selSeg,selYas,selCmpDonem])

  const bolgeData = useMemo(() => bolgeList.map(b=>({
    bolge: b,
    kpis:          getKpisFromCube(selSeg,b,selYas,selDonem),
    kpisCmp:       selCmpDonem?getKpisFromCube(selSeg,b,selYas,selCmpDonem):null,
    kpiScores:     getKpiScores(selSeg,b,selYas,selDonem),
    kpiScoresCmp:  selCmpDonem?getKpiScores(selSeg,b,selYas,selCmpDonem):null,
    score:         getScore(selSeg,b,selYas,selDonem),
    scoreCmp:      selCmpDonem?getScore(selSeg,b,selYas,selCmpDonem):null,
  })), [selSeg,selBolge,selYas,selDonem,selCmpDonem])

  // Skor sütunu için genel puan
  const getGenelPuan = (b: typeof bolgeData[0]) => b.score?.genel || 0
  const getGenelPuanCmp = (b: typeof bolgeData[0]) => b.scoreCmp?.genel || null
  const sortedByBaz = [...bolgeData].sort((a,b2)=>getGenelPuan(b2)-getGenelPuan(a))
  const sortedByCmp = selCmpDonem ? [...bolgeData].sort((a,b2)=>(getGenelPuanCmp(b2)||0)-(getGenelPuanCmp(a)||0)) : []

  // Bar grafik
  const barLabels = ['Tüm TR', ...bolgeList]

  function getKatVal(s: any, key: string): number {
    if (!s) return 0
    if (key==='genel') return s.genel || 0
    return (s[key as keyof typeof s] as number) || 0
  }

  function getBarBaz(b: typeof bolgeData[0]) {
    if (mode==='katSkor') return getKatVal(b.score, selKat)
    if (mode==='kpiSkor') return b.kpiScores[selKpi] || 0
    return b.kpis[selKpi] || 0
  }
  function getBarCmp(b: typeof bolgeData[0]) {
    if (!selCmpDonem) return 0
    if (mode==='katSkor') return getKatVal(b.scoreCmp, selKat)
    if (mode==='kpiSkor') return b.kpiScoresCmp?.[selKpi] || 0
    return b.kpisCmp?.[selKpi] || 0
  }

  const trBarBaz = mode==='katSkor'?getKatVal(trScore,selKat):mode==='kpiSkor'?trKpiScores[selKpi]:(trKpis[selKpi]||0)
  const trBarCmp = !selCmpDonem?0:mode==='katSkor'?getKatVal(trScoreCmp,selKat):mode==='kpiSkor'?(trKpiScoresCmp?.[selKpi]||0):(trKpisCmp?.[selKpi]||0)

  const barBaz = [trBarBaz, ...bolgeData.map(getBarBaz)]
  const barCmp = selCmpDonem ? [trBarCmp, ...bolgeData.map(getBarCmp)] : []
  const barMax = Math.max(...barBaz, ...barCmp, 0.001) * 1.2

  const filterLabel = [selSeg||'Tüm Seg.', selYas==='Tümü'?'Tüm Yaş':selYas+'y', selDonem||'Tüm Dönem'].join(' · ')

  const thS: React.CSSProperties = {padding:'8px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap', background:'var(--surf2)'}
  const thC: React.CSSProperties = {...thS, textAlign:'center' as const}

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi"
        subtitle={`${bolgeList.length} bölge · ${filterLabel}${selCmpDonem?' vs '+selCmpDonem:''}`}/>
      <div className={styles.content}>

        {/* Mod seçici */}
        <div style={{display:'flex', gap:8, marginBottom:14}}>
          {([['katSkor','Kategori Skor'],['kpiSkor','KPI Skor'],['kpiDeger','KPI Değerleri']] as const).map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)}
              style={{padding:'6px 16px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                border:`1px solid ${mode===m?'var(--blue)':'var(--bd)'}`,
                background:mode===m?'rgba(59,130,246,.1)':'var(--surf2)',
                color:mode===m?'var(--blue)':'var(--tx2)'}}>
              {l}
            </button>
          ))}
        </div>



        {/* ── TABLO ── */}
        <div className={styles.card} style={{padding:0, overflow:'hidden', marginBottom:14}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, tableLayout:'auto'}}>
              <thead>
                <tr style={{background:'var(--surf2)'}}>
                  <th style={thS}>Bölge</th>

                  {mode==='katSkor' && KATS.map(k=>(
                    <th key={k.key} onClick={()=>setSelKat(k.key)}
                      style={{...thC, cursor:'pointer', minWidth:80,
                        color:selKat===k.key?'var(--blue)':'var(--tx3)',
                        background:selKat===k.key?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                      {k.label}{selKat===k.key?' ↓':''}
                    </th>
                  ))}

                  {mode!=='katSkor' && KPI_META.map((k,i)=>(
                    <th key={i} onClick={()=>setSelKpi(i)}
                      style={{...thC, cursor:'pointer', minWidth:70, whiteSpace:'normal', wordBreak:'break-word',
                        color:selKpi===i?'var(--blue)':'var(--tx3)',
                        background:selKpi===i?'rgba(59,130,246,.06)':'var(--surf2)'}}>
                      <div style={{fontSize:8, lineHeight:1.3}}>
                        {k.ad}{kpiUnit(k.fmt)?` (${kpiUnit(k.fmt)})`:''}{selKpi===i?' ↓':''}
                      </div>
                    </th>
                  ))}

                  <th style={{...thC, position:'sticky', right:0, background:'var(--surf2)', minWidth:90}}>
                    Skor{selCmpDonem?' / Δ Sıra':''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Tüm TR referans */}
                <tr style={{borderBottom:'2px solid var(--bd2)', background:'rgba(251,191,36,.05)'}}>
                  <td style={{padding:'6px 8px', fontWeight:700, color:'#fbbf24', borderBottom:'2px solid var(--bd2)', whiteSpace:'nowrap'}}>🇹🇷 Tüm TR</td>

                  {mode==='katSkor' && KATS.map(k=>{
                    const v  = trScore   ? (k.key==='genel'?trScore.genel   :(trScore[k.key   as keyof typeof trScore]   as number||0)) : 0
                    const vc = trScoreCmp? (k.key==='genel'?trScoreCmp.genel:(trScoreCmp[k.key as keyof typeof trScoreCmp] as number||null)) : null
                    return <ScoreCell key={k.key} baz={v} cmp={vc} large/>
                  })}

                  {mode==='kpiSkor' && trKpiScores.map((v,i)=>(
                    <KpiScoreCell key={i} baz={v} cmp={trKpiScoresCmp?.[i]??null} active={selKpi===i}/>
                  ))}

                  {mode==='kpiDeger' && KPI_META.map((_,i)=>{
                    const v   = trKpis[i] || 0
                    const cv  = trKpisCmp ? (trKpisCmp[i] || null) : null
                    const hc  = {bg:'rgba(251,191,36,.08)', color:'#fbbf24'}
                    const chg = pct(v, cv)
                    return (
                      <td key={i} style={{padding:'6px 8px', borderBottom:'2px solid var(--bd2)', textAlign:'center',
                        background:hc.bg, outline:selKpi===i?'2px solid #fbbf2466':'none', outlineOffset:-1}}>
                        <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, color:hc.color}}>{fmtKpi(v, KPI_META[i].fmt)}</div>
                        {cv!==null && <div style={{fontSize:9, color:'var(--tx3)', marginTop:1}}>{fmtKpi(cv, KPI_META[i].fmt)}</div>}
                        {chg!==null && <div style={{fontSize:7, fontWeight:700, marginTop:1, color:chgColor(isLowerBetter(i)?-chg:chg)}}>{chg>=0?'+':''}{chg}%</div>}
                      </td>
                    )
                  })}

                  <td style={{padding:'6px 8px', borderBottom:'2px solid var(--bd2)', position:'sticky', right:0, background:'var(--surf)', textAlign:'center'}}>
                    <span style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:700, color:scoreColor(trScore?.genel||0)}}>{trScore?.genel||'-'}</span>
                    {trScoreCmp && <div style={{fontSize:9, color:'var(--tx3)'}}>{trScoreCmp.genel}</div>}
                  </td>
                </tr>

                {/* Bölge satırları */}
                {bolgeData.map((b,bi)=>{
                  const bazG    = b.score?.genel || 0
                  const cmpG    = b.scoreCmp?.genel ?? null
                  const bazRank = sortedByBaz.findIndex(x=>x.bolge===b.bolge)+1
                  const cmpRank = selCmpDonem ? sortedByCmp.findIndex(x=>x.bolge===b.bolge)+1 : null
                  return (
                    <tr key={b.bolge} style={{borderBottom:'1px solid var(--bd)',
                      background:selBolge===b.bolge?'rgba(59,130,246,.04)':'transparent'}}>
                      <td style={{padding:'6px 8px', fontWeight:600, color:'var(--tx)', whiteSpace:'nowrap', borderBottom:'1px solid var(--bd)'}}>{b.bolge}</td>

                      {mode==='katSkor' && KATS.map(k=>{
                        const v  = b.score   ? (k.key==='genel'?b.score.genel   :(b.score[k.key   as keyof typeof b.score]   as number||0)) : 0
                        const vc = b.scoreCmp? (k.key==='genel'?b.scoreCmp.genel:(b.scoreCmp[k.key as keyof typeof b.scoreCmp] as number||null)) : null
                        return <ScoreCell key={k.key} baz={v} cmp={vc}/>
                      })}

                      {mode==='kpiSkor' && b.kpiScores.map((v,i)=>(
                        <td key={i} onClick={()=>setSelKpi(i)}
                          style={{padding:'6px 8px', borderBottom:'1px solid var(--bd)', textAlign:'center', cursor:'pointer',
                            background:kpiScoreBg(v), outline:selKpi===i?`2px solid ${kpiScoreColor(v)}55`:'none', outlineOffset:-1}}>
                          <div style={{fontFamily:'var(--font-dm-mono)', fontSize:12, fontWeight:800, color:kpiScoreColor(v), lineHeight:1}}>{v}</div>
                          {b.kpiScoresCmp && <div style={{fontSize:9, color:'var(--tx3)', marginTop:1}}>{b.kpiScoresCmp[i]}</div>}
                          {b.kpiScoresCmp && pct(v,b.kpiScoresCmp[i])!==null && (
                            <div style={{fontSize:7, fontWeight:700, marginTop:1, color:chgColor(pct(v,b.kpiScoresCmp[i])!)}}>{pct(v,b.kpiScoresCmp[i])!>=0?'+':''}{pct(v,b.kpiScoresCmp[i])}%</div>
                          )}
                        </td>
                      ))}

                      {mode==='kpiDeger' && KPI_META.map((_,i)=>{
                        const v   = b.kpis[i] || 0
                        const ref = trKpis[i] || 1
                        const hc  = heatColor(v, ref, !isLowerBetter(i))
                        const cv  = b.kpisCmp ? (b.kpisCmp[i] || null) : null
                        const chg = pct(v, cv)
                        return (
                          <td key={i} onClick={()=>setSelKpi(i)}
                            style={{padding:'6px 8px', borderBottom:'1px solid var(--bd)', textAlign:'center', cursor:'pointer',
                              background:hc.bg, outline:selKpi===i?`2px solid ${hc.color}55`:'none', outlineOffset:-1}}>
                            <div style={{fontFamily:'var(--font-dm-mono)', fontSize:11, fontWeight:700, lineHeight:1, color:hc.color}}>
                              {fmtKpi(v, KPI_META[i].fmt)}
                            </div>
                            {cv!==null && <div style={{fontSize:9, color:'var(--tx3)', marginTop:1}}>{fmtKpi(cv, KPI_META[i].fmt)}</div>}
                            {chg!==null && (
                              <div style={{fontSize:7, fontWeight:700, marginTop:1, color:chgColor(isLowerBetter(i)?-chg:chg)}}>{chg>=0?'+':''}{chg}%</div>
                            )}
                          </td>
                        )
                      })}

                      <SkorSutun bazG={bazG} cmpG={cmpG} bazRank={bazRank} cmpRank={cmpRank}/>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bar grafik */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>
              {mode==='katSkor'
                ? (KATS.find(k=>k.key===selKat)?.label||'Genel') + ' Skoru'
                : mode==='kpiSkor'
                ? `${meta.ad} — Puan`
                : `${meta.ad}${unit?` (${unit})`:''}`}
              {' '}— Bölge Karşılaştırması
            </h3>
            <span className={styles.hint}>{filterLabel}</span>
          </div>
          <div style={{height:240}}>
            <Bar
              data={{
                labels: barLabels,
                datasets:[
                  {
                    label: selDonem||'Baz',
                    data: barBaz,
                    backgroundColor: barLabels.map((_,i)=>i===0?'rgba(251,191,36,.15)':'rgba(59,130,246,.15)'),
                    borderColor:     barLabels.map((_,i)=>i===0?'#fbbf24':'#3b82f6'),
                    borderWidth:2, borderRadius:5,
                  },
                  ...(selCmpDonem?[{
                    label:selCmpDonem,
                    data:barCmp,
                    backgroundColor:barLabels.map((_,i)=>i===0?'rgba(251,191,36,.5)':'rgba(59,130,246,.5)'),
                    borderColor:    barLabels.map((_,i)=>i===0?'#fbbf24':'#3b82f6'),
                    borderWidth:1, borderRadius:5,
                  }]:[])
                ]
              }}
              options={{
                responsive:true, maintainAspectRatio:false,
                plugins:{
                  legend:{display:!!selCmpDonem, position:'top', labels:{color:'#8496b0', font:{size:10}, boxWidth:12}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${mode==='kpiDeger'?fmtKpi(ctx.parsed.y as number,meta.fmt):ctx.parsed.y+' puan'}`}}
                },
                scales:{
                  y:{min:0, max:barMax, grid:{color:'rgba(255,255,255,.05)'},
                    ticks:{color:'#8496b0', font:{size:9}, callback:(v)=>mode==='kpiDeger'?fmtKpi(Number(v),meta.fmt):String(v)}},
                  x:{grid:{display:false}, ticks:{color:'#8496b0', font:{size:9}, maxRotation:30}}
                }
              }}/>
          </div>
        </div>

        {/* Renk */}
        <div style={{display:'flex', gap:12, marginTop:8, flexWrap:'wrap'}}>
          {(mode==='katSkor'
            ? [{c:'#10b981',bg:'rgba(16,185,129,.2)',l:'≥100 puan'},{c:'#f59e0b',bg:'rgba(245,158,11,.12)',l:'90-100'},{c:'#ef4444',bg:'rgba(239,68,68,.12)',l:'<90'}]
            : [{c:'#10b981',bg:'rgba(16,185,129,.2)',l:'TR üstü'},{c:'#60a5fa',bg:'rgba(59,130,246,.15)',l:'%5-15 üstü'},{c:'#fbbf24',bg:'rgba(245,158,11,.12)',l:'Ortalama'},{c:'#f87171',bg:'rgba(239,68,68,.15)',l:'TR altı'}]
          ).map(x=>(
            <div key={x.l} style={{display:'flex', alignItems:'center', gap:5, fontSize:9, color:'var(--tx3)'}}>
              <div style={{width:12, height:10, borderRadius:3, background:x.bg, border:`1px solid ${x.c}`}}/>
              {x.l}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
