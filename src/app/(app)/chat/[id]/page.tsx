// src/app/chat/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ChatInterface } from './chat-interface'
import { SessionNotePanel } from '@/components/konselor/session-note-panel'

export const dynamic = 'force-dynamic'

export default async function ChatDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Fetch session details
  const { data: sessionData } = await supabase
    .from('chat_sessions')
    .select(`
      *,
      konselor:profiles!chat_sessions_konselor_id_fkey(*),
      member:profiles!chat_sessions_member_id_fkey(*)
    `)
    .eq('id', params.id)
    .single()

  const session = sessionData as any

  if (!session) notFound()

  // Verify access (must be the member or the assigned konselor)
  if (session.member_id !== user.id && session.konselor_id !== user.id) {
    redirect('/chat')
  }

  // Fetch initial messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', params.id)
    .order('created_at', { ascending: true })

  // Catatan sesi hanya untuk konselor pemegang sesi. Kueri memakai klien
  // pengguna, jadi RLS `session_notes_select` yang memutuskan — bukan
  // pemeriksaan di sini. Bila bukan pemiliknya, hasilnya kosong.
  const isKonselor = session.konselor_id === user.id
  let noteBody: string | null = null
  if (isKonselor) {
    const { data: note } = await supabase
      .from('session_notes')
      .select('note')
      .eq('session_id', params.id)
      .eq('konselor_id', user.id)
      .maybeSingle()
    noteBody = (note as unknown as { note: string } | null)?.note ?? null
  }

  return (
    <div className="chat-shell animate-fade-in">
      <ChatInterface 
        session={session} 
        initialMessages={messages ?? []} 
        currentUserId={user.id} 
      />
      {isKonselor && (
        <div className="px-4 pb-6 max-w-3xl mx-auto">
          <SessionNotePanel sessionId={params.id} initialBody={noteBody} />
        </div>
      )}
    </div>
  )
}
