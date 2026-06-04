import { createClient } from '@/lib/supabase/client'

export type ModuleHealthStatus = 'checking' | 'active' | 'inactive' | 'error'
export type ModuleHealthTone = 'blue' | 'green' | 'amber' | 'red'

type TableHealthCheck = {
  type: 'table'
  table: string
  label: string
  requireRows?: boolean
}

type RouteHealthCheck = {
  type: 'route'
  href: string
  label: string
}

export type ModuleHealthCheck = TableHealthCheck | RouteHealthCheck

export type AdminModuleDefinition = {
  href: string
  title: string
  desc: string
  checks: ModuleHealthCheck[]
}

export type ModuleHealthResult = {
  status: ModuleHealthStatus
  label: string
  tone: ModuleHealthTone
  detail: string
}

const CHECK_TIMEOUT_MS = 2500

export const ADMIN_MODULES: AdminModuleDefinition[] = [
  {
    href: '/admin/kpi-settings',
    title: 'KPI Ayarları',
    desc: 'KPI tanımları, yönleri, coverage ve kategori bağlantıları.',
    checks: [
      { type: 'route', href: '/admin/kpi-settings', label: 'Route' },
      { type: 'table', table: 'kpi_definitions', label: 'KPI tanımları', requireRows: true },
      { type: 'table', table: 'kpi_categories', label: 'Kategori tanımları', requireRows: true },
    ],
  },
  {
    href: '/admin/categories',
    title: 'Kategoriler',
    desc: 'Kategori adı, kısa ad, renk, sıralama ve aktif/pasif yönetimi.',
    checks: [
      { type: 'route', href: '/admin/categories', label: 'Route' },
      { type: 'table', table: 'kpi_categories', label: 'Kategori tablosu', requireRows: true },
    ],
  },
  {
    href: '/admin/weights',
    title: 'Kategori Ağırlıkları',
    desc: 'Kategori ağırlıkları ve metodoloji versiyonlama hazırlığı.',
    checks: [
      { type: 'route', href: '/admin/weights', label: 'Route' },
      { type: 'table', table: 'kpi_methodology_versions', label: 'Metodoloji versiyonları', requireRows: false },
      { type: 'table', table: 'kpi_category_weights', label: 'Ağırlık tablosu', requireRows: false },
    ],
  },
  {
    href: '/admin/brands',
    title: 'Markalar',
    desc: 'Marka listesi, segment dağılımı ve gizlilik kuralı görünümü.',
    checks: [
      { type: 'route', href: '/admin/brands', label: 'Route' },
      { type: 'table', table: 'brands', label: 'Marka tablosu', requireRows: true },
    ],
  },
  {
    href: '/admin/data-import',
    title: 'Data Import',
    desc: 'Excel/CSV import akışı, kolon eşleştirme ve validasyon planı.',
    checks: [
      { type: 'route', href: '/admin/data-import', label: 'Route' },
      { type: 'table', table: 'data_import_batches', label: 'Import batch tablosu', requireRows: false },
      { type: 'table', table: 'kpi_fact_rows', label: 'KPI fact tablosu', requireRows: false },
    ],
  },
  {
    href: '/admin/user-permissions',
    title: 'Kullanıcı Kısıtları',
    desc: 'Kullanıcı listesi, rol/aktiflik ve segment, marka, bölge bazlı görünürlük yönetimi.',
    checks: [
      { type: 'route', href: '/admin/user-permissions', label: 'Route' },
      { type: 'table', table: 'profiles', label: 'Kullanıcı profilleri', requireRows: true },
      { type: 'table', table: 'user_data_permissions', label: 'Kısıt tablosu', requireRows: false },
    ],
  },
  {
    href: '/admin/theme',
    title: 'Tema / Görsel Ayarlar',
    desc: 'Executive renk sistemi, grafik standardı ve rapor görsel dili.',
    checks: [{ type: 'route', href: '/admin/theme', label: 'Route' }],
  },
]

export function getInitialModuleHealth(): Record<string, ModuleHealthResult> {
  return ADMIN_MODULES.reduce<Record<string, ModuleHealthResult>>((acc, module) => {
    acc[module.href] = {
      status: 'checking',
      label: 'Kontrol ediliyor',
      tone: 'blue',
      detail: 'Modül sağlık kontrolü çalışıyor.',
    }
    return acc
  }, {})
}

export async function checkAdminModules(): Promise<Record<string, ModuleHealthResult>> {
  const checks = ADMIN_MODULES.map(async module => [module.href, await checkAdminModule(module)] as const)
  const entries = await Promise.all(checks)

  return entries.reduce<Record<string, ModuleHealthResult>>((acc, [href, result]) => {
    acc[href] = result
    return acc
  }, {})
}

async function checkAdminModule(module: AdminModuleDefinition): Promise<ModuleHealthResult> {
  try {
    const results = await Promise.all(module.checks.map(check => withTimeout(runCheck(check), CHECK_TIMEOUT_MS)))
    const failed = results.find(result => result.kind === 'error')

    if (failed) {
      return {
        status: 'error',
        label: 'Hata',
        tone: 'red',
        detail: failed.message,
      }
    }

    const missingData = results.find(result => result.kind === 'empty')

    if (missingData) {
      return {
        status: 'inactive',
        label: 'Pasif',
        tone: 'amber',
        detail: missingData.message,
      }
    }

    return {
      status: 'active',
      label: 'Aktif',
      tone: 'green',
      detail: 'Route ve temel veri kaynakları erişilebilir.',
    }
  } catch (error) {
    return {
      status: 'error',
      label: 'Hata',
      tone: 'red',
      detail: error instanceof Error ? error.message : 'Sağlık kontrolü tamamlanamadı.',
    }
  }
}

type CheckResult =
  | { kind: 'ok'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string }

async function runCheck(check: ModuleHealthCheck): Promise<CheckResult> {
  if (check.type === 'route') return checkRoute(check)
  return checkTable(check)
}

async function checkRoute(check: RouteHealthCheck): Promise<CheckResult> {
  const response = await fetch(check.href, { cache: 'no-store' })

  if (!response.ok) {
    return { kind: 'error', message: `${check.label} erişilemedi (${response.status}).` }
  }

  return { kind: 'ok', message: `${check.label} erişilebilir.` }
}

async function checkTable(check: TableHealthCheck): Promise<CheckResult> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from(check.table)
    .select('id', { count: 'exact', head: true })

  if (error) {
    return { kind: 'error', message: `${check.label} okunamadı: ${error.message}` }
  }

  if (check.requireRows && !count) {
    return { kind: 'empty', message: `${check.label} erişilebilir ancak temel veri bulunamadı.` }
  }

  return { kind: 'ok', message: `${check.label} erişilebilir.` }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Sağlık kontrolü zaman aşımına uğradı.')), ms)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
