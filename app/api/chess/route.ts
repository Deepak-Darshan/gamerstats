import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  if (!username) {
    return Response.json({ error: 'username is required' }, { status: 400 })
  }

  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, {
    headers: { 'User-Agent': 'GamerStats/1.0' },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return Response.json({ error: 'Player not found' }, { status: res.status })
  }

  const data = await res.json()
  return Response.json(data)
}
