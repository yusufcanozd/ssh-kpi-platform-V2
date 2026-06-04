'use client'

import { useState, useMemo } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import ReportSectionHeader from '@/components/report/ReportSectionHeader'
import { buildReportCategories } from '@/components/report/ReportShared'
import ReportCoverPage from '@/components/report/ReportCoverPage'
import ReportBrandPage from '@/components/report/ReportBrandPage'
import ReportKpiDetailPage from '@/components/report/ReportKpiDetailPage'
import ReportRegionPage from '@/components/report/ReportRegionPage'
import ReportTrendPage from '@/components/report/ReportTrendPage'
import ReportComparisonPage from '@/components/report/ReportComparisonPage'
import ReportHighlightsPage from '@/components/report/ReportHighlightsPage'
import {
  KPI_META, SEGMENTLER, SEGMENT_HEX, SEGMENT_BG,
  BOLGELER, YAS_GRUPLARI, DONEMLER, CATEGORY_OPTIONS,
  fmtKpi, fmtSkor0, scoreColor, scoreBarWidth, getMarkaRanking, applyBrandPrivacyRule, createRuntimeCalculator,
  isLowerBetter, heatColor,
} from '@/lib/kpi'
import styles from './page.module.css'

const Q_LIST  = DONEMLER.filter(d => d.includes('-Q')).sort()
const FY_LIST = DONEMLER.filter(d => d.includes('-FY')).sort()
const TUM_YILLAR = Array.from(new Set(DONEMLER.map(d => parseInt(d.split('-')[0])))).sort()

type DonemPeriyot = 'Q' | 'FY'
interface DonemSec { yil: number; periyot: DonemPeriyot; alt: string }

function toStr(s: DonemSec): string {
  return s.periyot === 'FY' ? s.yil + '-FY' : s.yil + '-Q' + s.alt
}
function getAltlar(p: DonemPeriyot): string[] {
  return p === 'FY' ? ['FY'] : ['1','2','3','4']
}

async function callAI(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.text || ''
  } catch { return '' }
}

