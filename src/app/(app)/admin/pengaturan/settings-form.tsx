// src/app/(app)/admin/pengaturan/settings-form.tsx
// Form pengaturan yang dibangun dari registry.
//
// Karena kontrol di sini dihasilkan dari `SETTINGS`, menambah pengaturan baru
// cukup satu baris di registry — tidak perlu menyentuh file ini. Itu juga
// sebabnya tidak ada kunci yang "ada di kode tapi tidak bisa diubah".

'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Save, Loader2, AlertTriangle, RotateCcw, Info } from 'lucide-react'
import { SETTINGS, SETTING_GROUPS, type SettingDef, type SettingGroup } from '@/lib/settings/registry'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { saveSettings } from './actions'

export function SettingsForm({ values }: { values: Record<string, unknown> }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...values }))
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const groups = useMemo(() => {
    const byGroup = new Map<SettingGroup, SettingDef[]>()
    for (const s of SETTINGS) {
      const list = byGroup.get(s.group) ?? []
      list.push(s)
      byGroup.set(s.group, list)
    }
    return Array.from(byGroup.entries())
  }, [])

  // Hanya kirim yang benar-benar berubah — audit jadi terbaca, dan pengaturan
  // yang tidak disentuh tidak tertulis ulang tanpa alasan.
  const changed = useMemo(() => {
    const out: Record<string, unknown> = {}
    for (const s of SETTINGS) {
      const now = draft[s.key]
      const was = values[s.key]
      if (JSON.stringify(now) !== JSON.stringify(was)) out[s.key] = now
    }
    return out
  }, [draft, values])

  const changedCount = Object.keys(changed).length

  // Pengaturan yang berbahaya bila salah — minta konfirmasi + alasan.
  const DANGEROUS = new Set(['maintenance_mode', 'registration_open', 'require_mfa_for_admins'])
  const dangerousTouched = Object.keys(changed).filter((k) => DANGEROUS.has(k))

  function set(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function reset() {
    setDraft({ ...values })
    toast.success('Perubahan dibatalkan.')
  }

  function submit(reason: string) {
    startTransition(async () => {
      const res = await saveSettings({ values: changed, reason: reason || undefined })
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        return
      }
      toast.success(`${changedCount} pengaturan tersimpan.`)
      router.refresh()
    })
  }

  function onSaveClick() {
    if (changedCount === 0) {
      toast('Tidak ada perubahan.', { icon: 'ℹ️' })
      return
    }
    if (dangerousTouched.length > 0) {
      setConfirmOpen(true)
      return
    }
    submit('')
  }

  return (
    <div className="space-y-5">
      {/* Bilah simpan yang menempel — admin bisa menyimpan dari posisi mana pun. */}
      <div className="sticky top-16 z-30 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--cream-dark)] bg-[var(--surface)]/95 backdrop-blur px-4 py-2.5">
        <span className="text-xs text-[var(--text-muted)] flex-1 min-w-[160px]">
          {changedCount === 0
            ? 'Belum ada perubahan.'
            : `${changedCount} pengaturan diubah, belum disimpan.`}
        </span>
        {changedCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:border-[var(--terra)]"
          >
            <RotateCcw size={13} /> Batalkan
          </button>
        )}
        <button
          type="button"
          disabled={pending || changedCount === 0}
          onClick={onSaveClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-1.5 text-xs font-semibold text-[var(--cream)] disabled:opacity-40"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Simpan
        </button>
      </div>

      {groups.map(([group, defs]) => (
        <section key={group} className="card-premium p-5">
          <h2 className="text-sm font-bold text-[var(--brown-dark)] mb-4">
            {SETTING_GROUPS[group]}
          </h2>
          <div className="space-y-4">
            {defs.map((def) => (
              <SettingField
                key={def.key}
                def={def}
                value={draft[def.key]}
                onChange={(v) => set(def.key, v)}
                isChanged={JSON.stringify(draft[def.key]) !== JSON.stringify(values[def.key])}
              />
            ))}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Ubah pengaturan berdampak luas?"
        description={`Kamu mengubah: ${dangerousTouched
          .map((k) => SETTINGS.find((s) => s.key === k)?.label ?? k)
          .join(', ')}. Perubahan ini memengaruhi seluruh situs.`}
        level="reason"
        confirmLabel="Simpan perubahan"
        onConfirm={async ({ reason }) => {
          submit(reason)
          return { ok: true }
        }}
      />
    </div>
  )
}

/** Satu baris pengaturan — kontrol dipilih dari jenis skema. */
function SettingField({
  def,
  value,
  onChange,
  isChanged,
}: {
  def: SettingDef
  value: unknown
  onChange: (v: unknown) => void
  isChanged: boolean
}) {
  const kind = describeSchema(def)

  return (
    <div
      className={`grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start pb-4 border-b border-[var(--cream)] last:border-0 last:pb-0 ${
        isChanged ? 'bg-amber-50/40 -mx-2 px-2 rounded-lg' : ''
      }`}
    >
      <div className="min-w-0">
        <label className="block text-sm font-semibold text-[var(--brown-dark)]">
          {def.label}
          {isChanged && (
            <span className="ml-2 text-[10px] font-bold uppercase text-amber-700">
              diubah
            </span>
          )}
        </label>
        {def.help && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed max-w-prose">
            {def.help}
          </p>
        )}
        {kind === 'text' && (
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">{def.key}</p>
        )}
      </div>

      <div className="sm:w-[300px] sm:shrink-0">
        {kind === 'bool' ? (
          <Toggle checked={Boolean(value)} onChange={onChange} label={def.label} />
        ) : kind === 'int' ? (
          <input
            type="number"
            className="form-input"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => {
              const n = e.target.value === '' ? undefined : Number(e.target.value)
              onChange(Number.isFinite(n as number) ? n : undefined)
            }}
          />
        ) : (
          <input
            type="text"
            className="form-input"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Baca jenis kontrol dari skema zod.
 * Memakai `safeParse` pada nilai contoh, bukan introspeksi internal zod —
 * cara itu stabil di berbagai versi zod.
 */
function describeSchema(def: SettingDef): 'bool' | 'int' | 'text' {
  const s = def.schema
  if (s.safeParse(true).success && !s.safeParse('x').success) return 'bool'
  if (s.safeParse(1).success && !s.safeParse('x').success) return 'int'
  return 'text'
}

/** Saklar on/off bergaya tombol — lebih jelas daripada checkbox kecil. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-stone-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/** Peringatan yang ditampilkan di atas form bila pengaturan kritis berubah. */
export function SettingsWarning({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>
        Ada {count} perubahan yang belum disimpan. Pengaturan berlaku untuk seluruh
        pengguna dan tercatat di jejak audit.
      </span>
    </div>
  )
}

export function SettingsNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[var(--cream-dark)] bg-[var(--cream)] px-4 py-3 text-xs text-[var(--text-2)]">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>
        Daftar pengaturan berasal dari <code className="font-mono">src/lib/settings/registry.ts</code>.
        Nilai divalidasi terhadap tipe dan batasnya sebelum disimpan — nilai di luar
        batas ditolak, bukan diterima diam-diam.
      </span>
    </div>
  )
}
