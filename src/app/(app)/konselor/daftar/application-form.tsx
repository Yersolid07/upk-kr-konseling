// src/app/(app)/konselor/daftar/application-form.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Send, Loader2, CheckCircle2, Clock, XCircle, ShieldCheck,
  Paperclip, AlertTriangle, Undo2, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { submitKonselorApplication, withdrawApplication } from './actions'
import { AttachmentInput, type DraftAttachment } from '@/components/ui/attachment-input'
import type { KonselorApplication } from '@/types/database'

const SPECIALIZATIONS = [
  'Kecemasan', 'Depresi', 'Akademik', 'Karier', 'Keluarga',
  'Hubungan', 'Kerohanian', 'Krisis', 'Remaja', 'Trauma',
]

const STATUS_UI: Record<string, { label: string; cls: string; icon: typeof Clock; text: string }> = {
  pending: {
    label: 'Menunggu Tinjauan', cls: 'bg-[var(--gold)]/15 border-[var(--gold)]/30 text-[var(--brown-dark)]',
    icon: Clock, text: 'Pengajuanmu sudah masuk. Admin akan meninjaunya dalam beberapa hari.',
  },
  under_review: {
    label: 'Sedang Ditinjau', cls: 'bg-[var(--gold)]/15 border-[var(--gold)]/30 text-[var(--brown-dark)]',
    icon: Clock, text: 'Admin sedang meninjau pengajuanmu. Mohon tunggu kabar lewat notifikasi.',
  },
  approved: {
    label: 'Disetujui', cls: 'bg-[var(--sage)]/15 border-[var(--sage)]/30 text-[var(--sage)]',
    icon: ShieldCheck, text: 'Selamat! Kamu kini terverifikasi sebagai Konselor. Lengkapi jadwalmu di dashboard.',
  },
  rejected: {
    label: 'Belum Disetujui', cls: 'bg-red-50 border-red-200 text-red-600',
    icon: XCircle, text: 'Pengajuanmu belum dapat disetujui saat ini.',
  },
  withdrawn: {
    label: 'Ditarik', cls: 'bg-[var(--cream-dark)] border-[var(--cream-dark)] text-[var(--text-muted)]',
    icon: Undo2, text: 'Kamu menarik pengajuan ini. Kamu bisa mengajukan lagi kapan saja.',
  },
}

