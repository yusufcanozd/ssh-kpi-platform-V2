import Topbar from '@/components/layout/Topbar'
import DataImportWizard from '@/components/admin/DataImportWizard'
import { BOLGELER, DONEMLER, KPI_META, SEGMENTLER } from '@/lib/kpi'

export default function DataImportAdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar
        title="Data Import"
        subtitle="CSV/JSON/XLSX preview, validation, batch kaydı ve aktif batch seçimi"
        pills={[{ label: 'Prompt 6-A · XLSX', variant: 'green' }]}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px 36px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <DataImportWizard
            context={{
              knownSegments: SEGMENTLER,
              knownRegions: BOLGELER,
              knownPeriods: DONEMLER,
              kpiNumbers: KPI_META.map(kpi => kpi.no),
            }}
          />
        </div>
      </div>
    </div>
  )
}
