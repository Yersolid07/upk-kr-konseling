// src/app/(app)/cellgroup/create-group-dialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check } from 'lucide-react'
import { createCellGroup } from './actions'
import toast from 'react-hot-toast'

const ICON_OPTIONS = ['✝️', '🕊️', '📖', '🌿', '🔥', '💡', '🤝', '⭐']

export function CreateGroupDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('✝️')

  async function handleSubmit(formData: FormData) {
    setPending(true)
    formData.set('icon', icon)
    const res = await createCellGroup(formData)
    if (res?.error) {
      toast.error(res.error)
      setPending(false)
    }
    // On success the server action redirects.
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brown-dark)] text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[var(--brown)] transition-all active:scale-95 shadow-lg shadow-[var(--brown-dark)]/20"
      >
        <Plus size={18} /> Buat Cell Group
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Buat Cell Group Baru</h2>
              <button onClick={() => setOpen(false)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--cream)] rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--brown-dark)]">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIcon(opt)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border-2 transition-all ${
                        icon === opt ? 'border-[var(--terra)] bg-[var(--terra)]/10 scale-110' : 'border-[var(--cream-dark)] hover:border-[var(--terra)]/40'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--brown-dark)]">Nama Group</label>
                <input
                  name="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Fellowship Teknik"
                  className="w-full bg-[var(--cream)]/30 border border-[var(--cream-dark)] rounded-xl p-3 text-sm outline-none focus:border-[var(--terra)] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--brown-dark)]">Deskripsi</label>
                <textarea
                  name="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan fokus & jadwal pertemuan grup..."
                  className="w-full bg-[var(--cream)]/30 border border-[var(--cream-dark)] rounded-xl p-3 text-sm resize-none outline-none focus:border-[var(--terra)] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={pending || name.trim().length < 3}
                className="w-full py-4 bg-[var(--brown-dark)] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[var(--brown)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pending ? 'Membuat...' : <><Check size={16} /> Buat & Jadikan Pemimpin</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
