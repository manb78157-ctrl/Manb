import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Live API odds are disabled. Matches are managed manually.' }, { status: 410 })
}