function DonemSec2({ label, value, onChange }: {
  label: string
  value: DonemSec
  onChange: (v: DonemSec) => void
}) {
  const altlar = getAltlar(value.periyot)
  const altSec = altlar.includes(value.alt) ? value.alt : altlar[0]
  return (
    <div>
      {label && <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</div>}
      <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
        <select value={value.yil} onChange={e => onChange({ ...value, yil: parseInt(e.target.value) })}
          style={{ padding:'3px 7px', borderRadius:5, fontSize:9, fontWeight:600, background:'var(--surf)', border:'1px solid var(--bd)', color:'var(--tx2)', cursor:'pointer' }}>
          {TUM_YILLAR.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display:'flex', gap:2 }}>
          {(['Q','FY'] as DonemPeriyot[]).map(p => {
            const dis = p === 'Q' ? Q_LIST.length === 0 : FY_LIST.length === 0
            return (
              <button key={p} disabled={dis}
                onClick={() => onChange({ ...value, periyot:p, alt:p==='FY'?'FY':'1' })}
                style={{ padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:600, cursor:dis?'not-allowed':'pointer',
                  border:'1px solid ' + (value.periyot===p?'var(--blue)':'var(--bd)'),
                  background:value.periyot===p?'rgba(59,130,246,.12)':'var(--surf)',
                  color:dis?'var(--tx3)':value.periyot===p?'var(--blue)':'var(--tx2)', opacity:dis?0.5:1 }}>
                {p === 'Q' ? 'Çeyreklik' : 'Yıllık'}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:2 }}>
          {altlar.map(a => (
            <button key={a} onClick={() => onChange({ ...value, alt:a })}
              style={{ padding:'2px 6px', borderRadius:3, fontSize:9, cursor:'pointer',
                border:'1px solid ' + (altSec===a?'var(--blue)':'var(--bd)'),
                background:altSec===a?'rgba(59,130,246,.15)':'var(--surf3)',
                color:altSec===a?'var(--blue)':'var(--tx3)', fontWeight:altSec===a?700:400 }}>
              {value.periyot === 'Q' ? 'Q' + a : 'FY'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OzetRaporPage() {
  const { selBolge, selYas, runtimeData, categoryColorOverrides } = useDashboardCtx()
  const runtimeCalc = useMemo(() => createRuntimeCalculator(runtimeData), [runtimeData])
  const KATS = useMemo(() => buildReportCategories(categoryColorOverrides), [categoryColorOverrides])

  // Marka sıralaması: aktif import varsa dinamik markaRows, yoksa statik; her iki halde de gizlilik maskelemesi uygulanır.
  function rankMarka(seg: string, bolge: string, yas: string, donem: string) {
    const dyn = runtimeData?.markaRows
    if (dyn && dyn.length > 0) {
      const raw = dyn
        .filter(r => (!seg || r[1] === seg) && r[2] === bolge && r[3] === yas && r[4] === donem)
        .map(r => ({ marka: r[0], segment: r[1], score: r[5] ?? 0 }))
        .sort((a, b) => b.score - a.score || a.marka.localeCompare(b.marka, 'tr'))
      return applyBrandPrivacyRule(raw)
    }
    return getMarkaRanking(seg, bolge, yas, donem)
  }

  const sonYil = TUM_YILLAR[TUM_YILLAR.length - 1] || 2024

  const [baz, setBaz] = useState<DonemSec>({ yil: sonYil, periyot:'Q', alt:'4' })
  const [cmp, setCmp] = useState<DonemSec>({ yil: sonYil - 1, periyot:'Q', alt:'4' })
  const [cmpAktif, setCmpAktif] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rapor, setRapor] = useState<any>(null)
  const [yorumlar, setYorumlar] = useState<Record<string,string>>({})

  const bazStr = toStr(baz)
  const cmpStr = cmpAktif ? toStr(cmp) : null

  function handleBazChange(v: DonemSec) {
    if (v.periyot !== baz.periyot) {
      setCmp({ ...cmp, periyot: v.periyot, alt: v.periyot === 'FY' ? 'FY' : '4' })
    }
    setBaz(v)
  }

  async function handleOlustur() {
    setGenerating(true)
    setProgress(10)

    const trKpis     = runtimeCalc.getKpisFromCube('', selBolge, selYas, bazStr)
    const trKpisCmp  = cmpStr ? runtimeCalc.getKpisFromCube('', selBolge, selYas, cmpStr) : null
    const trScore    = runtimeCalc.getScore('', selBolge, selYas, bazStr)
    const trScoreCmp = cmpStr ? runtimeCalc.getScore('', selBolge, selYas, cmpStr) : null

    const segData = SEGMENTLER.map(seg => ({
      seg,
      kpis: runtimeCalc.getKpisFromCube(seg, selBolge, selYas, bazStr),
      kpisCmp: cmpStr ? runtimeCalc.getKpisFromCube(seg, selBolge, selYas, cmpStr) : null,
      score: runtimeCalc.getScore(seg, selBolge, selYas, bazStr),
      scoreCmp: cmpStr ? runtimeCalc.getScore(seg, selBolge, selYas, cmpStr) : null,
      markalar: rankMarka(seg, selBolge, selYas, bazStr).slice(0, 5),
    }))

    const bolgeData = BOLGELER.slice(0, 8).map(b => ({
      bolge: b,
      score: runtimeCalc.getRegionalScore('', b, selYas, bazStr),
      scoreCmp: cmpStr ? runtimeCalc.getRegionalScore('', b, selYas, cmpStr) : null,
    }))

    const yasData = YAS_GRUPLARI.filter(y => y !== 'Tümü').map(y => ({
      yas: y,
      score: runtimeCalc.getScore('', selBolge, y, bazStr),
      kpis: runtimeCalc.getKpisFromCube('', selBolge, y, bazStr),
    }))

    const katData = KATS.map(k => ({
      ...k,
      trVal: trScore ? (trScore as any)[k.key] ?? 0 : 0,
      cmpVal: trScoreCmp ? (trScoreCmp as any)[k.key] ?? 0 : null,
    }))

    const kayiplar = KPI_META.map((k, i) => {
      if (!cmpStr) return null
      const curr = trKpis[i] ?? 0
      const prev = trKpisCmp?.[i] ?? 0
      if (!prev || !curr) return null
      const pct = ((curr - prev) / Math.abs(prev)) * 100
      const kotu = isLowerBetter(i) ? pct > 3 : pct < -3
      if (!kotu) return null
      return { ...k, i, curr, prev, pct: Math.round(pct * 10) / 10 }
    }).filter(Boolean)

    const tumMarkalar = SEGMENTLER.flatMap(seg =>
      rankMarka(seg, selBolge, selYas, bazStr).map(m => ({
        ...m,
        cmpScore: cmpStr ? (rankMarka(seg, selBolge, selYas, cmpStr).find(x => x.marka === m.marka)?.score ?? null) : null,
      }))
    ).sort((a, b) => b.score - a.score)

    const trendDonemler = Q_LIST.slice(-6)

    setRapor({ trKpis, trKpisCmp, trScore, trScoreCmp, segData, bolgeData, yasData, katData, kayiplar, tumMarkalar, trendDonemler })
    setProgress(30)

    const trG = trScore?.genel ?? 0
    const trGCmp = trScoreCmp?.genel ?? 0
    const delta = cmpStr ? trG - trGCmp : null

    const p1 = 'Turkiye SSH sektoru ' + bazStr + ' donemi skor: ' + trG +
      (delta !== null ? ', onceki doneme gore ' + (delta >= 0 ? '+' : '') + delta + ' puan.' : '.') +
      ' Segmentler: ' + segData.map(s => s.seg + ':' + (s.score?.genel ?? 0)).join(', ') +
      '. 3-4 cumle editorial yorum yap.'

    const p2 = 'SSH marka siralamasi ' + bazStr + ': ' +
      tumMarkalar.slice(0, 6).map((m, i) => (i+1) + '.' + m.marka + '(' + m.segment + ') ' + m.score + 'p').join('; ') +
      '. Marka dinamiklerini yorumla.'

    const p3 = 'KPI analizi ' + bazStr + ': ' +
      KPI_META.slice(0, 6).map((k, i) => k.ad + ':' + fmtKpi(trKpis[i], k.fmt)).join('; ') +
      '. KPI performansini yorumla.'

    const p4 = 'Bolgesel SSH skorlari ' + bazStr + ': ' +
      bolgeData.slice(0, 5).map(b => (b.bolge || 'TR') + ':' + (b.score?.genel ?? 0)).join(', ') +
      '. Bolgesel farkliliklari yorumla.'

    const p5 = 'Son donem SSH trend: ' +
      trendDonemler.map(dt => { const sc = runtimeCalc.getScore('', selBolge, selYas, dt); return dt + ':' + (sc?.genel ?? 0) }).join(', ') +
      '. Donemesel trendi yorumla.'

    const p6 = cmpStr ? (bazStr + ' vs ' + cmpStr + ': Skor ' + trGCmp + '->' + trG +
      ', delta: ' + (delta !== null ? (delta >= 0 ? '+' : '') + delta : '0') + ' puan.' +
      ' Kategoriler: ' + katData.map(k => k.label + ':' + k.cmpVal + '->' + k.trVal).join(', ') +
      '. Kapsamli donem karsılastirmasi yap.') : ''

    const enGuclu = [...katData].sort((a, b) => b.trVal - a.trVal)[0]
    const enZayif = [...katData].sort((a, b) => a.trVal - b.trVal)[0]
    const p7 = 'SSH stratejik degerlendirme ' + bazStr + ': Skor ' + trG +
      ', en guclu ' + (enGuclu?.label || '') + '(' + (enGuclu?.trVal || 0) + ')' +
      ', en zayif ' + (enZayif?.label || '') + '(' + (enZayif?.trVal || 0) + ')' +
      (kayiplar.length > 0 ? ', ' + kayiplar.length + ' KPI geriledi' : '') +
      '. 3 stratejik oneri ver.'

    const prompts = [
      ['genelBakis', p1], ['marka', p2], ['kpiDetay', p3],
      ['bolge', p4], ['trend', p5], ['karsilastirma', p6], ['strateji', p7],
    ].filter(([, v]) => v)

    const yeni: Record<string,string> = {}
    for (let i = 0; i < prompts.length; i++) {
      yeni[prompts[i][0]] = await callAI(prompts[i][1])
      setProgress(30 + Math.round((i + 1) / prompts.length * 65))
    }
    setYorumlar(yeni)
    setProgress(100)
    setGenerating(false)
  }

  const d = rapor

  return (
    <div className={styles.wrap}>
      <Topbar title="Özet Rapor" subtitle="Türkiye Otomotiv Sektörü SSH Rekabet Analizi" />
      <div className={styles.content}>

        <div style={{ background:'var(--surf2)', border:'1px solid var(--bd)', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:24, alignItems:'start' }}>

            {/* Baz Dönem */}
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Baz Dönem</div>
              <DonemSec2 label="" value={baz} onChange={handleBazChange} />
            </div>

            {/* Karşılaştırma Dönemi */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, height:20 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Karşılaştırma Dönemi</div>
                <button onClick={() => setCmpAktif(v => !v)}
                  style={{ padding:'2px 8px', borderRadius:10, fontSize:8, fontWeight:600, cursor:'pointer',
                    border:'1px solid ' + (cmpAktif ? 'var(--blue)' : 'var(--bd)'),
                    background:cmpAktif ? 'rgba(59,130,246,.1)' : 'var(--surf)',
                    color:cmpAktif ? 'var(--blue)' : 'var(--tx3)' }}>
                  {cmpAktif ? '✓ Aktif' : 'Ekle'}
                </button>
              </div>
              {cmpAktif && <DonemSec2 label="" value={cmp} onChange={setCmp} />}
            </div>

            {/* Butonlar */}
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', paddingBottom:2 }}>
              {d && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <button onClick={() => {
                    const prev = document.title
                    document.title = 'SSH Platform _ Türkiye Otomotiv Sektörü SSH Raporu'
                    setTimeout(() => {
                      window.print()
                      setTimeout(() => { document.title = prev }, 1000)
                    }, 100)
                  }}
                    style={{ padding:'8px 16px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid var(--bd)', background:'var(--surf)', color:'var(--tx2)' }}>
                    🖨 PDF
                  </button>
                  <div style={{ fontSize:8, color:'var(--tx3)', textAlign:'right', maxWidth:160, lineHeight:1.4 }}>
                    Print dialog&apos;da &quot;Üstbilgi ve altbilgi&quot; seçeneğini kapatın
                  </div>
                </div>
              )}
              <button onClick={handleOlustur} disabled={generating}
                style={{ padding:'8px 22px', borderRadius:8, fontSize:11, fontWeight:700,
                  cursor:generating ? 'wait' : 'pointer', border:'none',
                  background:generating ? '#6b9fc4' : 'var(--blue)', color:'#fff' }}>
                {generating ? ('Oluşturuluyor ' + progress + '%') : '✦ Rapor Oluştur'}
              </button>
            </div>
          </div>
          {generating && (
            <div style={{ marginTop:12 }}>
              <div style={{ width:'100%', background:'var(--surf3)', borderRadius:20, height:5, overflow:'hidden' }}>
                <div style={{ width:progress + '%', height:'100%', background:'var(--blue)', borderRadius:20, transition:'width .4s' }} />
              </div>
            </div>
          )}
        </div>

        {!d && !generating && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--tx3)' }}>
            <div style={{ fontSize:42, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Dönem seçin ve raporu oluşturun</div>
            <div style={{ fontSize:11 }}>AI destekli 360° SSH rekabet analizi</div>
          </div>
        )}

        {d && !generating && (
          <div id="rapor-print-wrapper">
          <div id="rapor-icerik">

            <ReportCoverPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />

            <ReportBrandPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />

            <ReportKpiDetailPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />

            <ReportRegionPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />

            <ReportTrendPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />

            {cmpStr && (
              <ReportComparisonPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />
            )}

            <ReportHighlightsPage kats={KATS} d={d} yorumlar={yorumlar} bazStr={bazStr} cmpStr={cmpStr} runtimeCalc={runtimeCalc} selBolge={selBolge} selYas={selYas} />

          </div>
          </div>
        )}
      </div>

      <style>{`
        .rapor-sayfa {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 32px;
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm 12mm;
          }

          /* Sadece rapor görünür */
          body * { visibility: hidden !important; }
          #rapor-print-wrapper,
          #rapor-print-wrapper * { visibility: visible !important; }
          #rapor-print-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }

          /* Sayfa kırılımı */
          .rapor-sayfa {
            page-break-after: always;
            break-after: page;
            margin-bottom: 0 !important;
            /* Boşlukları önle — min-height kaldırıldı */
          }
          .rapor-sayfa:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .rapor-sayfa > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Renkleri koru */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
