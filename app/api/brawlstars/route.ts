import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag')
  if (!tag) {
    return Response.json({ error: 'tag is required' }, { status: 400 })
  }

  // Remove leading # if present, uppercase, then encode
  const cleanTag = tag.replace(/^#/, '').toUpperCase()
  const res = await fetch(`https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}`, {
    headers: {
      Authorization: `Bearer ${process.env.BRAWL_STARS_API_KEY}`,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[BrawlStars] ${res.status} for tag #${cleanTag}:`, body)
    return Response.json({ error: `API error ${res.status}`, detail: body }, { status: res.status })
  }

  const data = await res.json()
  return Response.json(data)
}
