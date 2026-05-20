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

        {/* Bölge dağılımı */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge İş Emri Dağılımı</h3>
            <span className={styles.hint}>{selSeg||'Tüm Seg.'} · {selYas==='Tümü'?'Tüm Yaş':selYas+'y'} · {selDonem||'Tüm Dönem'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
            {bolgeData.map(b=>{
              const pct=(b.n/maxBolgeN*100).toFixed(0)
              return (
                <div key={b.bolge} style={{textAlign:'center',padding:'10px 6px',
                  background:selBolge===b.bolge?'rgba(59,130,246,.08)':'var(--surf2)',
                  borderRadius:8,border:`1px solid ${selBolge===b.bolge?'var(--blue)':'var(--bd)'}`}}>
                  <div style={{fontSize:8,fontWeight:700,color:'var(--tx3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em',lineHeight:1.3}}>{b.bolge}</div>
                  <div style={{height:36,display:'flex',alignItems:'flex-end',justifyContent:'center',marginBottom:3}}>
                    <div style={{width:18,borderRadius:'2px 2px 0 0',background:'rgba(59,130,246,.5)',borderTop:'2px solid #3b82f6',height:`${pct}%`,minHeight:4}}/>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:'var(--font-dm-mono)'}}>
                    {b.n.toLocaleString('tr-TR')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
  const chg  = cmp ? parseFloat(changePct(bazG, cmpG)) : null

  return (
    <div style={{background:bg,border:`1px solid ${color}44`,borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:11,fontWeight:700,color,marginBottom:8}}>{label}</div>

      <div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:8}}>
        <div>
          <div style={{fontSize:8,color:'var(--tx3)',marginBottom:2}}>{bazDonem}</div>
          <div style={{fontSize:28,fontWeight:800,fontFamily:'var(--font-dm-mono)',
            color:scoreColor(bazG),lineHeight:1}}>
            {bazG}
          </div>
          <div style={{fontSize:8,color:'var(--tx3)'}}>puan</div>
        </div>
        {cmp && (
          <div style={{flex:1}}>
            <div style={{fontSize:8,color:'var(--tx3)',marginBottom:2}}>{cmpDonem}</div>
            <div style={{fontSize:18,fontWeight:700,fontFamily:'var(--font-dm-mono)',color:'var(--tx2)'}}>{cmpG}</div>
            <div style={{fontSize:9,fontWeight:700,marginTop:4,
              color:chg!==null?chg>=0?'#10b981':'#f87171':'var(--tx3)'}}>
              {chg!==null?(chg>=0?'▲ +':'▼ ')+chg+'%':'—'}
            </div>
          </div>
        )}
      </div>

      {/* Mini progress */}
      <div style={{background:'var(--surf3)',borderRadius:6,height:4,overflow:'hidden'}}>
        <div style={{width:`${Math.min(bazG,100)}%`,height:4,borderRadius:6,
          background:scoreColor(bazG),transition:'width .4s'}}/>
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
