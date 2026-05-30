// src/app/api/sos/route.ts
// Handles SOS alerts — notifies all online konselor + admin

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { message = 'Butuh bantuan segera' } = body

  // Get all konselor + admin to notify
  const { data: targets } = await adminClient
    .from('profiles')
    .select('id, full_name, is_online')
    .in('role', ['konselor', 'admin', 'super_admin'])
    .eq('is_active', true)

  if (!targets?.length) {
    return NextResponse.json({ error: 'Tidak ada konselor online' }, { status: 404 })
  }

  // Insert notifications for all konselor/admin
  const notifications = (targets as any[]).map(t => ({
    user_id: t.id,
    type: 'sos_alert' as const,
    title: '🆘 Permintaan Bantuan Darurat',
    body: `Seorang anggota membutuhkan bantuan segera: "${message}"`,
    link: '/konselor',
    meta: { requester_id: user.id, is_sos: true },
  }))

  await (adminClient.from('notifications') as any).insert(notifications)

  // Create an urgent pending session
  const { data: session } = await (adminClient
    .from('chat_sessions') as any)
    .insert({
      member_id: user.id,
      konselor_id: null,
      status: 'pending',
      topic: `[SOS] ${message}`,
      is_anonymous: true,
    })
    .select()
    .single()

  // Send WhatsApp via Fonnte to configured counselor numbers
  const sosNumber = process.env.NEXT_PUBLIC_SOS_WA_NUMBER
  if (sosNumber) {
    const { sendWhatsApp } = await import('@/lib/fonnte')
    await sendWhatsApp(
      sosNumber, 
      `[SOS UPK-Kr] 🆘 Bantuan Darurat!\n\nNama: ${(user.user_metadata as any)?.full_name || 'Seorang Anggota'}\nPesan: "${message}"\n\nRespon segera di: ${process.env.NEXT_PUBLIC_APP_URL}/konselor`
    )
  }

  return NextResponse.json({ success: true, session_id: session?.id })
}
