import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: existingProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = existingProfile?.role === 'admin' ? 'admin' : 'user'
  const { error } = await adminClient.from('profiles').upsert({
    id: user.id,
    email: user.email ?? '',
    display_name: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User',
    role,
  }, { onConflict: 'id' })

  if (error) {
    console.error('[v0] profile sync failed:', error.message)
    return NextResponse.json({ error: 'Profile could not be synchronized.' }, { status: 500 })
  }

  return NextResponse.json({ role })
}

// placeholder
