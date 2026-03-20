import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  if (!username) {
    return Response.json({ error: 'username required' }, { status: 400 })
  }

  const now = new Date()
  const monthKeys = [0, 1, 2].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return {
      year: d.getFullYear(),
      month: String(d.getMonth() + 1).padStart(2, '0'),
    }
  })

  const results = await Promise.all(
    monthKeys.map(({ year, month }) =>
      fetch(
        `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/${year}/${month}`,
        {
          headers: { 'User-Agent': 'GamerStats/1.0' },
          next: { revalidate: 300 },
        }
      )
        .then(r => (r.ok ? r.json() : { games: [] }))
        .catch(() => ({ games: [] }))
    )
  )

  const games = results.flatMap(r => (r.games ?? []) as unknown[])
  return Response.json({ games })
}
