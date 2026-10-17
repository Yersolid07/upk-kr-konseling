// src/lib/fonnte.ts
//
// Pengiriman WhatsApp lewat Fonnte.
//
// Token dibaca dari pengaturan situs lebih dulu, baru variabel lingkungan.
// Alasannya bukan selera: token di env tidak bisa diubah tanpa deploy ulang,
// sehingga bila token dicabut Fonnte, SOS berhenti berfungsi sampai ada yang
// membuka Vercel. Pengurus bisa memutarnya sendiri lewat panel pengaturan.
//
// `sendWhatsApp` TIDAK PERNAH melempar: pemanggilnya adalah alur SOS, dan
// kegagalan mengirim WhatsApp tidak boleh menggagalkan pembuatan sesi darurat
// yang sudah tersimpan.

import { getSetting } from '@/lib/settings/get'

async function resolveToken(): Promise<string | null> {
  try {
    const fromSettings = await getSetting('fonnte_token')
    if (typeof fromSettings === 'string' && fromSettings.trim()) return fromSettings.trim()
  } catch {
    // Pengaturan tidak terbaca: jatuh ke env.
  }
  const fromEnv = process.env.FONNTE_TOKEN?.trim()
  return fromEnv || null
}

export async function sendWhatsApp(target: string, message: string) {
  const token = await resolveToken()

  if (!token) {
    console.error('Fonnte token belum dikonfigurasi (pengaturan situs maupun env).')
    return { success: false, error: 'Configuration missing' }
  }

  // Nomor kosong/placeholder bukan kegagalan yang perlu dilaporkan ke
  // pengguna, tetapi jangan sampai menembak API dengan target sampah.
  const digits = target.replace(/[^0-9]/g, '')
  if (digits.length < 8) {
    return { success: false, error: 'Nomor tujuan belum diatur' }
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: new URLSearchParams({ target: digits, message }),
      signal: AbortSignal.timeout(10_000),
    })

    const result = await response.json()

    if (result.status) {
      return { success: true, data: result }
    }
    console.error('Fonnte API error:', result.reason || 'Unknown error')
    return { success: false, error: result.reason || 'Failed to send' }
  } catch (error) {
    console.error('Error calling Fonnte API:', error)
    return { success: false, error: 'Connection failed' }
  }
}
