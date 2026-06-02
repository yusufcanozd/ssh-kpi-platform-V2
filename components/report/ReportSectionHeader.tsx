interface ReportSectionHeaderProps {
  icon: string
  title: string
}

export default function ReportSectionHeader({ icon, title }: ReportSectionHeaderProps) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--bd)' }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:800, color:'var(--tx)' }}>{title}</span>
    </div>
  )
}
