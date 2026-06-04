import { CATEGORY_OPTIONS, CAT_COLORS } from '@/lib/kpi/config'
import { createClient } from '@/lib/supabase/client'

export type CategoryColorOverrides = Record<string, string>

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export const DEFAULT_CATEGORY_COLORS: CategoryColorOverrides = Object.fromEntries(
  CATEGORY_OPTIONS.map(category => [category.key, category.color || CAT_COLORS[category.label] || '#64748b']),
)

export function normalizeCategoryColor(color: string | null | undefined): string | null {
  const value = String(color ?? '').trim()
  return HEX_COLOR_RE.test(value) ? value.toLowerCase() : null
}

export function resolveCategoryColor(
  categoryKeyOrName: string,
  overrides: CategoryColorOverrides = {},
): string {
  const byKey = CATEGORY_OPTIONS.find(category => category.key === categoryKeyOrName)
  const byName = CATEGORY_OPTIONS.find(category => category.label === categoryKeyOrName || category.shortLabel === categoryKeyOrName)
  const key = byKey?.key ?? byName?.key ?? categoryKeyOrName
  return normalizeCategoryColor(overrides[key])
    ?? DEFAULT_CATEGORY_COLORS[key]
    ?? CAT_COLORS[categoryKeyOrName]
    ?? '#64748b'
}

export function resolveCategoryBg(
  categoryKeyOrName: string,
  overrides: CategoryColorOverrides = {},
  alpha = '18',
): string {
  return `${resolveCategoryColor(categoryKeyOrName, overrides)}${alpha}`
}

export function applyCategoryColorOverrides<
  T extends { key: string; color?: string; label?: string; shortLabel?: string },
>(
  categories: readonly T[],
  overrides: CategoryColorOverrides = {},
): Array<T & { color: string; bg: string }> {
  return categories.map(category => {
    const color = resolveCategoryColor(category.key, overrides)
    return { ...category, color, bg: `${color}18` }
  })
}

export async function fetchUserCategoryColorOverrides(userId: string): Promise<{ colors: CategoryColorOverrides; error?: string }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_category_colors')
      .select('category_key, color')
      .eq('user_id', userId)

    if (error) return { colors: {}, error: error.message }

    const colors: CategoryColorOverrides = {}
    for (const row of (data ?? []) as Array<{ category_key?: string | null; color?: string | null }>) {
      const key = String(row.category_key ?? '').trim()
      const color = normalizeCategoryColor(row.color)
      if (key && color) colors[key] = color
    }
    return { colors }
  } catch (error) {
    return { colors: {}, error: error instanceof Error ? error.message : 'Kategori renkleri okunamadı.' }
  }
}

export async function saveUserCategoryColorOverride(
  userId: string,
  categoryKey: string,
  color: string,
): Promise<{ error?: string }> {
  const normalized = normalizeCategoryColor(color)
  if (!normalized) return { error: 'Geçerli bir HEX renk seçin.' }

  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_category_colors')
      .upsert({ user_id: userId, category_key: categoryKey, color: normalized }, { onConflict: 'user_id,category_key' })

    return error ? { error: error.message } : {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Kategori rengi kaydedilemedi.' }
  }
}

export async function deleteUserCategoryColorOverride(
  userId: string,
  categoryKey: string,
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_category_colors')
      .delete()
      .eq('user_id', userId)
      .eq('category_key', categoryKey)

    return error ? { error: error.message } : {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Kategori rengi sıfırlanamadı.' }
  }
}
