// src/app/(app)/admin/konten-situs/content-tabs.tsx
// Empat tab konten situs: Halaman, Banner, Resource, Ayat Harian (M10).
//
// Setiap tab memakai pola yang sama: daftar + tombol tambah + form di dialog.
// Keseragaman ini disengaja — admin berpindah antar tab, dan tiap tab tidak
// boleh menuntut cara kerja yang berbeda.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  FileText, Megaphone, Link2, BookOpen, Plus, Pencil, Trash2, X, Loader2,
  ExternalLink, Upload, CalendarDays,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  savePage, deletePage, saveBanner, deleteBanner,
  saveResource, deleteResource, saveVerse, deleteVerse, importVerses,
} from './actions'

type PageRow = {
  id: string; slug: string; title: string; title_en: string | null
  content: string; content_en: string | null; status: string
  sort_order: number; show_in_footer: boolean; updated_at: string
}
type BannerRow = {
  id: string; message: string; message_en: string | null; level: string
  starts_at: string; ends_at: string | null; target_role: string | null
  dismissible: boolean; is_active: boolean
}
type ResourceRow = {
  id: string; title: string; title_en: string | null; description: string | null
  description_en: string | null; url: string; category: string
  sort_order: number; is_active: boolean
}
type VerseRow = {
  id: string; verse_text: string; verse_ref: string
  verse_text_en: string | null; verse_ref_en: string | null; display_date: string | null
}

