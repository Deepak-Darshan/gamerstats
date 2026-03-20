import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  if (!username) {
    return Response.json({ error: 'username is required' }, { status: 400 })
  }

  const headers = { 'User-Agent': 'GamerStats/1.0' }
  const opts = { headers, next: { revalidate: 300 } } as const

  const [statsRes, profileRes] = await Promise.all([
    fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, opts),
    fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, opts),
  ])

  if (!statsRes.ok) {
    return Response.json({ error: 'Player not found' }, { status: statsRes.status })
  }

  const stats = await statsRes.json()
  const profile = profileRes.ok ? await profileRes.json() : {}

  return Response.json({
    ...stats,
    avatar: profile.avatar,
    country: profile.country,
    last_online: profile.last_online,
    name: profile.name,
  })
}
