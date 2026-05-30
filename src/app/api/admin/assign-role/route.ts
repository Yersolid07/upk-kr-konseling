// src/app/api/admin/assign-role/route.ts
// Admin-only endpoint to assign roles (especially konselor)

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  // Verify caller is admin or super_admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const callerProfile = profileData as any

  if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
  }

  const body = await request.json()
  const { user_id, role, specialization, is_verified } = body

  // Validate role assignment permissions
  // Admin can assign: moderator, konselor, member
  // Super admin can assign: all roles including admin
  const allowedByAdmin = ['moderator', 'konselor', 'member']
  const allowedBySuperAdmin = [...allowedByAdmin, 'admin']

  const callerIsSuperAdmin = callerProfile.role === 'super_admin'
  const allowed = callerIsSuperAdmin ? allowedBySuperAdmin : allowedByAdmin

  if (!allowed.includes(role)) {
    return NextResponse.json(
      { error: `Role "${role}" tidak dapat diassign oleh ${callerProfile.role}` },
      { status: 403 }
    )
  }

  // Update profile using admin client (bypasses RLS)
  const updateData: Record<string, unknown> = { role }
  if (specialization) updateData.specialization = specialization
  if (typeof is_verified === 'boolean') updateData.is_verified = is_verified

  const { data, error } = await (adminClient.from('profiles') as any)
    .update(updateData)
    .eq('id', user_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send notification to user
  await (adminClient.from('notifications') as any).insert({
    user_id,
    type: role === 'konselor' ? 'konselor_verified' : 'system',
    title: role === 'konselor'
      ? '🎉 Kamu telah diverifikasi sebagai Konselor!'
      : `Role kamu telah diperbarui menjadi ${role}`,
    body: role === 'konselor'
      ? 'Selamat! Kamu sekarang bisa menerima sesi konseling dari anggota.'
      : undefined,
  })

  return NextResponse.json({ success: true, profile: data })
}
