import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { email, password, displayName } = await request.json()
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const normalizedPassword = String(password ?? '')

  if (!normalizedEmail || normalizedPassword.length < 6) {
    return NextResponse.json({ error: 'Invalid registration details.' }, { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SUPABASE_URL || process.env.POSTGRES_DATABASE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SUPABASE_SECRET_KEY || process.env.POSTGRES_DATABASE_SUPABASE_SECRET_KEY
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SUPABASE_ANON_KEY || process.env.POSTGRES_DATABASE_SUPABASE_PUBLISHABLE_KEY || process.env.POSTGRES_DATABASE_SUPABASE_ANON_KEY

  if (!supabaseUrl || (!serviceRoleKey && !publicKey)) {
    return NextResponse.json({ error: 'Registration service is not configured.' }, { status: 503 })
  }

  const client = createClient(
    supabaseUrl,
    serviceRoleKey || publicKey!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  let data: { user: { id: string } | null }, error: { message: string } | null
  try {
    const response = serviceRoleKey
      ? await client.auth.admin.createUser({
          email: normalizedEmail,
          password: normalizedPassword,
          email_confirm: true,
          user_metadata: { display_name: String(displayName ?? normalizedEmail.split('@')[0]) },
        })
      : await client.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: { data: { display_name: String(displayName ?? normalizedEmail.split('@')[0]) } },
        })
    data = response.data
    error = response.error
  } catch {
    return NextResponse.json({ error: 'Supabase is currently unreachable. Please try again.' }, { status: 503 })
  }

  if (error) {
    const alreadyRegistered = error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('exists')
    return NextResponse.json({ error: alreadyRegistered ? 'This email is already registered. Please log in.' : `Registration could not be completed: ${error.message}` }, { status: alreadyRegistered ? 409 : 400 })
  }

  return NextResponse.json({ user: data.user })
}
