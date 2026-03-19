'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChessStats, BrawlStarsStats, ClashRoyaleStats } from '@/lib/types'
import Navbar from '@/components/ui/Navbar'

type Platform = 'chess' | 'brawlstars' | 'clashroyale'

interface LeaderboardEntry {
  userId: string
  username: string
  value: number | null
}

const PLATFORM_CONFIG: Record<Platform, { label: string; statLabel: string; color: string; borderColor: string }> = {
  chess: { label: 'Chess.com', statLabel: 'Rapid Rating', color: 'text-amber-400', borderColor: 'border-amber-500/40' },
  brawlstars: { label: 'Brawl Stars', statLabel: 'Trophies', color: 'text-yellow-400', borderColor: 'border-yellow-500/40' },
  clashroyale: { label: 'Clash Royale', statLabel: 'Trophies', color: 'text-blue-400', borderColor: 'border-blue-500/40' },
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [platform, setPlatform] = useState<Platform>('chess')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      setUserId(session.user.id)
      await loadLeaderboard(session.user.id, platform)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadLeaderboard(uid: string, plat: Platform) {
    setLoading(true)

    // Get accepted friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
      .eq('status', 'accepted')

    const friendIds = (friendships || []).map(f =>
      f.user_id === uid ? f.friend_id : f.user_id
    )
    const allIds = [uid, ...friendIds]

    // Get linked accounts for this platform
    const { data: accounts } = await supabase
      .from('linked_accounts')
      .select('user_id, platform_username')
      .eq('platform', plat)
      .in('user_id', allIds)

    if (!accounts || accounts.length === 0) {
      setEntries([])
      setLoading(false)
      return
    }

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', accounts.map(a => a.user_id))

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.username]))

    // Fetch stats for each account
    const results = await Promise.all(
      accounts.map(async account => {
        const stat = await fetchSingleStat(plat, account.platform_username)
        return {
          userId: account.user_id,
          username: profileMap[account.user_id] || 'Unknown',
          value: stat,
        }
      })
    )

    const sorted = results
      .filter(r => r.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    setEntries(sorted)
    setLoading(false)
  }

  async function handlePlatformChange(plat: Platform) {
    setPlatform(plat)
    if (userId) await loadLeaderboard(userId, plat)
  }

  const config = PLATFORM_CONFIG[platform]

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Leaderboard</h2>

        {/* Platform tabs */}
        <div className="flex gap-2 mb-8">
          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(plat => (
            <button
              key={plat}
              onClick={() => handlePlatformChange(plat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                platform === plat
                  ? 'bg-[#2a2a3a] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {PLATFORM_CONFIG[plat].label}
            </button>
          ))}
        </div>

        <div className={`bg-[#1a1a24] border ${config.borderColor} rounded-xl overflow-hidden`}>
          <div className="px-6 py-4 border-b border-[#2a2a3a] flex justify-between items-center">
            <h3 className="font-semibold text-white">{config.label}</h3>
            <span className={`text-xs ${config.color}`}>{config.statLabel}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-gray-500 text-sm">
                No {config.label} accounts linked among you and your friends.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a3a]">
              {entries.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between px-6 py-4 ${
                    entry.userId === userId ? 'bg-[#2a2a3a]/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 text-center text-lg">
                      {index < 3 ? MEDAL[index] : <span className="text-gray-500 text-sm font-medium">#{index + 1}</span>}
                    </span>
                    <Link href={`/profile/${entry.userId}`} className="text-white hover:text-indigo-300 font-medium transition-colors">
                      {entry.username}
                      {entry.userId === userId && (
                        <span className="ml-2 text-xs text-indigo-400">(you)</span>
                      )}
                    </Link>
                  </div>
                  <span className={`text-lg font-bold ${config.color}`}>
                    {entry.value?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function fetchSingleStat(platform: Platform, username: string): Promise<number | null> {
  try {
    if (platform === 'chess') {
      const res = await fetch(`/api/chess?username=${encodeURIComponent(username)}`)
      if (!res.ok) return null
      const data: ChessStats = await res.json()
      return data.chess_rapid?.last?.rating ?? data.chess_blitz?.last?.rating ?? null
    }
    if (platform === 'brawlstars') {
      const res = await fetch(`/api/brawlstars?tag=${encodeURIComponent(username)}`)
      if (!res.ok) return null
      const data: BrawlStarsStats = await res.json()
      return data.trophies ?? null
    }
    if (platform === 'clashroyale') {
      const res = await fetch(`/api/clashroyale?tag=${encodeURIComponent(username)}`)
      if (!res.ok) return null
      const data: ClashRoyaleStats = await res.json()
      return data.trophies ?? null
    }
    return null
  } catch {
    return null
  }
}
