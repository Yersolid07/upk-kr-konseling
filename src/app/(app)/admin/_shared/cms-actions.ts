// src/app/(app)/admin/_shared/actions.ts
'use server'

// Server actions untuk panel CMS. Semua aksi di sini HANYA untuk super_admin
// (pengaturan situs, nomor hotline, dokumen legal). Guard dijalankan di server —
// menyembunyikan menu di UI tidak cukup.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap, guarded } from '@/lib/auth-guard'
import type { HotlineContact } from '@/types/database'

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

// ─── Pengaturan situs ───

export async function saveSetting(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireCap('manageSettings')
    const key = str(formData, 'key')
    const raw = str(formData, 'value')
    if (!key) return { error: 'Kunci pengaturan wajib diisi.' }

    // Nilai disimpan sebagai JSONB. Kalau yang diisi bukan JSON valid, simpan
    // sebagai objek { value: "<teks>" } — kolomnya bertipe JSONB dan nilai
    // skalar telanjang akan ditolak.
    let value: Record<string, unknown>
    try {
      const parsed = JSON.parse(raw)
      value = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { value: parsed }
    } catch {
      value = { value: raw }
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key, value, updated_by: ctx.userId, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

    if (error) return { error: `Gagal menyimpan: ${error.message}` }

    await supabase.rpc('log_audit', {
      p_action: 'settings_change',
      p_entity: 'site_settings',
      p_entity_id: key,
      p_detail: { value },
    })

    revalidatePath('/admin/cms')
    revalidatePath('/')
    return { success: `Pengaturan "${key}" disimpan.` }
  })
}

// ─── Nomor hotline ───

export async function saveHotline(formData: FormData) {
  return guarded(async () => {
    await requireCap('manageHotlines')

    const id = str(formData, 'id')
    const rawType = str(formData, 'type')
    const payload = {
      name: str(formData, 'name'),
      description: str(formData, 'description') || null,
      number: str(formData, 'number'),
      display: str(formData, 'display') || str(formData, 'number'),
      // Divalidasi ke union yang dikenal skema; nilai asing jatuh ke 'phone'.
      type: (rawType === 'whatsapp' || rawType === 'url' ? rawType : 'phone') as HotlineContact['type'],
      note: str(formData, 'note') || null,
      sort_order: Number(str(formData, 'sort_order')) || 0,
      is_active: str(formData, 'is_active') === 'on',
      updated_at: new Date().toISOString(),
    }

    if (!payload.name || !payload.number) {
      return { error: 'Nama dan nomor wajib diisi.' }
    }

    const supabase = createClient()
    const { error } = id
      ? await supabase.from('hotline_contacts').update(payload).eq('id', id)
      : await supabase.from('hotline_contacts').insert(payload)

    if (error) return { error: `Gagal menyimpan: ${error.message}` }

    await supabase.rpc('log_audit', {
      p_action: id ? 'update' : 'create',
      p_entity: 'hotline_contacts',
      p_entity_id: id || payload.number,
      p_detail: { name: payload.name },
    })

    revalidatePath('/admin/cms')
    revalidatePath('/hotline')
    return { success: id ? 'Nomor hotline diperbarui.' : 'Nomor hotline ditambahkan.' }
  })
}

export async function deleteHotline(formData: FormData) {
  return guarded(async () => {
    await requireCap('manageHotlines')
    const id = str(formData, 'id')
    if (!id) return { error: 'ID tidak ditemukan.' }

    const supabase = createClient()
    const { error } = await supabase.from('hotline_contacts').delete().eq('id', id)
    if (error) return { error: `Gagal menghapus: ${error.message}` }

    await supabase.rpc('log_audit', {
      p_action: 'delete',
      p_entity: 'hotline_contacts',
      p_entity_id: id,
      p_detail: {},
    })

    revalidatePath('/admin/cms')
    revalidatePath('/hotline')
    return { success: 'Nomor hotline dihapus.' }
  })
}

// ─── Dokumen legal (Syarat & Ketentuan, Privasi, Panduan Konselor) ───

export async function saveLegalDoc(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireCap('manageLegal')

    const slug = str(formData, 'slug')
    const title = str(formData, 'title')
    const content = String(formData.get('content') ?? '')

    if (!slug || !title || !content.trim()) {
      return { error: 'Judul dan isi dokumen wajib diisi.' }
    }

    const supabase = createClient()

    // Naikkan versi setiap kali isi berubah — dipakai untuk memberi tahu pengguna.
    const { data: existing } = await supabase
      .from('legal_documents')
      .select('version, content')
      .eq('slug', slug)
      .maybeSingle()

    const prev = existing as { version: number; content: string } | null
    const version = prev && prev.content !== content ? (prev.version ?? 1) + 1 : (prev?.version ?? 1)

    const { error } = await supabase.from('legal_documents').upsert(
      {
        slug,
        title,
        summary: str(formData, 'summary') || null,
        content,
        version,
        effective_date: str(formData, 'effective_date') || new Date().toISOString().slice(0, 10),
        is_published: str(formData, 'is_published') === 'on',
        updated_by: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )

    if (error) return { error: `Gagal menyimpan: ${error.message}` }

    await supabase.rpc('log_audit', {
      p_action: 'update',
      p_entity: 'legal_documents',
      p_entity_id: slug,
      p_detail: { version },
    })

    revalidatePath('/admin/cms')
    revalidatePath(`/legal/${slug}`)
    revalidatePath('/terms')
    revalidatePath('/privacy')
    return { success: `Dokumen "${title}" disimpan (versi ${version}).` }
  })
}
