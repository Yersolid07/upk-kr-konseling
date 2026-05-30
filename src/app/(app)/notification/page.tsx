// src/app/(app)/notification/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { 
  Bell, 
  CheckCircle2, 
  MessageSquare, 
  ShieldAlert, 
  Clock,
  ChevronRight
} from 'lucide-react'
import { getRelativeTime, cn } from '@/lib/utils'
import Link from 'next/link'

async function markAllRead() {
  'use server'
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  revalidatePath('/notification')
}

export default async function NotificationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const hasUnread = (notifications as any[])?.some(n => !n.is_read)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between px-2">
        <h1 className="font-[var(--font-playfair)] text-4xl font-black text-[var(--brown-dark)]">Notifikasi</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button 
              type="submit"
              className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--terra)] transition-colors cursor-pointer"
            >
              ✓ Tandai Semua Dibaca
            </button>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {(!notifications || notifications.length === 0) ? (
          <div className="card-premium p-20 text-center space-y-4">
             <div className="w-16 h-16 bg-[var(--cream)] rounded-full flex items-center justify-center text-[var(--cream-dark)] mx-auto">
                <Bell size={32} />
             </div>
             <p className="text-[var(--text-muted)] font-medium">Belum ada notifikasi untuk Anda.</p>
          </div>
        ) : (notifications as any[]).map((n) => (
          <Link
            key={n.id} 
            href={n.link || '#'}
            className={cn(
              "card-premium p-6 flex items-start gap-5 hover-lift cursor-pointer group block",
              !n.is_read && "border-l-4 border-l-[var(--terra)] bg-gradient-to-r from-[var(--terra)]/5 to-transparent"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              n.type === 'konselor_verified' ? "bg-green-100 text-green-600" :
              n.type === 'new_message' ? "bg-blue-100 text-blue-600" :
              n.type === 'sos_alert' ? "bg-red-100 text-red-600" :
              "bg-[var(--cream)] text-[var(--brown)]"
            )}>
              {n.type === 'konselor_verified' ? <CheckCircle2 size={24} /> :
               n.type === 'new_message' ? <MessageSquare size={24} /> :
               n.type === 'sos_alert' ? <ShieldAlert size={24} /> :
               <Bell size={24} />}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors">{n.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{n.body}</p>
              <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                <Clock size={12} /> {getRelativeTime(n.created_at)}
              </div>
            </div>
            
            <ChevronRight size={18} className="text-[var(--cream-dark)] group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  )
}
