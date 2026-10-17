// src/app/api/sos/route.ts
// Handles SOS alerts — notifies all online konselor + admin, and routes the
// member to an available (online) counselor when possible.

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { appUrlFrom } from '@/lib/app-url'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { message = 'Butuh bantuan segera' } = body

  // All active konselor + admin (to notify)
  const { data: targets } = await adminClient
    .from('profiles')
    .select('id, full_name, is_online, role')
    .in('role', ['konselor', 'admin', 'super_admin'])
    .eq('is_active', true)

  if (!targets?.length) {
    return NextResponse.json({ error: 'Tidak ada konselor online' }, { status: 404 })
  }

  // Prefer routing to a counselor who is currently online.
  const onlineKonselor = (targets as any[]).find(
    t => t.role === 'konselor' && t.is_online === true
  )
  const assignedKonselorId = onlineKonselor?.id ?? null

  // Insert notifications for all konselor/admin.
  const notifications = (targets as any[]).map(t => ({
    user_id: t.id,
    type: 'sos_alert' as const,
    title: 'Permintaan Bantuan Darurat',
    body: `Seorang anggota membutuhkan bantuan segera: "${message}"`,
    link: '/konselor',
    meta: { requester_id: user.id, is_sos: true },
  }))

  await (adminClient.from('notifications') as any).insert(notifications)

  // Create an urgent session, assigned to an online counselor when available.
  const { data: session } = await (adminClient
    .from('chat_sessions') as any)
    .insert({
      member_id: user.id,
      konselor_id: assignedKonselorId,
      status: assignedKonselorId ? 'active' : 'pending',
      topic: `[SOS] ${message}`,
      is_anonymous: true,
    })
    .select()
    .single()

  // WhatsApp alert to the on-duty counselor number, if configured.
  const sosNumber = process.env.NEXT_PUBLIC_SOS_WA_NUMBER
  if (sosNumber) {
    try {
      const { sendWhatsApp } = await import('@/lib/fonnte')
      await sendWhatsApp(
        sosNumber,
        `[SOS IKA UPK-Kr FT UNSRAT] Bantuan Darurat!\n\nNama: ${(user.user_metadata as any)?.full_name || 'Seorang Anggota'}\nPesan: "${message}"\n\nRespon segera di: ${appUrlFrom(request)}/konselor`
      )
    } catch (err) {
      console.error('SOS WhatsApp send failed:', err)
    }
  }

  return NextResponse.json({
    success: true,
    session_id: session?.id,
    routed_to_online: Boolean(assignedKonselorId),
  })
}
