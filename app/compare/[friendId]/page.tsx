'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LinkedAccount, ChessStats, BrawlStarsStats, ClashRoyaleStats } from '@/lib/types'
import Navbar from '@/components/ui/Navbar'

type AnyStats = ChessStats | BrawlStarsStats | ClashRoyaleStats

interface PlayerData {
  platform: string
  platformUsername: string
  data: AnyStats | null
}

interface CompareState {
  myUsername: string
  friendUsername: string
  myStats: PlayerData[]
  friendStats: PlayerData[]
  myPlatforms: string[]
  friendPlatforms: string[]
}

export default function ComparePage() {
  const { friendId } = useParams() as { friendId: string }
  const router = useRouter()
  const [state, setState] = useState<CompareState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const myId = session.user.id

      const [
        { data: myProfile },
        { data: friendProfile },
        { data: myAccounts },
        { data: friendAccounts },
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', myId).single(),
        supabase.from('profiles').select('username').eq('id', friendId).single(),
        supabase.from('linked_accounts').select('*').eq('user_id', myId),
        supabase.from('linked_accounts').select('*').eq('user_id', friendId),
      ])

      if (!myProfile || !friendProfile) { router.replace('/dashboard'); return }

      const myPlatforms = (myAccounts || []).map((a: LinkedAccount) => a.platform)
      const friendPlatforms = (friendAccounts || []).map((a: LinkedAccount) => a.platform)
      const shared = myPlatforms.filter(p => friendPlatforms.includes(p))

      const mySharedAccounts = (myAccounts || []).filter((a: LinkedAccount) => shared.includes(a.platform))
      const friendSharedAccounts = (friendAccounts || []).filter((a: LinkedAccount) => shared.includes(a.platform))

      const [myStatsData, friendStatsData] = await Promise.all([
        Promise.all(mySharedAccounts.map((a: LinkedAccount) =>
          fetchStats(a).then(data => ({ platform: a.platform, platformUsername: a.platform_username, data }))
        )),
        Promise.all(friendSharedAccounts.map((a: LinkedAccount) =>
          fetchStats(a).then(data => ({ platform: a.platform, platformUsername: a.platform_username, data }))
        )),
      ])

      setState({
        myUsername: myProfile.username,
        friendUsername: friendProfile.username,
        myStats: myStatsData,
        friendStats: friendStatsData,
        myPlatforms,
        friendPlatforms,
      })
      setLoading(false)
    }

    load()
  }, [friendId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!state) return null

  const { myUsername, friendUsername, myStats, friendStats, myPlatforms, friendPlatforms } = state
  const sharedPlatforms = myPlatforms.filter(p => friendPlatforms.includes(p))
  const myOnlyPlatforms = myPlatforms.filter(p => !friendPlatforms.includes(p))

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Back to Friends */}
        <div>
          <Link href="/friends" className="text-gray-500 hover:text-gray-400 text-sm">
            ← Back to Friends
          </Link>
        </div>

        {/* VS header */}
        <div className="flex items-center justify-between bg-[#1a1a24] border border-[#2a2a3a] rounded-xl px-8 py-5">
          <div className="text-center flex-1">
            <p className="text-xs text-gray-500 mb-1">You</p>
            <p className="text-xl font-bold text-white">{myUsername}</p>
          </div>
          <div className="px-6">
            <span className="text-2xl font-black text-gray-600">VS</span>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-gray-500 mb-1">Friend</p>
            <p className="text-xl font-bold text-white">{friendUsername}</p>
          </div>
        </div>

        {/* Shared game comparisons */}
        {sharedPlatforms.length === 0 && (
          <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-8 text-center">
            <p className="text-gray-400">No games in common to compare yet.</p>
          </div>
        )}

        {sharedPlatforms.map(platform => {
          const my = myStats.find(s => s.platform === platform)
          const friend = friendStats.find(s => s.platform === platform)
          if (!my || !friend) return null

          return (
            <GameComparison
              key={platform}
              platform={platform}
              myUsername={myUsername}
              friendUsername={friendUsername}
              myData={my.data}
              friendData={friend.data}
            />
          )
        })}

        {/* Games only I have */}
        {myOnlyPlatforms.map(platform => (
          <div key={platform} className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6">
            <GameHeader platform={platform} />
            <p className="text-gray-500 text-sm mt-3">
              {friendUsername} hasn&apos;t linked {PLATFORM_NAMES[platform] ?? platform} yet.
            </p>
          </div>
        ))}

        <div className="text-center pb-4">
          <Link href="/friends" className="text-gray-500 hover:text-gray-400 text-sm">
            ← Back to Friends
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Per-game comparison components ──────────────────────────────────────────

const PLATFORM_NAMES: Record<string, string> = {
  chess: 'Chess.com',
  brawlstars: 'Brawl Stars',
  clashroyale: 'Clash Royale',
}

function GameHeader({ platform }: { platform: string }) {
  const icons: Record<string, string> = { chess: '♟️', brawlstars: '⭐', clashroyale: '👑' }
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2a3a]">
      <span className="text-xl">{icons[platform] ?? '🎮'}</span>
      <h3 className="font-bold text-white">{PLATFORM_NAMES[platform] ?? platform}</h3>
    </div>
  )
}

