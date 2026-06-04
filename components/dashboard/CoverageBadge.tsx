'use client'

export default function CoverageBadge({ ratio, available, total }: { ratio: number; available: number; total: number }) {
  const pct = Math.round(ratio * 100)
  const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: `1px solid ${color}55`,
        background: `${color}14`,
        color,
        borderRadius: 999,
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      Coverage %{pct} ({available}/{total} KPI)
    </span>
  )
}
