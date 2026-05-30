import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password harus diisi' }, { status: 400 })
    }

    const cookieStore = cookies()

    // Create an array to hold the cookies Supabase wants to set
    const cookiesToSetArray: any[] = []

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Push them to our array so we can set them on the final response
            cookiesToSet.forEach(cookie => cookiesToSetArray.push(cookie))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create the final response
    const response = NextResponse.json({ success: true, user: data.user }, { status: 200 })

    // Apply all cookies to the final response!
    cookiesToSetArray.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
