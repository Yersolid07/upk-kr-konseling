// src/app/chat/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createChatSession(konselorId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Anda harus masuk untuk memulai chat.' }

  // Check if there's already an active session between this user and the counselor
  if (konselorId) {
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('member_id', user.id)
      .eq('konselor_id', konselorId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSession) {
      redirect(`/chat/${(existingSession as any).id}`)
    }
  }

  // Create new session
  const { data: newSession, error } = await (supabase.from('chat_sessions') as any)
    .insert({
      member_id: user.id,
      konselor_id: konselorId || null,
      status: konselorId ? 'active' : 'pending',
      topic: konselorId ? 'Konseling Personal' : 'Permintaan Chat Baru'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating chat session:', error)
    return { error: 'Gagal memulai sesi chat.' }
  }

  redirect(`/chat/${newSession.id}`)
}
