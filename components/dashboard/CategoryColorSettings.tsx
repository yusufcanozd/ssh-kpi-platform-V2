'use client'

import { CATEGORY_OPTIONS } from '@/lib/kpi'
import { DEFAULT_CATEGORY_COLORS, resolveCategoryColor, type CategoryColorOverrides } from '@/lib/kpi/category-colors'

export default function CategoryColorSettings({
  overrides,
  loading,
  error,
  onChange,
  onReset,
}: {
  overrides: CategoryColorOverrides
  loading: boolean
  error: string
  onChange: (categoryKey: string, color: string) => void
  onReset: (categoryKey: string) => void
}) {
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bd2)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>
        Kategori renkleri
      </div>
      {loading && <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 6 }}>Renkler yükleniyor…</div>}
      {error && <div style={{ fontSize: 9, color: '#f59e0b', marginBottom: 6 }}>{error}</div>}
      <div style={{ display: 'grid', gap: 5 }}>
        {CATEGORY_OPTIONS.map(category => {
          const current = resolveCategoryColor(category.key, overrides)
          const isCustom = Boolean(overrides[category.key])
          return (
            <div key={category.key} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 6, alignItems: 'center', fontSize: 9, color: 'var(--tx2)' }}>
              <input
                aria-label={`${category.shortLabel} renk seçimi`}
                type="color"
                value={current}
                onChange={event => onChange(category.key, event.target.value)}
                style={{ width: 20, height: 20, padding: 0, border: '0', background: 'transparent', cursor: 'pointer' }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.shortLabel}</span>
              <button
                type="button"
                onClick={() => onReset(category.key)}
                disabled={!isCustom}
                style={{ border: '1px solid var(--bd2)', background: isCustom ? 'var(--surf2)' : 'transparent', color: isCustom ? 'var(--tx2)' : 'var(--tx3)', borderRadius: 5, fontSize: 8, padding: '2px 5px', cursor: isCustom ? 'pointer' : 'default', opacity: isCustom ? 1 : 0.5 }}
                title={`Varsayılan: ${DEFAULT_CATEGORY_COLORS[category.key]}`}
              >
                Sıfırla
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
