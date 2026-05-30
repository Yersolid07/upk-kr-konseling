// src/app/api/admin/seed/route.ts
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const adminClient = createAdminClient()

  try {
    // 1. Seed Categories if empty
    const { data: categories } = await (adminClient.from('thread_categories') as any).select('id')
    
    if (!categories || categories.length === 0) {
      const { error: catError } = await (adminClient.from('thread_categories') as any).insert([
        { name: 'Kesaksian', slug: 'kesaksian', icon: '🙏', color: '#C4895A', sort_order: 1 },
        { name: 'Pertanyaan Iman', slug: 'iman', icon: '📖', color: '#6B8C72', sort_order: 2 },
        { name: 'Kesehatan Mental', slug: 'mental', icon: '🧠', color: '#8A6090', sort_order: 3 },
        { name: 'Hubungan', slug: 'hubungan', icon: '❤️', color: '#7C5C3E', sort_order: 4 },
        { name: 'Akademik', slug: 'akademik', icon: '🎓', color: '#C9993A', sort_order: 5 }
      ])
      if (catError) throw catError
    }

    // 2. Seed Articles if empty
    const { data: articles } = await (adminClient.from('articles') as any).select('id')
    if (!articles || articles.length === 0) {
      const { error: artError } = await (adminClient.from('articles') as any).insert([
        {
          title: 'Menemukan Kedamaian di Tengah Badai Akademik',
          excerpt: 'Strategi praktis untuk menjaga kesehatan mental dan spiritual selama masa ujian.',
          content: 'Tekanan akademik seringkali membuat kita merasa kewalahan. Namun, sebagai umat beriman, kita memiliki sumber kedamaian yang melampaui segala akal...',
          is_published: true,
          cover_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800',
          slug: 'kedamaian-tengah-badai'
        },
        {
          title: 'Pentingnya Komunitas dalam Pertumbuhan Iman',
          excerpt: 'Mengapa kita membutuhkan satu sama lain dalam perjalanan rohani kita.',
          content: 'Kita tidak diciptakan untuk hidup sendiri. Komunitas adalah tempat di mana kita bisa saling menguatkan, mendoakan, dan bertumbuh bersama...',
          is_published: true,
          cover_url: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=800',
          slug: 'pentingnya-komunitas'
        }
      ])
      if (artError) throw artError
    }

    return NextResponse.json({ success: true, message: 'Data categories and articles seeded successfully.' })
  } catch (error: any) {
    console.error('Seeding error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
