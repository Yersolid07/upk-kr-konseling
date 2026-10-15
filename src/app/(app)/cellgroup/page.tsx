// src/app/(app)/cellgroup/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Plus,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { JoinGroupButton } from './join-group-button'
import { CreateGroupDialog } from './create-group-dialog'

export const dynamic = 'force-dynamic'

export default async function CellGroupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profileData as any)?.role
  const canCreate = ['konselor', 'admin', 'super_admin'].includes(role)

  // All active groups
  const { data: groupsData } = await supabase
    .from('cell_groups')
    .select('*, leader:profiles!cell_groups_leader_id_fkey(id, full_name, avatar_url)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  const groups = (groupsData ?? []) as any[]

  // Membership of current user
  const { data: myMemberships } = await supabase
    .from('cell_group_members')
    .select('group_id, is_leader')
    .eq('user_id', user.id)
  const myGroupIds = new Set((myMemberships ?? []).map((m: any) => m.group_id))

  // Member counts (fetch all memberships, count in JS — dataset is small)
  const { data: allMembers } = await supabase
    .from('cell_group_members')
    .select('group_id, user_id')
  const countByGroup = new Map<string, number>()
  ;(allMembers ?? []).forEach((m: any) => {
    countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1)
  })

  const myGroups = groups.filter(g => myGroupIds.has(g.id))
  const otherGroups = groups.filter(g => !myGroupIds.has(g.id))

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      <section className="text-center space-y-4">
        <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-[var(--brown-dark)]">Cell Group</h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
          Temukan komunitas kecil untuk tumbuh bersama dalam iman dan persaudaraan.
        </p>
        {canCreate && (
          <div className="flex justify-center pt-2">
            <CreateGroupDialog />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Your Cell Groups */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Group Saya</h3>
          {myGroups.length === 0 ? (
            <div className="card-premium p-10 border-2 border-dashed border-[var(--cream-dark)] bg-white/50 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-[var(--cream)] rounded-full flex items-center justify-center text-[var(--text-muted)]">
                <Users size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[var(--brown-dark)]">Belum Ada Group</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                  Anda belum bergabung dengan Cell Group manapun. Bergabunglah untuk mendapatkan dukungan komunitas.
                </p>
              </div>
            </div>
          ) : (
            myGroups.map(g => (
              <Link key={g.id} href={`/cellgroup/${g.id}`} className="card-premium p-6 flex items-center gap-6 hover-lift group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white text-2xl shadow-lg shrink-0">
                  {g.icon || '✝️'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[var(--brown-dark)] text-lg group-hover:text-[var(--terra)] transition-colors truncate">{g.name}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                      <Users size={12} /> {countByGroup.get(g.id) ?? 0} anggota
                    </div>
                    {g.leader?.full_name && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest truncate">
                        <ShieldCheck size={12} className="text-[var(--sage)]" /> {g.leader.full_name}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="text-[var(--cream-dark)] group-hover:text-[var(--terra)] transition-all" />
              </Link>
            ))
          )}
        </div>

        {/* Discover Groups */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2 flex items-center gap-2">
            <Sparkles size={12} /> Group Populer
          </h3>
          {otherGroups.length === 0 ? (
            <div className="card-premium p-10 text-center text-sm text-[var(--text-muted)] italic">
              {groups.length === 0
                ? 'Belum ada Cell Group aktif saat ini.'
                : 'Anda sudah bergabung dengan semua Cell Group yang tersedia.'}
            </div>
          ) : (
            otherGroups.map(g => (
              <div key={g.id} className="card-premium p-6 flex items-center gap-6 hover-lift">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--sage)] to-[var(--brown)] flex items-center justify-center text-white text-2xl shadow-lg shrink-0">
                  {g.icon || '✝️'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[var(--brown-dark)] text-lg truncate">{g.name}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                      <Users size={12} /> {countByGroup.get(g.id) ?? 0} anggota
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                      <Calendar size={12} /> Aktif
                    </div>
                  </div>
                </div>
                <JoinGroupButton groupId={g.id} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="bg-[var(--sage)]/10 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 border border-[var(--sage)]/20">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[var(--sage)] shadow-xl shadow-[var(--sage)]/10 shrink-0">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-2 flex-1 text-center md:text-left">
          <h3 className="font-bold text-[var(--brown-dark)] text-2xl">Keanggotaan Terverifikasi</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Setiap Cell Group dipimpin oleh kakak pembina yang telah terverifikasi dan dibimbing langsung oleh alumni senior UPK-Kr.
          </p>
        </div>
        <Link href="/contact" className="text-sm font-black text-[var(--sage)] uppercase tracking-widest hover:underline flex items-center gap-2">
          Pelajari Lebih Lanjut <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
