'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from './DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, BOLGELER, SEGMENTLER, YAS_STATS, TOTAL_IO, TOTAL_SERVIS,
  SEGMENT_COLORS, SEGMENT_BG, CAT_COLORS,
  fmtKpi, getKpisFromCube, getN, getMarkaList,
  overallScoreFromKpis, heatColor, isLowerBetter,
  getScore, scoreColor, scoreBg, changePct, SegmentScore
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const KAT_LIST = ['musteri','ticari','operasyonel','bayi','kapsam'] as const
const KAT_LABELS: Record<string,string> = {
  musteri:'Müşteri',ticari:'Ticari',operasyonel:'Operasyonel',bayi:'Bayi Ağı',kapsam:'Kapsam'
}

export default function DashboardPage() {
  const { selSeg, selBolge, selYas, selDonem, selCmpDonem } = useDashboardCtx()

  // Baz dönem skorları — her segment için
  const segScores = useMemo(() =>
    SEGMENTLER.map(s => ({
      seg: s,
      baz: getScore(s, selBolge, selYas, selDonem),
      cmp: selCmpDonem ? getScore(s, selBolge, selYas, selCmpDonem) : null,
    })),
    [selBolge, selYas, selDonem, selCmpDonem])

  // Tüm Türkiye skoru
  const trBaz = useMemo(() => getScore('', selBolge, selYas, selDonem), [selBolge, selYas, selDonem])
  const trCmp = useMemo(() => selCmpDonem ? getScore('', selBolge, selYas, selCmpDonem) : null, [selBolge, selYas, selCmpDonem])

  // Seçili segmente göre filtre
  const visibleSegs = selSeg ? segScores.filter(s=>s.seg===selSeg) : segScores

  // Marka sıralaması — dönem dahil tüm filtreler
  const markalar = useMemo(() => {
    const list = getMarkaList(selBolge, selYas)
    return list
      .filter(m => !selSeg || m.segment===selSeg)
      .map(m => ({ ...m, ov: overallScoreFromKpis(m.kpis, m.segment, selBolge, selYas) }))
      .sort((a,b) => b.ov - a.ov)
  }, [selSeg, selBolge, selYas])

  // Bölge dağılımı
  const bolgeData = useMemo(() =>
    BOLGELER.map(b => ({ bolge:b, n:getN(selSeg, b, selYas, selDonem) })),
    [selSeg, selYas, selDonem])
  const maxBolgeN = Math.max(...bolgeData.map(b=>b.n), 1)

  // Segment bar grafik (skor bazlı)
  const segBarData = visibleSegs.map(s=>s.baz?.genel??0)
  const segCmpData = visibleSegs.map(s=>s.cmp?.genel??0)

  const filterLabel = [
    selBolge||'Tüm TR', selSeg||'Tüm Seg.',
    selYas==='Tümü'?'Tüm Yaş':selYas+'y',
    selDonem||'Tüm Dönem'
  ].join(' · ')

  return (
    <div className={styles.wrap}>
      <Topbar title="SSH KPI Rekabet Skorkartı" subtitle={filterLabel}
        pills={[{label:'● Canlı',variant:'green'},{label:selDonem||'Tüm Dönem',variant:'amber'}]}/>
      <div className={styles.content}>

        {/* ── Üst 4 kutu: Segment Skor Kartları ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
          {/* Tüm Türkiye */}
          <SkorKutu
            label="🇹🇷 Tüm Türkiye"
            baz={trBaz} cmp={trCmp}
            color="#3b82f6" bg="rgba(59,130,246,.12)"
            bazDonem={selDonem||'Tüm Dönem'}
            cmpDonem={selCmpDonem}
          />
          {visibleSegs.slice(0,3).map(s=>(
            <SkorKutu key={s.seg}
              label={s.seg}
              baz={s.baz} cmp={s.cmp}
              color={SEGMENT_COLORS[s.seg]}
              bg={SEGMENT_BG[s.seg].replace('.35',',.15)')}
              bazDonem={selDonem||'Tüm Dönem'}
              cmpDonem={selCmpDonem}
            />
          ))}
        </div>

        {/* ── 2. Satır: Kategori kırılım detayları ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          <KatDetayKutu label="🇹🇷 Tüm Türkiye" score={trBaz} color="#3b82f6"/>
          {visibleSegs.slice(0,3).map(s=>(
            <KatDetayKutu key={s.seg} label={s.seg} score={s.baz} color={SEGMENT_COLORS[s.seg]}/>
          ))}
        </div>

        <div className={styles.twoCol}>
          {/* Segment skor bar grafik */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Segment Skor Karşılaştırması</h3>
              <span className={styles.hint}>
                {selDonem||'Tüm Dönem'}{selCmpDonem?` vs ${selCmpDonem}`:''}
              </span>
            </div>
            <div className={styles.chartWrap}>
              <Bar data={{
                labels: ['Tüm TR', ...visibleSegs.map(s=>s.seg)],
                datasets:[
                  {
                    label: selDonem||'Baz Dönem',
                    data: [trBaz?.genel??0, ...segBarData],
                    backgroundColor: ['rgba(59,130,246,.4)',...visibleSegs.map(s=>SEGMENT_BG[s.seg])],
                    borderColor: ['#3b82f6',...visibleSegs.map(s=>SEGMENT_COLORS[s.seg])],
                    borderWidth:1.5,borderRadius:8
                  },
                  ...(selCmpDonem ? [{
                    label: selCmpDonem,
                    data: [trCmp?.genel??0, ...segCmpData],
                    backgroundColor: ['rgba(59,130,246,.15)',...visibleSegs.map(s=>SEGMENT_BG[s.seg].replace('.35',',.12)'))],
                    borderColor: ['#3b82f688',...visibleSegs.map(s=>SEGMENT_COLORS[s.seg]+'88')],
                    borderWidth:1,borderRadius:8
                  }] : [])
                ]
              }} options={{
                responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:!!selCmpDonem,position:'top',labels:{color:'#8496b0',font:{size:10},boxWidth:10}},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${ctx.parsed.y} puan`}}},
                scales:{
                  y:{min:0,max:105,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8496b0',font:{size:9}}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:11}}}}}}/>
            </div>
          </div>

          {/* Marka sıralaması — tüm filtreler dahil */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>{selBolge||'Tüm TR'} · {selYas==='Tümü'?'Tüm Yaş':selYas+'y'}</span>
            </div>
            <div className={styles.hbarChart}>
              {markalar.slice(0,12).map((m,i)=>{
                const color = m.ov>=70?'#10b981':m.ov>=55?'#3b82f6':m.ov>=40?'#f59e0b':'#ef4444'
                return (
                  <div key={m.marka} className={styles.hbarRow}>
                    <div style={{display:'flex',alignItems:'center',gap:4,minWidth:110}}>
                      <span style={{color:'var(--tx3)',fontSize:9,fontFamily:'var(--font-dm-mono)',width:14}}>{i+1}</span>
                      <span style={{color:SEGMENT_COLORS[m.segment],fontSize:11,fontWeight:600}}>{m.marka}</span>
                    </div>
                    <div className={styles.hbarTrack}>
                      <div className={styles.hbarFill} style={{width:`${m.ov}%`,background:`${color}44`,borderRight:`3px solid ${color}`}}/>
                    </div>
                    <div className={styles.hbarScore} style={{color}}>{m.ov}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bölge Skor Dağılımı */}
        <BolgeSkorGrid selSeg={selSeg} selBolge={selBolge} selYas={selYas} selDonem={selDonem} selCmpDonem={selCmpDonem}/>

      </div>
    </div>
  )
}

// ── Skor Kutusu ──────────────────────────────────────────────
function SkorKutu({ label, baz, cmp, color, bg, bazDonem, cmpDonem }:{
  label:string; baz:SegmentScore|null; cmp:SegmentScore|null
  color:string; bg:string; bazDonem:string; cmpDonem:string
}) {
  const bazG = baz?.genel ?? 0
  const cmpG = cmp?.genel ?? 0
  const chg  = (cmp && cmpG) ? ((bazG - cmpG) / cmpG * 100) : null

  const chgColor = chg===null ? 'var(--tx3)'
    : chg >= 0  ? '#10b981'
    : chg >= -10 ? '#f59e0b'
    : '#f87171'

  return (
    <div style={{background:bg, border:`1px solid ${color}44`, borderRadius:10, padding:'14px 16px', minHeight:110}}>
      {/* Başlık */}
      <div style={{fontSize:11, fontWeight:700, color, marginBottom:10}}>{label}</div>

      {/* Dönem etiketleri + skorlar */}
      <div style={{display:'flex', alignItems:'flex-end', gap:12, marginBottom:10}}>
        {/* Baz dönem */}
        <div>
          <div style={{fontSize:9, color:'var(--tx3)', marginBottom:3, fontWeight:500}}>{bazDonem}</div>
          <div style={{fontSize:32, fontWeight:800, fontFamily:'var(--font-dm-mono)',
            color:scoreColor(bazG), lineHeight:1}}>
            {bazG || '—'}
          </div>
          <div style={{fontSize:9, color:'var(--tx3)', marginTop:2}}>puan</div>
        </div>

        {/* Karşılaştırma dönem */}
        {cmp && (
          <div style={{paddingBottom:4}}>
            <div style={{fontSize:9, color:'var(--tx3)', marginBottom:3, fontWeight:500}}>{cmpDonem}</div>
            <div style={{fontSize:22, fontWeight:700, fontFamily:'var(--font-dm-mono)',
              color:'var(--tx2)', lineHeight:1}}>
              {cmpG}
            </div>
          </div>
        )}

        {/* Değişim */}
        {chg !== null && (
          <div style={{paddingBottom:6, marginLeft:'auto'}}>
            <div style={{fontSize:13, fontWeight:700, color:chgColor}}>
              {chg >= 0 ? '▲ +' : '▼ '}{Math.abs(chg).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{background:'rgba(0,0,0,.12)', borderRadius:6, height:4, overflow:'hidden'}}>
        <div style={{width:`${Math.min(bazG, 100)}%`, height:4, borderRadius:6,
          background:scoreColor(bazG), transition:'width .4s'}}/>
      </div>
    </div>
  )
}

// ── Kategori Detay Kutusu ─────────────────────────────────────
function KatDetayKutu({ label, score, color }:{
  label:string; score:SegmentScore|null; color:string
}) {
  if (!score) return (
    <div style={{background:'var(--surf2)',border:'1px solid var(--bd)',borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:11,fontWeight:700,color,marginBottom:8}}>{label}</div>
      <div style={{fontSize:10,color:'var(--tx3)'}}>Veri yok</div>
    </div>
  )

  const cats = [
    {key:'musteri',   label:'Müşteri'},
    {key:'ticari',    label:'Ticari'},
    {key:'operasyonel',label:'Operasyonel'},
    {key:'bayi',      label:'Bayi Ağı'},
    {key:'kapsam',    label:'Kapsam'},
  ]

  return (
    <div style={{background:'var(--surf2)',border:`1px solid ${color}22`,borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:10,fontWeight:700,color,marginBottom:10}}>{label} — Kategori Kırılımı</div>
      {cats.map(c=>{
        const val = score[c.key as keyof SegmentScore] as number
        return (
          <div key={c.key} style={{marginBottom:7}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
              <span style={{fontSize:9,color:'var(--tx3)'}}>{c.label}</span>
              <span style={{fontSize:10,fontWeight:700,fontFamily:'var(--font-dm-mono)',
                color:scoreColor(val)}}>{val}</span>
            </div>
            <div style={{background:'var(--surf3)',borderRadius:4,height:4,overflow:'hidden'}}>
              <div style={{width:`${Math.min(val,100)}%`,height:4,borderRadius:4,
                background:scoreColor(val),transition:'width .3s'}}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Bölge Skor Grid ──────────────────────────────────────────
function BolgeSkorGrid({ selSeg, selBolge, selYas, selDonem, selCmpDonem }:{
  selSeg:string; selBolge:string; selYas:string; selDonem:string; selCmpDonem:string
}) {
  const bolgeList = BOLGELER.filter(b => !selBolge || b===selBolge)

  return (
    <div className={styles.card}>
      <div className={styles.cardHd}>
        <h3>Bölge Skor Dağılımı</h3>
        <span className={styles.hint}>
          {selSeg||'Tüm Seg.'} · {selYas==='Tümü'?'Tüm Yaş':selYas+'y'} ·{' '}
          {selDonem||'Tüm Dönem'}{selCmpDonem?` vs ${selCmpDonem}`:''}
        </span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
        {bolgeList.map(b=>{
          const baz = getScore(selSeg, b, selYas, selDonem)
          const cmp = selCmpDonem ? getScore(selSeg, b, selYas, selCmpDonem) : null
          const bazG = baz?.genel ?? 0
          const cmpG = cmp?.genel ?? 0
          const chg  = cmp && cmpG ? ((bazG-cmpG)/cmpG*100) : null
          const isActive = selBolge===b

          return (
            <div key={b} style={{
              textAlign:'center', padding:'12px 8px',
              background: isActive ? scoreBg(bazG) : 'var(--surf2)',
              borderRadius:8,
              border:`1px solid ${isActive ? scoreColor(bazG) : 'var(--bd)'}`,
            }}>
              <div style={{fontSize:8,fontWeight:700,color:'var(--tx3)',marginBottom:6,
                textTransform:'uppercase',letterSpacing:'.04em',lineHeight:1.4}}>
                {b}
              </div>

              {/* Skor bar */}
              <div style={{height:36,display:'flex',alignItems:'flex-end',justifyContent:'center',gap:3,marginBottom:5}}>
                {/* Baz dönem */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  <div style={{width:14,borderRadius:'3px 3px 0 0',
                    background: scoreColor(bazG)+'88',
                    borderTop:`2px solid ${scoreColor(bazG)}`,
                    height:`${Math.max(bazG,4)}%`,minHeight:4}}/>
                </div>
                {/* Karşılaştırma dönem */}
                {cmp && (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                    <div style={{width:14,borderRadius:'3px 3px 0 0',
                      background:'rgba(148,163,184,.3)',
                      borderTop:'2px solid #94a3b8',
                      height:`${Math.max(cmpG,4)}%`,minHeight:4}}/>
                  </div>
                )}
              </div>

              {/* Baz skor */}
              <div style={{fontSize:16,fontWeight:800,fontFamily:'var(--font-dm-mono)',
                color:scoreColor(bazG),lineHeight:1}}>
                {bazG || '—'}
              </div>
              {cmp && (
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:1}}>{cmpG}</div>
              )}

              {/* Değişim */}
              {chg !== null && (
                <div style={{
                  fontSize:9,fontWeight:700,marginTop:4,
                  color: chg>=0?'#10b981':chg>=-10?'#f59e0b':'#f87171'
                }}>
                  {chg>=0?'▲ +':'▼ '}{chg.toFixed(1)}%
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:12,marginTop:10,paddingTop:8,borderTop:'1px solid var(--bd)',flexWrap:'wrap'}}>
        {[
          {c:'#10b981',label:'≥100 puan'},
          {c:'#f59e0b',label:'90–100 puan'},
          {c:'#f87171',label:'<90 puan'},
        ].map(x=>(
          <div key={x.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
            <div style={{width:10,height:10,borderRadius:2,background:x.c+'33',border:`1px solid ${x.c}`}}/>
            {x.label}
          </div>
        ))}
        {selCmpDonem && (
          <>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
              <div style={{width:10,height:10,borderRadius:2,background:'rgba(148,163,184,.3)',border:'1px solid #94a3b8'}}/>
              {selCmpDonem} (karş.)
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx3)'}}>
              <span style={{color:'#10b981'}}>▲ ≥0%</span> /
              <span style={{color:'#f59e0b'}}> ▼ 0–10%</span> /
              <span style={{color:'#f87171'}}> ▼ &gt;10%</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
