'use client'

import { useState } from 'react'
import { CATEGORY_OPTIONS } from '@/lib/kpi'
import { resetUserCategoryColor, saveUserCategoryColor } from '@/lib/kpi/category-colors'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'

export default function CategoryColorSettings() {
  const { categoryColors, refreshCategoryColors } = useDashboardCtx()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleColor(key: string, color: string) {
    setBusyKey(key)
    setError('')
    try {
      await saveUserCategoryColor(key, color)
      refreshCategoryColors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Renk kaydedilemedi.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleReset(key: string) {
    setBusyKey(key)
    setError('')
    try {
      await resetUserCategoryColor(key)
      refreshCategoryColors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sıfırlanamadı.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <details style={{ background: 'var(--surf)', border: '1px solid var(--bd)', borderRadius: 8, padding: '6px 12px', marginBottom: 10 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--tx2)', userSelect: 'none' }}>
        Kişisel Kategori Renkleri
      </summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 10 }}>
        {CATEGORY_OPTIONS.map(category => {
          const current = categoryColors[category.key] ?? category.color
          const isBusy = busyKey === category.key
          return (
            <div key={category.key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surf2)', border: '1px solid var(--bd)', borderRadius: 6, padding: '4px 8px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: current }} />
              <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{category.label}</span>
              <input
                type="color"
                value={current}
                disabled={isBusy}
                onChange={event => handleColor(category.key, event.target.value)}
                style={{ width: 26, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              />
              <button
                type="button"
                onClick={() => handleReset(category.key)}
                disabled={isBusy}
                style={{ fontSize: 9, color: 'var(--tx3)', background: 'transparent', border: '1px solid var(--bd)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
              >
                Sıfırla
              </button>
            </div>
          )
        })}
      </div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', paddingTop: 6 }}>{error}</div>}
    </details>
  )
}
