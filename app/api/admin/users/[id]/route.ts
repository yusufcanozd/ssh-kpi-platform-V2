import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ROLES = new Set(['superadmin', 'admin', 'analyst', 'viewer'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const { data: actor, error: actorError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .single()

  if (actorError || !actor?.is_active) {
    return NextResponse.json({ error: 'Bu işlem için aktif kullanıcı gerekli.' }, { status: 403 })
  }

  if (actor.role !== 'superadmin') {
    return NextResponse.json({ error: 'Bu işlem için superadmin yetkisi gerekli.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { role?: string; is_active?: boolean } | null
  if (!body) {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const updates: { role?: string; is_active?: boolean } = {}

  if (body.role !== undefined) {
    if (!ROLES.has(body.role)) {
      return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 })
    }
    if (params.id === user.id) {
      return NextResponse.json({ error: 'Kendi rolünüzü değiştiremezsiniz.' }, { status: 400 })
    }
    updates.role = body.role
  }

  if (body.is_active !== undefined) {
    if (params.id === user.id && body.is_active === false) {
      return NextResponse.json({ error: 'Kendi hesabınızı pasife alamazsınız.' }, { status: 400 })
    }
    updates.is_active = body.is_active
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 })
  }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', params.id)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 })
  }

  if ((updates.is_active === false || updates.role !== 'superadmin') && target.role === 'superadmin') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'superadmin')
      .eq('is_active', true)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Son aktif superadmin pasife alınamaz veya rolü değiştirilemez.' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', params.id)
    .select('id, role, is_active')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data })
}
