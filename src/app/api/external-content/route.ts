// src/app/api/external-content/route.ts
// Renungan/artikel dari sumber pihak ketiga (web).
// Sumber: OurManna (verse harian NIV) + Bible API (ayat + referensi).
// Cache di server (revalidate 6 jam) supaya tidak pukul API setiap request.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const OURMANNA = 'https://beta.ourmanna.com/api/v1/get/?format=json'
const BIBLE_API = 'https://bible-api.com/'

interface ExternalItem {
  title: string
  text: string
  reference: string
  source: string
  url: string | null
}

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

export async function GET() {
  const [manna, john] = await Promise.all([
    fetchOurManna(),
    fetchBibleVerse('Yohanes 3:16'),
  ])

  const items: ExternalItem[] = []
  if (manna) items.push(manna)
  if (john) items.push(john)

  return NextResponse.json({
    items,
    cached: true,
    revalidate_seconds: 21600,
  })
}
