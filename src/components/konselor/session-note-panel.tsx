// src/components/konselor/session-note-panel.tsx
// Catatan klinis sesi (M7) — hanya untuk konselor pemegang sesi.
//
// Catatan ini TIDAK dibaca admin, dan itu disengaja. RLS `session_notes`
// membatasi ke `konselor_id = auth.uid()`; komentar ini menjelaskan kenapa
// jangan "diperbaiki" dengan memberi admin akses baca: isi catatan klinis
// bukan bahan moderasi.

'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { NotebookPen, Loader2, Lock, Save } from 'lucide-react'
import { saveSessionNote } from '@/app/(app)/admin/konseling/actions'

export function SessionNotePanel({
  sessionId,
  initialBody,
}: {
  sessionId: string
  initialBody: string | null
}) {
  const [body, setBody] = useState(initialBody ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(Boolean(initialBody))

  async function save() {
    if (!body.trim()) return toast.error('Catatan tidak boleh kosong.')
    setBusy(true)
    const res = await saveSessionNote({ sessionId, body: body.trim() })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    setSaved(true)
    toast.success('Catatan disimpan.')
  }

  return (
    <section className="card-premium p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--brown-dark)]">
            <NotebookPen size={15} /> Catatan sesi
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
            Hanya Anda yang bisa membaca ini. Tidak tampil ke anggota, tidak tampil ke admin.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-2)] shrink-0">
          <Lock size={9} /> privat
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value)
          setSaved(false)
        }}
        rows={6}
        maxLength={8000}
        className="form-input"
        style={{ resize: 'vertical' }}
        placeholder="Ringkas kondisi, kebutuhan, dan rencana tindak lanjut. Tulis seperlunya — catatan ini juga tanggung jawab Anda."
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--text-muted)]">
          {saved ? 'Tersimpan.' : body.trim() ? 'Belum disimpan.' : ''}
        </p>
        <button
          onClick={save}
          disabled={busy || !body.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Simpan catatan
        </button>
      </div>
    </section>
  )
}
