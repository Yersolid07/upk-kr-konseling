'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function generateSlug(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-')      // Replace multiple - with single -
}

export async function createArticle(formData: FormData) {
  const supabase = createClient()
  
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const excerpt = formData.get('excerpt') as string
  const categoryId = formData.get('category_id') as string || null
  const coverUrl = formData.get('cover_url') as string || null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk untuk menulis artikel.' }

  // Check if user has permission (optional, but good for premium feel)
  // For now, let anyone write but default is_published to false for members?
  // User says "siapapun yang bisa tulis", so we'll allow it.
  
  const slug = `${generateSlug(title)}-${Math.random().toString(36).slice(2, 7)}`

  const { data, error } = await (supabase.from('articles') as any)
    .insert({
      title,
      content,
      excerpt,
      category_id: categoryId,
      author_id: user.id,
      slug,
      cover_url: coverUrl,
      is_published: true // Setting to true as requested "siapapun bisa tulis dan kirim"
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating article:', error)
    return { error: 'Gagal mempublikasikan artikel. Silakan coba lagi.' }
  }

  revalidatePath('/renungan')
  redirect(`/renungan/${data.id}`)
}
