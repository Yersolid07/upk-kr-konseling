// src/app/(app)/cellgroup/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/profile/Avatar'
import { ArrowLeft, Users, ShieldCheck } from 'lucide-react'
import { GroupIcon, normalizeGroupIcon } from '@/components/ui/icons'
import { GroupChat } from './group-chat'
import { LeaveGroupButton } from './leave-group-button'

export const dynamic = 'force-dynamic'

export default async function CellGroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: groupData } = await supabase
    .from('cell_groups')
    .select('*, leader:profiles!cell_groups_leader_id_fkey(id, full_name, avatar_url, role)')
    .eq('id', params.id)
    .single()

  const group = groupData as any
  if (!group) notFound()

  const { data: membersData } = await supabase
    .from('cell_group_members')
    .select('user_id, is_leader, profile:profiles!cell_group_members_user_id_fkey(id, full_name, avatar_url, role)')
    .eq('group_id', params.id)

  const members = (membersData ?? []) as any[]
  const isMember = members.some(m => m.user_id === user.id)
  const isLeader = group.leader_id === user.id

  if (!isMember) {
    // Non-members are sent back to the list to join first.
    redirect('/cellgroup')
  }

  const { data: messagesData } = await supabase
    .from('cell_group_messages')
    .select('*, sender:profiles!cell_group_messages_sender_id_fkey(id, full_name, avatar_url)')
    .eq('group_id', params.id)
    .order('created_at', { ascending: true })
    .limit(200)

  const messages = (messagesData ?? []) as any[]

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      <Link href="/cellgroup" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Semua KK/KTB
      </Link>

      {/* Header */}
      <div className="card-premium p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white shadow-xl shrink-0">
          <GroupIcon name={normalizeGroupIcon(group.icon)} className="w-9 h-9" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-[var(--font-playfair)] text-3xl font-black text-[var(--brown-dark)]">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{group.description}</p>
          )}
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
              <Users size={12} /> {members.length} anggota
            </span>
            {group.leader?.full_name && (
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                <ShieldCheck size={12} className="text-[var(--sage)]" /> Pembina: {group.leader.full_name}
              </span>
            )}
          </div>
        </div>
        {!isLeader && <LeaveGroupButton groupId={group.id} />}
      </div>

      {/* Members strip */}
      <div className="flex items-center gap-2 flex-wrap px-2">
        {members.slice(0, 12).map((m: any) => (
          <div key={m.user_id} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border border-[var(--cream-dark)] shadow-sm">
            <Avatar src={m.profile?.avatar_url} name={m.profile?.full_name} size="xs" />
            <span className="text-[10px] font-bold text-[var(--text-muted)] truncate max-w-[100px]">{m.profile?.full_name ?? 'Anggota'}</span>
            {m.is_leader && <ShieldCheck size={11} className="text-[var(--terra)]" />}
          </div>
        ))}
        {members.length > 12 && (
          <span className="text-[10px] font-bold text-[var(--text-muted)]">+{members.length - 12} lainnya</span>
        )}
      </div>

      {/* Group chat */}
      <GroupChat groupId={group.id} currentUserId={user.id} initialMessages={messages} />
    </div>
  )
}
