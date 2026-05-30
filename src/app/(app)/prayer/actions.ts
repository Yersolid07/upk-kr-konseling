// src/app/(app)/prayer/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function supportPrayer(requestId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Anda harus masuk untuk mendoakan.' }

  // Check if already supported
  const { data: existing } = await supabase
    .from('prayer_supports')
    .select('id')
    .eq('request_id', requestId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { error: 'Anda sudah mendoakan permintaan ini.' }
  }

  // Insert support
  const { error } = await (supabase.from('prayer_supports') as any).insert({
    request_id: requestId,
    user_id: user.id,
  })

  if (error) {
    console.error('Error supporting prayer:', error)
    return { error: 'Gagal mendoakan. Silakan coba lagi.' }
  }

  // Increment pray_count
  try {
    const { error: rpcError } = await (supabase as any).rpc('increment_pray_count', { p_request_id: requestId })
    if (rpcError) throw rpcError
  } catch (err) {
    // Fallback: manual increment if RPC doesn't exist
    const { data } = await supabase
      .from('prayer_requests')
      .select('pray_count')
      .eq('id', requestId)
      .single()
      
    if (data) {
      await (supabase.from('prayer_requests') as any)
        .update({ pray_count: ((data as any).pray_count || 0) + 1 })
        .eq('id', requestId)
    }
  }

  revalidatePath('/prayer')
  return { success: true }
}

export async function createPrayer(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Anda harus masuk untuk mengirim pokok doa.' }

  const content = formData.get('content') as string
  const isAnonymousRaw = formData.get('is_anonymous') as string
  const isAnonymous = isAnonymousRaw === 'on' || isAnonymousRaw === 'true'

  if (!content?.trim()) {
    return { error: 'Pokok doa tidak boleh kosong.' }
  }

  const { error } = await (supabase.from('prayer_requests') as any).insert({
    author_id: user.id,
    content: content.trim(),
    is_anonymous: isAnonymous,
  })

  if (error) {
    console.error('Error creating prayer:', error)
    return { error: 'Gagal mengirim pokok doa.' }
  }

  revalidatePath('/prayer')
  redirect('/prayer')
}

// Alias for backward compatibility
export const createPrayerRequest = createPrayer
