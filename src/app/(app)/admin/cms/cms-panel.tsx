// src/app/(app)/admin/cms/cms-panel.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  Settings, Phone, FileText, Save, Plus, Trash2, Loader2,
  ChevronDown, Check, AlertTriangle, Info, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { saveSetting, saveHotline, deleteHotline, saveLegalDoc } from './actions'
import type { HotlineContact, LegalDocument, SiteSetting } from '@/types/database'

type Tab = 'settings' | 'hotlines' | 'legal'

interface Props {
  settings: SiteSetting[]
  hotlines: HotlineContact[]
  documents: LegalDocument[]
}

// Label ramah untuk kunci pengaturan yang dikenal.
const SETTING_LABELS: Record<string, string> = {
  site_name: 'Nama Situs',
  site_tagline: 'Tagline',
  article_requires_approval: 'Artikel wajib disetujui admin',
  prayer_requires_approval: 'Permintaan doa wajib disetujui admin',
  registration_open: 'Pendaftaran anggota dibuka',
  konselor_recruiting: 'Menerima pengajuan konselor',
  crisis_notice: 'Peringatan krisis',
}

export function CmsPanel({ settings, hotlines, documents }: Props) {
  const [tab, setTab] = useState<Tab>('settings')
  const [pending, startTransition] = useTransition()

  const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'settings', label: 'Pengaturan Situs', icon: Settings },
    { id: 'hotlines', label: 'Nomor Hotline', icon: Phone },
    { id: 'legal', label: 'Dokumen Legal', icon: FileText },
  ]

  function run(fn: (fd: FormData) => Promise<unknown>, fd: FormData, okMsg?: string) {
    startTransition(async () => {
      const res = (await fn(fd)) as { error?: string; success?: string } | undefined
      if (res?.error) toast.error(res.error)
      else toast.success(res?.success ?? okMsg ?? 'Tersimpan.')
    })
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <header className="space-y-2">
        <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
          Pengaturan Situs (CMS)
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Kelola identitas situs, nomor darurat, dan dokumen legal. Perubahan langsung
          berlaku setelah disimpan. Semua perubahan tercatat di log audit.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
                tab === t.id
                  ? 'bg-[var(--terra)] text-white shadow-lg shadow-[var(--terra)]/20'
                  : 'bg-white text-[var(--brown)] border border-[var(--cream-dark)] hover:border-[var(--terra)]'
              )}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ── PENGATURAN SITUS ── */}
      {tab === 'settings' && (
        <div className="space-y-4">
          {settings.length === 0 && (
            <EmptyState text="Belum ada pengaturan. Jalankan supabase/cms-rbac.sql untuk memuat nilai default." />
          )}
          {settings.map((s) => {
            const isBool = typeof s.value?.value === 'boolean'
            const text = isBool
              ? String(s.value.value)
              : typeof s.value?.value === 'string'
                ? String(s.value.value)
                : typeof s.value?.id === 'string'
                  ? String(s.value.id)
                  : JSON.stringify(s.value ?? {})
            const label = SETTING_LABELS[s.key] ?? s.key

            return (
              <form
                key={s.key}
                action={(fd) => run(saveSetting, fd)}
                className="card-premium p-5 sm:p-6 space-y-4"
              >
                <input type="hidden" name="key" value={s.key} />
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="font-bold text-[var(--brown-dark)] text-sm">{label}</h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">{s.key}</p>
                  </div>
                  {s.description && (
                    <p className="text-[11px] text-[var(--text-muted)] max-w-md">{s.description}</p>
                  )}
                </div>

                {isBool ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="value"
                      value="true"
                      defaultChecked={s.value.value === true}
                      className="w-4 h-4 accent-[var(--terra)]"
                    />
                    <span className="text-sm text-[var(--brown-dark)]">Aktifkan</span>
                  </label>
                ) : (
                  <textarea
                    name="value"
                    defaultValue={text}
                    rows={text.length > 80 ? 3 : 1}
                    className="form-input text-sm resize-none"
                  />
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--terra)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Simpan
                </button>
              </form>
            )
          })}
        </div>
      )}

      {/* ── NOMOR HOTLINE ── */}
      {tab === 'hotlines' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/25">
            <AlertTriangle size={18} className="text-[var(--gold)] shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-[var(--brown-dark)] leading-relaxed">
              Nomor di halaman <strong>Hotline Darurat</strong> dibaca langsung dari daftar ini.
              Pastikan setiap nomor sudah diverifikasi — nomor yang salah bisa membahayakan
              pengguna yang sedang dalam krisis.
            </p>
          </div>

          {hotlines.map((h) => (
            <form key={h.id} action={(fd) => run(saveHotline, fd)} className="card-premium p-5 sm:p-6 space-y-4">
              <input type="hidden" name="id" value={h.id} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Layanan">
                  <input name="name" defaultValue={h.name} required className="form-input text-sm" />
                </Field>
                <Field label="Nomor (untuk panggilan)">
                  <input name="number" defaultValue={h.number} required className="form-input text-sm font-mono" />
                </Field>
                <Field label="Teks Tampil">
                  <input name="display" defaultValue={h.display ?? ''} className="form-input text-sm" />
                </Field>
                <Field label="Tipe">
                  <select name="type" defaultValue={h.type} className="form-input text-sm">
                    <option value="phone">Telepon</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="url">Tautan</option>
                  </select>
                </Field>
                <Field label="Badge (mis. 24 jam)">
                  <input name="note" defaultValue={h.note ?? ''} className="form-input text-sm" />
                </Field>
                <Field label="Urutan">
                  <input name="sort_order" type="number" defaultValue={h.sort_order} className="form-input text-sm" />
                </Field>
              </div>
              <Field label="Keterangan">
                <textarea name="description" defaultValue={h.description ?? ''} rows={2} className="form-input text-sm resize-none" />
              </Field>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_active" defaultChecked={h.is_active} className="w-4 h-4 accent-[var(--terra)]" />
                  <span className="text-sm text-[var(--brown-dark)]">Tampilkan di halaman publik</span>
                </label>
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--terra)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
                    {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Simpan
                  </button>
                </div>
              </div>
            </form>
          ))}

          {/* Hapus dipisah agar tidak ikut ter-submit bersama form simpan */}
          {hotlines.length > 0 && (
            <div className="card-premium p-5 sm:p-6 space-y-3">
              <h3 className="font-bold text-[var(--brown-dark)] text-sm">Hapus Nomor</h3>
              <div className="flex flex-wrap gap-2">
                {hotlines.map((h) => (
                  <form key={h.id} action={(fd) => run(deleteHotline, fd)}>
                    <input type="hidden" name="id" value={h.id} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={12} /> {h.name}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          <NewHotlineForm onSubmit={(fd) => run(saveHotline, fd)} pending={pending} />
        </div>
      )}

      {/* ── DOKUMEN LEGAL ── */}
      {tab === 'legal' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--sage)]/10 border border-[var(--sage)]/20">
            <Info size={18} className="text-[var(--sage)] shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-[var(--brown-dark)] leading-relaxed">
              Isi dokumen memakai format <strong>Markdown</strong>. Nomor versi naik otomatis
              setiap kali isi berubah, sehingga pengguna bisa diberi tahu ada pembaruan.
            </p>
          </div>

          {documents.length === 0 && (
            <EmptyState text="Belum ada dokumen. Jalankan supabase/cms-rbac.sql untuk memuat draf awal." />
          )}

          {documents.map((d) => (
            <form key={d.slug} action={(fd) => run(saveLegalDoc, fd)} className="card-premium p-5 sm:p-6 space-y-4">
              <input type="hidden" name="slug" value={d.slug} />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">/{d.slug}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Versi {d.version} · diperbarui {new Date(d.updated_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <a
                  href={`/legal/${d.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--terra)] hover:underline"
                >
                  <Eye size={12} /> Lihat halaman
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Judul">
                  <input name="title" defaultValue={d.title} required className="form-input text-sm" />
                </Field>
                <Field label="Tanggal Berlaku">
                  <input
                    name="effective_date"
                    type="date"
                    defaultValue={d.effective_date ?? ''}
                    className="form-input text-sm"
                  />
                </Field>
              </div>

              <Field label="Ringkasan">
                <input name="summary" defaultValue={d.summary ?? ''} className="form-input text-sm" />
              </Field>

              <Field label="Isi (Markdown)">
                <textarea
                  name="content"
                  defaultValue={d.content}
                  rows={14}
                  required
                  className="form-input text-sm leading-relaxed font-mono"
                />
              </Field>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_published" defaultChecked={d.is_published} className="w-4 h-4 accent-[var(--terra)]" />
                  <span className="text-sm text-[var(--brown-dark)]">Terbitkan</span>
                </label>
                <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--terra)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
                  {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Simpan Dokumen
                </button>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label text-[11px]">{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card-premium p-8 text-center text-sm text-[var(--text-muted)]">{text}</div>
  )
}

function NewHotlineForm({
  onSubmit,
  pending,
}: {
  onSubmit: (fd: FormData) => void
  pending: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card-premium p-5 sm:p-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 font-bold text-[var(--brown-dark)] text-sm w-full"
      >
        <Plus size={16} className="text-[var(--terra)]" />
        Tambah Nomor Baru
        <ChevronDown size={15} className={cn('ml-auto transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <form action={onSubmit} className="space-y-4 mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Layanan">
              <input name="name" required className="form-input text-sm" placeholder="mis. Klinik Kampus" />
            </Field>
            <Field label="Nomor">
              <input name="number" required className="form-input text-sm font-mono" placeholder="0812..." />
            </Field>
            <Field label="Teks Tampil">
              <input name="display" className="form-input text-sm" placeholder="0812 3456 7890" />
            </Field>
            <Field label="Tipe">
              <select name="type" className="form-input text-sm">
                <option value="phone">Telepon</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="url">Tautan</option>
              </select>
            </Field>
            <Field label="Badge">
              <input name="note" className="form-input text-sm" placeholder="24 jam" />
            </Field>
            <Field label="Urutan">
              <input name="sort_order" type="number" defaultValue={99} className="form-input text-sm" />
            </Field>
          </div>
          <Field label="Keterangan">
            <textarea name="description" rows={2} className="form-input text-sm resize-none" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked className="w-4 h-4 accent-[var(--terra)]" />
            <span className="text-sm text-[var(--brown-dark)]">Langsung tampilkan</span>
          </label>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--sage)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Tambahkan
          </button>
        </form>
      )}
    </div>
  )
}
