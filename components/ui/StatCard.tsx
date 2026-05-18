import styles from './StatCard.module.css'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
}

export default function StatCard({ label, value, sub, accent = 'blue' }: StatCardProps) {
  return (
    <div className={clsx(styles.card, styles[accent])}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
