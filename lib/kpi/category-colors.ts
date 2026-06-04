import { createClient } from '@/lib/supabase/client'
import { CATEGORY_OPTIONS } from './config'

export type CategoryColorMap = Record<string, string>

// Statik varsayılan kategori renkleri (CATEGORY_OPTIONS).
export function defaultCategoryColors(): CategoryColorMap {
  const map: CategoryColorMap = {}
  CATEGORY_OPTIONS.forEach(category => { map[category.key] = category.color })
  return map
}

// Varsayılanların üzerine kullanıcı override'larını uygular.
export function resolveCategoryColors(overrides: CategoryColorMap | null | undefined): CategoryColorMap {
  return { ...defaultCategoryColors(), ...(overrides ?? {}) }
}

// Geçerli kullanıcının kategori rengi override'larını okur (yoksa boş; hata güvenli).
export async function loadUserCategoryColors(): Promise<CategoryColorMap> {
  try {
    const supabase = createClient()
    const { data: userResponse } = await supabase.auth.getUser()
    const userId = userResponse.user?.id
    if (!userId) return {}

    const { data, error } = await supabase
      .from('user_category_colors')
      .select('category_key, color')
      .eq('user_id', userId)

    if (error || !Array.isArray(data)) return {}

    const map: CategoryColorMap = {}
    data.forEach(row => {
      const record = row as { category_key?: string | null; color?: string | null }
      if (record.category_key && record.color) map[record.category_key] = record.color
    })
    return map
  } catch {
    return {}
  }
}

export async function saveUserCategoryColor(categoryKey: string, color: string): Promise<void> {
  const supabase = createClient()
  const { data: userResponse, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  const userId = userResponse.user?.id
  if (!userId) throw new Error('Giriş yapılmış kullanıcı bulunamadı.')

  const { error } = await supabase
    .from('user_category_colors')
    .upsert({ user_id: userId, category_key: categoryKey, color }, { onConflict: 'user_id,category_key' })

  if (error) throw new Error(error.message)
}

export async function resetUserCategoryColor(categoryKey: string): Promise<void> {
  const supabase = createClient()
  const { data: userResponse, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  const userId = userResponse.user?.id
  if (!userId) throw new Error('Giriş yapılmış kullanıcı bulunamadı.')

  const { error } = await supabase
    .from('user_category_colors')
    .delete()
    .eq('user_id', userId)
    .eq('category_key', categoryKey)

  if (error) throw new Error(error.message)
}
