// lib/kpi/chart-labels.ts
// Prompt 11 — Paylaşılan, çakışma-önleyici bar değer etiketi eklentisi.
// Renk: scoreColor (C-level referans paleti; 100 = referans). Önceki dönem nötr gri.

import type { Chart } from 'chart.js'
import { scoreColor } from './format'

interface BarLike { x: number; y: number }

export const smartBarValueLabels = {
  id: 'smartBarValueLabels',
  afterDatasetsDraw(chart: Chart) {
    const ctx = chart.ctx
    const barCount = chart.data.labels ? chart.data.labels.length : 0
    if (barCount === 0) return

    // Bar sayısına göre yazı boyu (çok barda küçülür).
    const fontSize = barCount <= 10 ? 11 : barCount <= 20 ? 10 : barCount <= 35 ? 8 : 7
    // Çakışma eşiği: iki etiket arası minimum yatay mesafe.
    const minGap = fontSize * 1.9

    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      const isPrev = di > 0 // ikinci dataset = önceki dönem (karşılaştırma)

      ctx.save()
      ctx.font = 'bold ' + String(fontSize) + 'px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'

      let lastX = -Infinity
      meta.data.forEach((element, idx) => {
        const bar = element as unknown as BarLike
        const raw = dataset.data[idx] as number | null | undefined
        if (raw == null || Number.isNaN(raw)) return
        // Çakışma önleme: önceki çizilen etikete çok yakınsa atla.
        if (Math.abs(bar.x - lastX) < minGap) return
        lastX = bar.x

        const rounded = Math.round(raw)
        ctx.fillStyle = isPrev ? 'rgba(100,116,139,.8)' : scoreColor(rounded)
        ctx.fillText(String(rounded), bar.x, bar.y - 3)
      })

      ctx.restore()
    })
  },
}