function GameComparison({ platform, myUsername, friendUsername, myData, friendData }: {
  platform: string
  myUsername: string
  friendUsername: string
  myData: AnyStats | null
  friendData: AnyStats | null
}) {
  const borderColors: Record<string, string> = {
    chess: 'border-amber-500/30',
    brawlstars: 'border-yellow-500/30',
    clashroyale: 'border-blue-500/30',
  }

  return (
    <div className={`bg-[#1a1a24] border ${borderColors[platform] ?? 'border-[#2a2a3a]'} rounded-xl p-6`}>
      <GameHeader platform={platform} />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-3">
        <p className="text-xs text-gray-500 text-right truncate">{myUsername}</p>
        <div className="w-32" />
        <p className="text-xs text-gray-500 text-left truncate">{friendUsername}</p>
      </div>

      {platform === 'chess' && myData && friendData && (
        <ChessRows my={myData as ChessStats} friend={friendData as ChessStats} />
      )}
      {platform === 'brawlstars' && myData && friendData && (
        <BrawlRows my={myData as BrawlStarsStats} friend={friendData as BrawlStarsStats} />
      )}
      {platform === 'clashroyale' && myData && friendData && (
        <ClashRows my={myData as ClashRoyaleStats} friend={friendData as ClashRoyaleStats} />
      )}
      {(!myData || !friendData) && (
        <p className="text-gray-500 text-sm text-center py-2">Stats unavailable.</p>
      )}
    </div>
  )
}

function StatRow({ label, myVal, friendVal, higherIsBetter = true }: {
  label: string
  myVal: number | null | undefined
  friendVal: number | null | undefined
  higherIsBetter?: boolean
}) {
  const [myClass, friendClass] = resolveClasses(myVal, friendVal, higherIsBetter)
  const fmt = (v: number | null | undefined) => v != null ? v.toLocaleString() : '—'

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5">
      <div className={`text-right font-semibold text-base rounded px-2 py-0.5 ${myClass}`}>{fmt(myVal)}</div>
      <p className="text-xs text-gray-500 text-center w-32 px-1">{label}</p>
      <div className={`text-left font-semibold text-base rounded px-2 py-0.5 ${friendClass}`}>{fmt(friendVal)}</div>
    </div>
  )
}

function resolveClasses(
  myVal: number | null | undefined,
  friendVal: number | null | undefined,
  higherIsBetter: boolean,
): [string, string] {
  const gray = 'text-gray-400'
  const green = 'bg-green-500/20 text-green-400'
  const red = 'bg-red-500/20 text-red-400'
  if (myVal == null || friendVal == null) return [gray, gray]
  if (myVal === friendVal) return [gray, gray]
  const myWins = higherIsBetter ? myVal > friendVal : myVal < friendVal
  return myWins ? [green, red] : [red, green]
}

function ChessRows({ my, friend }: { my: ChessStats; friend: ChessStats }) {
  return (
    <div className="divide-y divide-[#1e1e2a]">
      <StatRow label="⚡ Blitz" myVal={my.chess_blitz?.last?.rating} friendVal={friend.chess_blitz?.last?.rating} />
      <StatRow label="🚀 Rapid" myVal={my.chess_rapid?.last?.rating} friendVal={friend.chess_rapid?.last?.rating} />
      <StatRow label="💨 Bullet" myVal={my.chess_bullet?.last?.rating} friendVal={friend.chess_bullet?.last?.rating} />
      <StatRow label="🧩 Puzzle" myVal={my.tactics?.highest?.rating} friendVal={friend.tactics?.highest?.rating} />
    </div>
  )
}

function BrawlRows({ my, friend }: { my: BrawlStarsStats; friend: BrawlStarsStats }) {
  return (
    <div className="divide-y divide-[#1e1e2a]">
      <StatRow label="🏆 Trophies" myVal={my.trophies} friendVal={friend.trophies} />
      <StatRow label="⚔️ 3v3 Victories" myVal={my['3vs3Victories']} friendVal={friend['3vs3Victories']} />
      <StatRow label="🎯 Solo Victories" myVal={my.soloVictories} friendVal={friend.soloVictories} />
      <StatRow label="👥 Duo Victories" myVal={my.duoVictories} friendVal={friend.duoVictories} />
      <StatRow label="🤖 Brawlers" myVal={my.brawlers?.length} friendVal={friend.brawlers?.length} />
    </div>
  )
}

function ClashRows({ my, friend }: { my: ClashRoyaleStats; friend: ClashRoyaleStats }) {
  const myRate = winRate(my)
  const friendRate = winRate(friend)
  return (
    <div className="divide-y divide-[#1e1e2a]">
      <StatRow label="🏆 Trophies" myVal={my.trophies} friendVal={friend.trophies} />
      <StatRow label="⭐ Best Trophies" myVal={my.bestTrophies} friendVal={friend.bestTrophies} />
      <StatRow label="⚔️ Wins" myVal={my.wins} friendVal={friend.wins} />
      <StatRow label="📊 Win Rate %" myVal={myRate} friendVal={friendRate} />
      <StatRow label="👑 3-Crown Wins" myVal={my.threeCrownWins} friendVal={friend.threeCrownWins} />
      <StatRow label="🎮 Battle Count" myVal={my.battleCount} friendVal={friend.battleCount} />
    </div>
  )
}

function winRate(s: ClashRoyaleStats): number | null {
  if (!s.wins || !s.battleCount || s.battleCount === 0) return null
  return Math.round((s.wins / s.battleCount) * 100)
}

async function fetchStats(account: LinkedAccount): Promise<AnyStats | null> {
  try {
    if (account.platform === 'chess') {
      const res = await fetch(`/api/chess?username=${encodeURIComponent(account.platform_username)}`)
      return res.ok ? res.json() : null
    }
    if (account.platform === 'brawlstars') {
      const res = await fetch(`/api/brawlstars?tag=${encodeURIComponent(account.platform_username)}`)
      return res.ok ? res.json() : null
    }
    if (account.platform === 'clashroyale') {
      const res = await fetch(`/api/clashroyale?tag=${encodeURIComponent(account.platform_username)}`)
      return res.ok ? res.json() : null
    }
    return null
  } catch {
    return null
  }
}