const TABS = [
  { key: 'pages', label: 'Halaman', icon: FileText },
  { key: 'banners', label: 'Banner', icon: Megaphone },
  { key: 'resources', label: 'Resource', icon: Link2 },
  { key: 'verses', label: 'Ayat Harian', icon: BookOpen },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ContentTabs({
  pages,
  banners,
  resources,
  verses,
  canManageVerses,
}: {
  pages: PageRow[]
  banners: BannerRow[]
  resources: ResourceRow[]
  verses: VerseRow[]
  canManageVerses: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('pages')
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
          Konten Situs
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Halaman statis, pengumuman, tautan bantuan, dan ayat harian — semuanya tanpa perlu deploy.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          const disabled = t.key === 'verses' && !canManageVerses
          return (
            <button
              key={t.key}
              onClick={() => !disabled && setTab(t.key)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                tab === t.key
                  ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                  : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'pages' && <PagesTab rows={pages} onChanged={refresh} />}
      {tab === 'banners' && <BannersTab rows={banners} onChanged={refresh} />}
      {tab === 'resources' && <ResourcesTab rows={resources} onChanged={refresh} />}
      {tab === 'verses' && canManageVerses && <VersesTab rows={verses} onChanged={refresh} />}
    </div>
  )
}

// ─────────────────────────── HALAMAN ───────────────────────────
function PagesTab({ rows, onChanged }: { rows: PageRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<PageRow | 'new' | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Halaman baru
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={FileText} text="Belum ada halaman. Halaman bawaan seperti /tentang dan /faq bisa dibuat di sini." />
      ) : (
        <div className="card-premium divide-y divide-[var(--cream)]">
          {rows.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--brown-dark)]">{p.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-[var(--cream-dark)] text-[var(--text-2)]'
                    }`}
                  >
                    {p.status === 'published' ? 'Terbit' : 'Draf'}
                  </span>
                  {p.show_in_footer && (
                    <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">
                      di footer
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  /{p.slug} · diperbarui {formatDate(p.updated_at)}
                </p>
              </div>
              <button
                onClick={() => setEditing(p)}
                className="rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
              >
                <Pencil size={12} className="inline mr-1" /> Ubah
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PageDialog
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}

function PageDialog({
  row,
  onClose,
  onSaved,
}: {
  row: PageRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await savePage({
      id: row?.id,
      slug: String(fd.get('slug') ?? ''),
      title: String(fd.get('title') ?? ''),
      titleEn: String(fd.get('titleEn') ?? ''),
      content: String(fd.get('content') ?? ''),
      contentEn: String(fd.get('contentEn') ?? ''),
      status: String(fd.get('status') ?? 'draft'),
      sortOrder: Number(fd.get('sortOrder') ?? 0),
      showInFooter: fd.get('showInFooter') === 'on',
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(row ? 'Halaman disimpan.' : 'Halaman dibuat.')
    onSaved()
  }

  return (
    <Dialog title={row ? `Ubah ${row.title}` : 'Halaman baru'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Judul</label>
            <input name="title" required defaultValue={row?.title ?? ''} className="form-input" maxLength={150} />
          </div>
          <div className="form-group">
            <label className="form-label">Slug</label>
            <input
              name="slug"
              required
              defaultValue={row?.slug ?? ''}
              className="form-input font-mono text-xs"
              placeholder="tentang"
              pattern="[a-z0-9-]+"
              maxLength={80}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Judul (EN)</label>
            <input name="titleEn" defaultValue={row?.title_en ?? ''} className="form-input" maxLength={150} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="status" defaultValue={row?.status ?? 'draft'} className="form-input">
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Isi (markdown)</label>
          <textarea
            name="content"
            rows={8}
            defaultValue={row?.content ?? ''}
            className="form-input font-mono text-xs"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Isi (EN, opsional)</label>
          <textarea
            name="contentEn"
            rows={4}
            defaultValue={row?.content_en ?? ''}
            className="form-input font-mono text-xs"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="form-group flex-1">
            <label className="form-label">Urutan</label>
            <input name="sortOrder" type="number" min={0} max={999} defaultValue={row?.sort_order ?? 0} className="form-input" />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)] mt-5">
            <input type="checkbox" name="showInFooter" defaultChecked={row?.show_in_footer ?? false} />
            Tampilkan di footer
          </label>
        </div>

        <DialogActions busy={busy} onClose={onClose} label={row ? 'Simpan' : 'Buat halaman'} />
      </form>
    </Dialog>
  )
}

// ─────────────────────────── BANNER ───────────────────────────
function BannersTab({ rows, onChanged }: { rows: BannerRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<BannerRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BannerRow | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Banner baru
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Megaphone} text="Belum ada banner. Banner tampil di atas semua halaman selama masa berlakunya." />
      ) : (
        <div className="space-y-2">
          {rows.map((b) => {
            const active =
              b.is_active &&
              new Date(b.starts_at) <= new Date() &&
              (!b.ends_at || new Date(b.ends_at) > new Date())
            return (
              <div key={b.id} className="card-premium p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          b.level === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : b.level === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {b.level}
                      </span>
                      {active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          tayang
                        </span>
                      ) : (
                        <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">
                          tidak tayang
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--brown-dark)]">{b.message}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {formatDate(b.starts_at)} — {b.ends_at ? formatDate(b.ends_at) : 'tanpa batas'}
                      {b.target_role ? ` · hanya ${b.target_role}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditing(b)}
                      className="rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => setDeleting(b)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <BannerDialog
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}

      {deleting && (
        <ReasonDialog
          title="Hapus banner"
          hint="Banner hilang dari semua halaman. Bila hanya ingin menghentikannya sementara, matikan saja centang aktif."
          minLength={5}
          confirmLabel="Hapus banner"
          onClose={() => setDeleting(null)}
          onConfirm={async (reason) => {
            const res = await deleteBanner({ id: deleting.id, reason })
            if ('error' in res) return toast.error(res.error)
            toast.success('Banner dihapus.')
            setDeleting(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}

function BannerDialog({
  row,
  onClose,
  onSaved,
}: {
  row: BannerRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await saveBanner({
      id: row?.id,
      message: String(fd.get('message') ?? ''),
      messageEn: String(fd.get('messageEn') ?? ''),
      level: String(fd.get('level') ?? 'info'),
      startsAt: String(fd.get('startsAt') ?? ''),
      endsAt: String(fd.get('endsAt') ?? ''),
      targetRole: String(fd.get('targetRole') ?? ''),
      dismissible: fd.get('dismissible') === 'on',
      isActive: fd.get('isActive') === 'on',
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(row ? 'Banner disimpan.' : 'Banner dibuat.')
    onSaved()
  }

  // datetime-local butuh format YYYY-MM-DDTHH:mm
  const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : '')

  return (
    <Dialog title={row ? 'Ubah banner' : 'Banner baru'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="form-group">
          <label className="form-label">Pesan</label>
          <textarea
            name="message"
            required
            rows={2}
            defaultValue={row?.message ?? ''}
            className="form-input"
            maxLength={300}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Pesan (EN, opsional)</label>
          <input name="messageEn" defaultValue={row?.message_en ?? ''} className="form-input" maxLength={300} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="form-group">
            <label className="form-label">Tingkat</label>
            <select name="level" defaultValue={row?.level ?? 'info'} className="form-input">
              <option value="info">Info</option>
              <option value="warning">Peringatan</option>
              <option value="critical">Kritis</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mulai</label>
            <input name="startsAt" type="datetime-local" defaultValue={toLocal(row?.starts_at ?? null)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Berakhir</label>
            <input name="endsAt" type="datetime-local" defaultValue={toLocal(row?.ends_at)} className="form-input" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Sasaran peran (opsional)</label>
          <select name="targetRole" defaultValue={row?.target_role ?? ''} className="form-input">
            <option value="">Semua orang</option>
            <option value="member">Anggota</option>
            <option value="konselor">Konselor</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
            <input type="checkbox" name="dismissible" defaultChecked={row?.dismissible ?? true} />
            Bisa ditutup pembaca
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
            <input type="checkbox" name="isActive" defaultChecked={row?.is_active ?? true} />
            Aktif
          </label>
        </div>

        <DialogActions busy={busy} onClose={onClose} label={row ? 'Simpan' : 'Buat banner'} />
      </form>
    </Dialog>
  )
}

// ─────────────────────────── RESOURCE ───────────────────────────
function ResourcesTab({ rows, onChanged }: { rows: ResourceRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<ResourceRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ResourceRow | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Resource baru
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Link2} text="Belum ada resource. Daftar ini tampil di halaman Resource Kesehatan." />
      ) : (
        <div className="card-premium divide-y divide-[var(--cream)]">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--brown-dark)]">{r.title}</span>
                  <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">
                    {r.category}
                  </span>
                  {!r.is_active && (
                    <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">
                      nonaktif
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{r.description}</p>
                )}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--terra)] hover:underline mt-0.5"
                >
                  <ExternalLink size={10} /> {r.url}
                </a>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditing(r)}
                  className="rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
                >
                  Ubah
                </button>
                <button
                  onClick={() => setDeleting(r)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ResourceDialog
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}

      {deleting && (
        <ReasonDialog
          title="Hapus resource"
          hint="Tautan ini hilang dari halaman Resource Kesehatan. Bila hanya ingin menyembunyikannya sementara, matikan centang aktif."
          minLength={5}
          confirmLabel="Hapus resource"
          onClose={() => setDeleting(null)}
          onConfirm={async (reason) => {
            const res = await deleteResource({ id: deleting.id, reason })
            if ('error' in res) return toast.error(res.error)
            toast.success('Resource dihapus.')
            setDeleting(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}

function ResourceDialog({
  row,
  onClose,
  onSaved,
}: {
  row: ResourceRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await saveResource({
      id: row?.id,
      title: String(fd.get('title') ?? ''),
      titleEn: String(fd.get('titleEn') ?? ''),
      description: String(fd.get('description') ?? ''),
      descriptionEn: String(fd.get('descriptionEn') ?? ''),
      url: String(fd.get('url') ?? ''),
      category: String(fd.get('category') ?? 'umum'),
      sortOrder: Number(fd.get('sortOrder') ?? 0),
      isActive: fd.get('isActive') === 'on',
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(row ? 'Resource disimpan.' : 'Resource dibuat.')
    onSaved()
  }

  return (
    <Dialog title={row ? `Ubah ${row.title}` : 'Resource baru'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="form-group">
          <label className="form-label">Judul</label>
          <input name="title" required defaultValue={row?.title ?? ''} className="form-input" maxLength={150} />
        </div>

        <div className="form-group">
          <label className="form-label">URL</label>
          <input
            name="url"
            required
            type="url"
            defaultValue={row?.url ?? ''}
            className="form-input font-mono text-xs"
            placeholder="https://..."
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Harus lengkap dengan https:// — tautan tanpa protokol tidak bisa dibuka dengan aman.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={row?.description ?? ''}
            className="form-input"
            maxLength={500}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <input name="category" defaultValue={row?.category ?? 'umum'} className="form-input" maxLength={60} />
          </div>
          <div className="form-group">
            <label className="form-label">Urutan</label>
            <input name="sortOrder" type="number" min={0} max={999} defaultValue={row?.sort_order ?? 0} className="form-input" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
          <input type="checkbox" name="isActive" defaultChecked={row?.is_active ?? true} />
          Tampilkan di halaman publik
        </label>

        <DialogActions busy={busy} onClose={onClose} label={row ? 'Simpan' : 'Buat resource'} />
      </form>
    </Dialog>
  )
}

// ─────────────────────────── AYAT HARIAN ───────────────────────────
function VersesTab({ rows, onChanged }: { rows: VerseRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<VerseRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<VerseRow | null>(null)
  const [importing, setImporting] = useState(false)

  // Pratinjau kalender: 14 hari ke depan, menandai hari yang belum punya ayat.
  const today = new Date()
  const next14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    return { key, date: d, verse: rows.find((r) => r.display_date === key) ?? null }
  })
  const missingCount = next14.filter((d) => !d.verse).length

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          onClick={() => setImporting(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)]"
        >
          <Upload size={14} /> Impor CSV
        </button>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Ayat baru
        </button>
      </div>

      <div className="card-premium p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--brown-dark)]">
          <CalendarDays size={13} /> 14 hari ke depan
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {missingCount === 0
            ? 'Semua hari sudah punya ayat.'
            : `${missingCount} hari belum punya ayat — akan memakai ayat terakhir sebelumnya sebagai cadangan.`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {next14.map((d) => (
            <span
              key={d.key}
              title={d.verse ? d.verse.verse_ref : 'belum ada ayat'}
              className={`rounded px-1.5 py-1 text-[10px] font-mono ${
                d.verse
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {d.key.slice(5)}
            </span>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} text="Belum ada ayat. Tambah satu per satu, atau impor banyak sekaligus lewat CSV." />
      ) : (
        <div className="card-premium divide-y divide-[var(--cream)]">
          {rows.map((v) => (
            <div key={v.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-xs text-[var(--brown-dark)]">{v.verse_ref}</span>
                  {v.display_date ? (
                    <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] font-mono text-[var(--text-2)]">
                      {v.display_date}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                      tanpa tanggal
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text)] mt-0.5 line-clamp-2">{v.verse_text}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditing(v)}
                  className="rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
                >
                  Ubah
                </button>
                <button
                  onClick={() => setDeleting(v)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <VerseDialog
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}

      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false)
            onChanged()
          }}
        />
      )}

      {deleting && (
        <ReasonDialog
          title="Hapus ayat"
          hint="Ayat ini hilang dari rotasi. Hari yang kehilangan ayat akan memakai ayat sebelumnya sebagai cadangan."
          minLength={5}
          confirmLabel="Hapus ayat"
          onClose={() => setDeleting(null)}
          onConfirm={async (reason) => {
            const res = await deleteVerse({ id: deleting.id, reason })
            if ('error' in res) return toast.error(res.error)
            toast.success('Ayat dihapus.')
            setDeleting(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}

function VerseDialog({
  row,
  onClose,
  onSaved,
}: {
  row: VerseRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await saveVerse({
      id: row?.id,
      verseText: String(fd.get('verseText') ?? ''),
      verseRef: String(fd.get('verseRef') ?? ''),
      verseTextEn: String(fd.get('verseTextEn') ?? ''),
      verseRefEn: String(fd.get('verseRefEn') ?? ''),
      displayDate: String(fd.get('displayDate') ?? ''),
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(row ? 'Ayat disimpan.' : 'Ayat dibuat.')
    onSaved()
  }

  return (
    <Dialog title={row ? 'Ubah ayat' : 'Ayat baru'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="form-group">
          <label className="form-label">Teks ayat</label>
          <textarea
            name="verseText"
            required
            rows={3}
            defaultValue={row?.verse_text ?? ''}
            className="form-input"
            maxLength={1000}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Referensi</label>
            <input name="verseRef" required defaultValue={row?.verse_ref ?? ''} className="form-input" placeholder="Yeremia 29:11" maxLength={80} />
          </div>
          <div className="form-group">
            <label className="form-label">Tanggal tayang</label>
            <input name="displayDate" type="date" defaultValue={row?.display_date ?? ''} className="form-input" />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Kosongkan bila ayat dipakai sebagai cadangan.
            </p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Teks (EN, opsional)</label>
          <textarea
            name="verseTextEn"
            rows={2}
            defaultValue={row?.verse_text_en ?? ''}
            className="form-input"
            maxLength={1000}
            style={{ resize: 'vertical' }}
          />
        </div>

        <DialogActions busy={busy} onClose={onClose} label={row ? 'Simpan' : 'Buat ayat'} />
      </form>
    </Dialog>
  )
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [csv, setCsv] = useState('')
  const [result, setResult] = useState<{ inserted: number; failures: { line: number; error: string }[] } | null>(null)

  async function run() {
    setBusy(true)
    const res = await importVerses(csv)
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    setResult({ inserted: res.inserted, failures: res.failures })
    if (res.inserted > 0) toast.success(`${res.inserted} ayat diimpor.`)
  }

  return (
    <Dialog title="Impor ayat dari CSV" onClose={onClose} busy={busy}>
      <div className="space-y-3">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Format: <code className="rounded bg-[var(--cream)] px-1">verse_text,verse_ref,display_date</code>
          <br />
          Tanggal opsional (YYYY-MM-DD). Baris pertama boleh berupa judul kolom.
        </p>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          className="form-input font-mono text-[11px]"
          placeholder={`"Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu",Yeremia 29:11,2026-11-01\n"Segala perkara dapat kutanggung di dalam Dia",Filipi 4:13,2026-11-02`}
          style={{ resize: 'vertical' }}
        />

        {result && (
          <div className="rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/50 p-3">
            <p className="text-xs font-semibold text-[var(--brown-dark)]">
              {result.inserted} ayat berhasil diimpor.
            </p>
            {result.failures.length > 0 && (
              <>
                <p className="text-[11px] text-red-700 mt-1">
                  {result.failures.length} baris gagal:
                </p>
                <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.failures.slice(0, 20).map((f) => (
                    <li key={f.line} className="text-[11px] text-red-700">
                      Baris {f.line}: {f.error}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
          >
            Tutup
          </button>
          {result ? (
            <button
              onClick={onDone}
              className="rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
            >
              Selesai
            </button>
          ) : (
            <button
              onClick={run}
              disabled={busy || csv.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              Impor
            </button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

// ─────────────────────────── BAGIAN BERSAMA ───────────────────────────
function Dialog({
  title,
  onClose,
  busy,
  children,
}: {
  title: string
  onClose: () => void
  busy: boolean
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm">{title}</h2>
            <button onClick={onClose} aria-label="Tutup">
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

function DialogActions({
  busy,
  onClose,
  label,
}: {
  busy: boolean
  onClose: () => void
  label: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
      >
        {busy && <Loader2 size={13} className="animate-spin" />}
        {label}
      </button>
    </div>
  )
}

function ReasonDialog({
  title,
  hint,
  minLength,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string
  hint: string
  minLength: number
  confirmLabel: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<unknown>
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    if (note.trim().length < minLength) {
      toast.error(`Alasan minimal ${minLength} karakter.`)
      return
    }
    setBusy(true)
    await onConfirm(note.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm">{title}</h2>
            <button onClick={onClose} aria-label="Tutup">
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{hint}</p>
            <div className="form-group">
              <label className="form-label">Alasan (wajib, min. {minLength} karakter)</label>
              <textarea
                className="form-input"
                rows={3}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={run}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <div className="card-premium px-6 py-14 text-center">
      <Icon size={26} className="mx-auto text-[var(--text-muted)]" />
      <p className="mt-3 text-sm text-[var(--text-muted)] max-w-md mx-auto">{text}</p>
    </div>
  )
}
