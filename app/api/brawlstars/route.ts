import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag')
  if (!tag) {
    return Response.json({ error: 'tag is required' }, { status: 400 })
  }

  // Remove leading # if present, then encode
  const cleanTag = tag.replace(/^#/, '')
  const res = await fetch(`https://api.brawlstars.com/v1/players/%23${encodeURIComponent(cleanTag)}`, {
    headers: {
      Authorization: `Bearer ${process.env.BRAWL_STARS_API_KEY}`,
    },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    const body = await res.text()
    return Response.json({ error: 'Player not found', detail: body }, { status: res.status })
  }

  const data = await res.json()
  return Response.json(data)
}