export function ApplicationForm({
  role,
  existing,
  userId,
  fullName,
}: {
  role: string
  existing: KonselorApplication | null
  userId: string
  fullName: string
}) {
  const [pending, startTransition] = useTransition()
  const [picked, setPicked] = useState<string[]>(existing?.specialization ?? [])
  const [attachments, setAttachments] = useState<DraftAttachment[]>([])

  const active = existing && (existing.status === 'pending' || existing.status === 'under_review')

  function toggleSpec(s: string) {
    setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function submit(fd: FormData) {
    fd.set('specialization', JSON.stringify(picked))
    picked.forEach((s) => fd.append('specialization', s))
    if (attachments[0]) fd.set('credential_url', attachments[0].url)

    startTransition(async () => {
      const res = (await submitKonselorApplication(fd)) as
        | { error?: string; success?: string }
        | undefined
      if (res?.error) toast.error(res.error)
      else toast.success(res?.success ?? 'Pengajuan terkirim.')
    })
  }

  // Sudah punya pengajuan aktif atau sudah disetujui -> tampilkan status saja.
  if (active || existing?.status === 'approved') {
    const meta = STATUS_UI[existing.status]
    const Icon = meta.icon
    return (
      <div className={cn('card-premium p-6 sm:p-8 border space-y-4', meta.cls)}>
        <div className="flex items-center gap-3">
          <Icon size={22} />
          <h2 className="font-bold text-lg">{meta.label}</h2>
        </div>
        <p className="text-sm leading-relaxed">{meta.text}</p>

        {existing.status === 'rejected' && existing.review_notes && (
          <div className="p-4 rounded-xl bg-white/60 border border-red-200">
            <p className="text-xs font-bold text-red-700 mb-1">Catatan dari admin:</p>
            <p className="text-sm text-[var(--text)] leading-relaxed">{existing.review_notes}</p>
          </div>
        )}

        <div className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-current/10">
          Dikirim {new Date(existing.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
          {existing.reviewed_at && ` · ditinjau ${new Date(existing.reviewed_at).toLocaleDateString('id-ID')}`}
        </div>

        {active && (
          <form
            action={(fd) => {
              startTransition(async () => {
                const res = (await withdrawApplication(fd)) as { error?: string; success?: string } | undefined
                if (res?.error) toast.error(res.error)
                else toast.success(res?.success ?? 'Pengajuan ditarik.')
              })
            }}
          >
            <input type="hidden" name="id" value={existing.id} />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-current/20 text-xs font-bold uppercase tracking-wider hover:bg-white/70 transition-all disabled:opacity-50"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />} Tarik Pengajuan
            </button>
          </form>
        )}
      </div>
    )
  }

  // Boleh mengajukan (belum pernah, ditarik, atau ditolak -> boleh coba lagi).
  return (
    <form action={submit} className="space-y-6">
      {existing?.status === 'rejected' && existing.review_notes && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertTriangle size={17} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-700 mb-1">Catatan dari pengajuan sebelumnya:</p>
            <p className="text-sm text-[var(--text)] leading-relaxed">{existing.review_notes}</p>
          </div>
        </div>
      )}

      <div className="card-premium p-5 sm:p-8 space-y-6">
        <div className="form-group">
          <label className="form-label">Motivasi Melayani</label>
          <textarea
            name="motivation"
            required
            minLength={50}
            rows={5}
            placeholder="Ceritakan mengapa kamu ingin menjadi konselor, dan bagaimana kamu berharap dapat mendampingi teman-teman."
            className="form-input text-sm leading-relaxed resize-none"
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-2">Minimal 50 karakter.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Pengalaman Pendampingan (opsional)</label>
          <textarea
            name="experience"
            rows={4}
            placeholder="Pengalaman pelayanan, pelatihan, atau pendampingan yang pernah kamu lakukan."
            className="form-input text-sm leading-relaxed resize-none"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Bidang yang Kamu Kuasai</label>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">
            Pilih topik yang kamu rasa siap untuk dampingi.
          </p>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpec(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all',
                  picked.includes(s)
                    ? 'bg-[var(--terra)] text-white border-[var(--terra)]'
                    : 'bg-white text-[var(--brown)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ketersediaan Waktu</label>
          <input
            name="availability_note"
            placeholder="mis. Senin & Rabu malam, Sabtu pagi"
            className="form-input text-sm"
          />
        </div>

        <div className="form-group pt-2 border-t border-[var(--cream-dark)]">
          <label className="form-label flex items-center gap-2 mt-4">
            <Paperclip size={14} className="text-[var(--terra)]" /> Bukti Kredensial (opsional)
          </label>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">
            Sertifikat, surat rekomendasi, atau dokumen pendukung. Format gambar, PDF, atau
            dokumen.
          </p>
          <AttachmentInput
            userId={userId}
            value={attachments}
            onChange={setAttachments}
            maxFiles={3}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--cream)] border border-[var(--cream-dark)]">
        <Info size={17} className="text-[var(--terra)] shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Dengan mengirim pengajuan, kamu menyetujui{' '}
          <Link href="/legal/terms" className="text-[var(--terra)] font-medium hover:underline">
            Syarat & Ketentuan
          </Link>{' '}
          dan{' '}
          <Link href="/legal/konselor-guide" className="text-[var(--terra)] font-medium hover:underline">
            kode etik konselor
          </Link>
          , termasuk kewajiban menjaga kerahasiaan konseli.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending || picked.length === 0}
        className="btn-primary h-14 w-full group shadow-xl shadow-[var(--terra)]/20"
      >
        <span className="flex items-center justify-center gap-2">
          {pending
            ? <><Loader2 size={17} className="animate-spin" /> Mengirim…</>
            : <><Send size={17} /> Kirim Pengajuan</>}
        </span>
      </button>
      {picked.length === 0 && (
        <p className="text-[11px] text-center text-[var(--text-muted)]">
          Pilih minimal satu bidang keahlian.
        </p>
      )}
    </form>
  )
}
