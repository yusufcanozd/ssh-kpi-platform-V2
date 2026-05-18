'use client'

import { useRouter } from 'next/navigation'
import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
  subtitle?: string
  pills?: Array<{ label: string; variant: 'green' | 'amber' | 'blue' }>
  actions?: React.ReactNode
  showBack?: boolean
}

export default function Topbar({ title, subtitle, pills, actions, showBack }: TopbarProps) {
  const router = useRouter()

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {showBack && (
          <button
            className={styles.backBtn}
            onClick={() => router.back()}
            title="Geri dön"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      <div className={styles.right}>
        {pills?.map((p, i) => (
          <span key={i} className={`${styles.pill} ${styles[`pill-${p.variant}`]}`}>
            {p.label}
          </span>
        ))}
        {actions}
      </div>
    </header>
  )
}
