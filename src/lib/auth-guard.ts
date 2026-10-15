// src/lib/auth-guard.ts
// Guard server-side yang dipakai oleh Server Actions dan Route Handlers.
//
// Kenapa file terpisah dari rbac.ts: rbac.ts murni (tanpa I/O) sehingga aman
// diimpor komponen klien; file ini menyentuh cookie/session jadi hanya boleh
// dipakai di server.

import { createClient } from '@/lib/supabase/server'
import {
  AuthorizationError,
  hasMinRole,
  can,
  type Capability,
} from '@/lib/rbac'
import type { Profile, UserRole } from '@/types/database'

export interface AuthContext {
  userId: string
  email: string | null
  role: UserRole
  profile: Profile
}

/** Ambil konteks pengguna yang sudah login, atau null. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const p = profile as Profile
  return { userId: user.id, email: user.email ?? null, role: p.role, profile: p }
}

/**
 * Wajib login. Melempar AuthorizationError bila belum — pemanggil menangkapnya
 * dan mengembalikan { error } agar tidak membocorkan detail ke klien.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) throw new AuthorizationError('Anda harus masuk terlebih dahulu.')
  return ctx
}

/** Wajib login DAN minimal selevel `min`. */
export async function requireMinRole(min: UserRole): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!hasMinRole(ctx.role, min)) throw new AuthorizationError()
  return ctx
}

/** Wajib login DAN punya capability. */
export async function requireCap(capability: Capability): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!can(ctx.role, capability)) throw new AuthorizationError()
  return ctx
}

/**
 * Bungkus Server Action: ubah AuthorizationError jadi { error } yang ramah,
 * dan error tak terduga jadi pesan generik + log server.
 */
export async function guarded<T>(
  fn: () => Promise<T>,
  fallbackMessage = 'Terjadi kesalahan. Silakan coba lagi.'
): Promise<T | { error: string }> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message }
    }
    console.error('[server-action]', err)
    return { error: fallbackMessage }
  }
}
