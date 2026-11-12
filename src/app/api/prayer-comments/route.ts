// src/app/api/prayer-comments/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — baca komentar suatu doa
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('request_id')
  if (!requestId) return NextResponse.json({ error: 'request_id required' }, { status: 400 })

  const { data: comments, error } = await supabase
    .from('prayer_comments')
    .select(`
      id, content, is_anonymous, created_at,
      author_id,
      profiles!prayer_comments_author_id_fkey(display_name, full_name, avatar_url, role)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Samarkan label untuk doa anonim
  const sanitized = (comments ?? []).map((c: any) => {
    if (c.is_anonymous) {
      return {
        ...c,
        author_label: 'Anonim',
        avatar_url: null,
      }
    }
    return {
      ...c,
      author_label: c.profiles?.display_name || c.profiles?.full_name || 'Anggota',
      avatar_url: c.profiles?.avatar_url || null,
    }
  })

  return NextResponse.json({ comments: sanitized })
}

// POST — tambah komentar
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { request_id, content, is_anonymous } = body

  if (!request_id || !content?.trim()) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: 'Komentar terlalu panjang (maks 1000 karakter)' }, { status: 400 })
  }

  // Basic content check
  const bad = ['http://', 'https://', 'www.', '.com', '.id', '.org']
  if (bad.some(w => content.toLowerCase().includes(w))) {
    return NextResponse.json({ error: 'Komentar tidak boleh memuat tautan' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('prayer_comments')
    .insert({
      request_id,
      author_id: user.id,
      content: content.trim(),
      is_anonymous: Boolean(is_anonymous),
    } as never)
    .select(`
      id, content, is_anonymous, created_at,
      profiles!prayer_comments_author_id_fkey(display_name, full_name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const c = data as any
  return NextResponse.json({
    comment: {
      id: c.id,
      content: c.content,
      is_anonymous: c.is_anonymous,
      created_at: c.created_at,
      author_label: c.is_anonymous ? 'Anonim' : (c.profiles?.display_name || c.profiles?.full_name || 'Anggota'),
      avatar_url: c.is_anonymous ? null : (c.profiles?.avatar_url || null),
    }
  })
}

// DELETE — hapus komentar sendiri
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Hanya автор bisa hapus komentarnya sendiri
  const { error } = await supabase
    .from('prayer_comments')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
