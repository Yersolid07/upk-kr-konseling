// src/lib/external-content.ts
// Renungan/artikel dari sumber pihak ketiga (web).
// Sumber: OurManna (verse harian NIV) + Bible API (ayat + referensi).
//
// Dipakai oleh:
//   - route /api/external-content (endpoint)
//   - halaman /renungan (komponen server)
//
// DIBUAT sebagai module bersama agar halaman renungan TIDAK perlu
// self-fetch ke /api/external-content (call HTTP ekstra yang rentan
// gagal dan memicu error server-side). Halaman memanggil getExternalItems()
// langsung di server.

export interface ExternalItem {
  title: string
  text: string
  reference: string
  source: string
  url: string | null
}

const OURMANNA = 'https://beta.ourmanna.com/api/v1/get/?format=json'
const BIBLE_API = 'https://bible-api.com/'

async function fetchOurManna(): Promise<ExternalItem | null> {
  try {
    const res = await fetch(OURMANNA, { next: { revalidate: 21600 } })
    if (!res.ok) return null
    const data = await res.json()
    const v = data?.verse
    if (!v?.details?.text) return null
    return {
      title: 'Renungan Harian',
      text: v.details.text,
      reference: v.details.reference || '',
      source: 'OurManna (NIV)',
      url: v.details.verseurl || null,
    }
  } catch {
    return null
  }
}

async function fetchBibleVerse(ref: string): Promise<ExternalItem | null> {
  try {
    const res = await fetch(`${BIBLE_API}${encodeURIComponent(ref)}`, {
      next: { revalidate: 21600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.text) return null
    return {
      title: 'Ayat Hari Ini',
      text: data.text,
      reference: data.reference || ref,
      source: 'Bible API',
      url: null,
    }
  } catch {
    return null
  }
}

/** Ambil semua renungan pihak ketiga yang berhasil dimuat. */
export async function getExternalItems(): Promise<ExternalItem[]> {
  const [manna, john] = await Promise.all([
    fetchOurManna(),
    fetchBibleVerse('Yohanes 3:16'),
  ])
  const items: ExternalItem[] = []
  if (manna) items.push(manna)
  if (john) items.push(john)
  return items
}
