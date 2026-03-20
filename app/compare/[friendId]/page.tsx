'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
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

interface ChessGame {
  url: string
  end_time: number
  time_class: string
  white: { username: string; result: string }
  black: { username: string; result: string }
}

interface H2HGame {
  date: string
  timeClass: string
  myResult: 'win' | 'loss' | 'draw'
  url: string
}

interface H2HData {
  myWins: number
  friendWins: number
  draws: number
  recentGames: H2HGame[]
}

const DRAW_RESULTS = new Set([
  'stalemate', 'agreed', 'repetition', '50move',
  'insufficient', 'timevsinsufficient',
])

const CHART_COLORS = { me: '#6366f1', friend: '#f59e0b' }

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a24',
  border: '1px solid #2a2a3a',
  borderRadius: '8px',
  color: '#e5e7eb',
  fontSize: '12px',
}

// ── Chart wrapper (avoids recharts SSR issues) ──────────────────────────────

function ChartWrapper({ children, height = 220 }: { children: React.ReactNode; height?: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return <div style={{ height }} className="rounded-lg bg-[#0f0f13] animate-pulse" />
  }
  return <>{children}</>
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { friendId } = useParams() as { friendId: string }
  const router = useRouter()
  const [state, setState] = useState<CompareState | null>(null)
  const [loading, setLoading] = useState(true)
  const [h2h, setH2h] = useState<H2HData | null>(null)
  const [h2hLoading, setH2hLoading] = useState(false)

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

      const nextState: CompareState = {
        myUsername: myProfile.username,
        friendUsername: friendProfile.username,
        myStats: myStatsData,
        friendStats: friendStatsData,
        myPlatforms,
        friendPlatforms,
      }
      setState(nextState)
      setLoading(false)

      // Kick off chess H2H fetch if both have chess
      const myChess = myStatsData.find(s => s.platform === 'chess')
      const friendChess = friendStatsData.find(s => s.platform === 'chess')
      if (myChess && friendChess) {
        setH2hLoading(true)
        fetchH2H(myChess.platformUsername, friendChess.platformUsername)
          .then(setH2h)
          .finally(() => setH2hLoading(false))
      }
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

        {/* Chess H2H */}
        {(h2hLoading || h2h) && (
          <ChessH2HSection
            myUsername={myUsername}
            friendUsername={friendUsername}
            data={h2h}
            loading={h2hLoading}
            friendChessUsername={friendStats.find(s => s.platform === 'chess')?.platformUsername ?? ''}
          />
        )}

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

// ── Per-game comparison ──────────────────────────────────────────────────────

const PLATFORM_NAMES: Record<string, string> = {
  chess: 'Chess.com',
  brawlstars: 'Brawl Stars',
  clashroyale: 'Clash Royale',
}

const PLATFORM_BADGES: Record<string, { text: string; bg: string; color: string }> = {
  chess: { text: '♟', bg: 'bg-amber-500/20', color: 'text-amber-400' },
  brawlstars: { text: 'BS', bg: 'bg-yellow-500/20', color: 'text-yellow-400' },
  clashroyale: { text: 'CR', bg: 'bg-blue-500/20', color: 'text-blue-400' },
}

const BORDER_COLORS: Record<string, string> = {
  chess: 'border-amber-500/30',
  brawlstars: 'border-yellow-500/30',
  clashroyale: 'border-blue-500/30',
}

function GameHeader({ platform }: { platform: string }) {
  const badge = PLATFORM_BADGES[platform]
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2a3a]">
      {badge && (
        <div className={`w-6 h-6 rounded ${badge.bg} flex items-center justify-center`}>
          <span className={`${badge.color} text-xs font-bold`}>{badge.text}</span>
        </div>
      )}
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
  return (
    <div className={`bg-[#1a1a24] border ${BORDER_COLORS[platform] ?? 'border-[#2a2a3a]'} rounded-xl p-6`}>
      <GameHeader platform={platform} />

      {/* Chart */}
      {myData && friendData && (
        <div className="mb-6">
          {platform === 'chess' && (
            <ChessChart
              myUsername={myUsername}
              friendUsername={friendUsername}
              my={myData as ChessStats}
              friend={friendData as ChessStats}
            />
          )}
          {platform === 'brawlstars' && (
            <BrawlChart
              myUsername={myUsername}
              friendUsername={friendUsername}
              my={myData as BrawlStarsStats}
              friend={friendData as BrawlStarsStats}
            />
          )}
          {platform === 'clashroyale' && (
            <ClashChart
              myUsername={myUsername}
              friendUsername={friendUsername}
              my={myData as ClashRoyaleStats}
              friend={friendData as ClashRoyaleStats}
            />
          )}
        </div>
      )}

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

// ── Charts ───────────────────────────────────────────────────────────────────

function ChessChart({ myUsername, friendUsername, my, friend }: {
  myUsername: string
  friendUsername: string
  my: ChessStats
  friend: ChessStats
}) {
  const data = [
    { category: 'Blitz', [myUsername]: my.chess_blitz?.last?.rating, [friendUsername]: friend.chess_blitz?.last?.rating },
    { category: 'Rapid', [myUsername]: my.chess_rapid?.last?.rating, [friendUsername]: friend.chess_rapid?.last?.rating },
    { category: 'Bullet', [myUsername]: my.chess_bullet?.last?.rating, [friendUsername]: friend.chess_bullet?.last?.rating },
    { category: 'Puzzle', [myUsername]: my.tactics?.highest?.rating, [friendUsername]: friend.tactics?.highest?.rating },
  ].filter(d => d[myUsername] || d[friendUsername])

  if (data.length === 0) return null

  return (
    <ChartWrapper>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Rating Comparison</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#374151', opacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <Bar dataKey={myUsername} fill={CHART_COLORS.me} radius={[3, 3, 0, 0]} />
          <Bar dataKey={friendUsername} fill={CHART_COLORS.friend} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

function BrawlChart({ myUsername, friendUsername, my, friend }: {
  myUsername: string
  friendUsername: string
  my: BrawlStarsStats
  friend: BrawlStarsStats
}) {
  if (!my.brawlers || !friend.brawlers) return null

  const myBrawlers = [...my.brawlers].sort((a, b) => b.trophies - a.trophies)
  const friendBrawlers = [...friend.brawlers].sort((a, b) => b.trophies - a.trophies)
  const maxLen = Math.min(myBrawlers.length, friendBrawlers.length, 20)

  const data = Array.from({ length: maxLen }, (_, i) => ({
    rank: i + 1,
    [myUsername]: myBrawlers[i]?.trophies ?? null,
    [friendUsername]: friendBrawlers[i]?.trophies ?? null,
  }))

  return (
    <ChartWrapper>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Trophy Distribution (top brawlers)</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="rank" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Rank', position: 'insideBottomRight', offset: -5, fill: '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <Line type="monotone" dataKey={myUsername} stroke={CHART_COLORS.me} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey={friendUsername} stroke={CHART_COLORS.friend} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

function ClashChart({ myUsername, friendUsername, my, friend }: {
  myUsername: string
  friendUsername: string
  my: ClashRoyaleStats
  friend: ClashRoyaleStats
}) {
  const data = [
    { category: 'Trophies', [myUsername]: my.trophies, [friendUsername]: friend.trophies },
    { category: 'Best', [myUsername]: my.bestTrophies, [friendUsername]: friend.bestTrophies },
  ]

  return (
    <ChartWrapper>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Trophy Comparison</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="40%">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#374151', opacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <Bar dataKey={myUsername} fill={CHART_COLORS.me} radius={[3, 3, 0, 0]} />
          <Bar dataKey={friendUsername} fill={CHART_COLORS.friend} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ── Chess H2H ────────────────────────────────────────────────────────────────

function ChessH2HSection({ myUsername, friendUsername, data, loading, friendChessUsername }: {
  myUsername: string
  friendUsername: string
  data: H2HData | null
  loading: boolean
  friendChessUsername: string
}) {
  return (
    <div className="bg-[#1a1a24] border border-amber-500/30 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2a3a]">
        <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
          <span className="text-amber-400 text-xs font-bold">♟</span>
        </div>
        <h3 className="font-bold text-white">Head to Head — Chess.com</h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (data.myWins + data.friendWins + data.draws) === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-2">
            You haven&apos;t played each other on Chess.com yet.
          </p>
          <a
            href={`https://www.chess.com/member/${friendChessUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm"
          >
            Challenge them on Chess.com
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {!loading && data && (data.myWins + data.friendWins + data.draws) > 0 && (
        <div className="space-y-4">
          {/* Record */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-indigo-400">{data.myWins}</p>
              <p className="text-xs text-gray-500 mt-0.5">{myUsername}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-gray-500">{data.draws}</p>
              <p className="text-xs text-gray-500 mt-0.5">Draws</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-400">{data.friendWins}</p>
              <p className="text-xs text-gray-500 mt-0.5">{friendUsername}</p>
            </div>
          </div>

          {/* Recent games */}
          {data.recentGames.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Recent Games</p>
              {data.recentGames.map((game, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0f0f13] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold ${
                      game.myResult === 'win' ? 'text-green-400' :
                      game.myResult === 'loss' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {game.myResult === 'win' ? 'Win' : game.myResult === 'loss' ? 'Loss' : 'Draw'}
                    </span>
                    <span className="text-xs text-gray-600 capitalize">{game.timeClass}</span>
                    <span className="text-xs text-gray-600">{game.date}</span>
                  </div>
                  <a
                    href={game.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                  >
                    View
                    <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stat rows ────────────────────────────────────────────────────────────────

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
      <StatRow label="Blitz" myVal={my.chess_blitz?.last?.rating} friendVal={friend.chess_blitz?.last?.rating} />
      <StatRow label="Rapid" myVal={my.chess_rapid?.last?.rating} friendVal={friend.chess_rapid?.last?.rating} />
      <StatRow label="Bullet" myVal={my.chess_bullet?.last?.rating} friendVal={friend.chess_bullet?.last?.rating} />
      <StatRow label="Puzzle" myVal={my.tactics?.highest?.rating} friendVal={friend.tactics?.highest?.rating} />
    </div>
  )
}

function BrawlRows({ my, friend }: { my: BrawlStarsStats; friend: BrawlStarsStats }) {
  return (
    <div className="divide-y divide-[#1e1e2a]">
      <StatRow label="Trophies" myVal={my.trophies} friendVal={friend.trophies} />
      <StatRow label="3v3 Victories" myVal={my['3vs3Victories']} friendVal={friend['3vs3Victories']} />
      <StatRow label="Solo Victories" myVal={my.soloVictories} friendVal={friend.soloVictories} />
      <StatRow label="Duo Victories" myVal={my.duoVictories} friendVal={friend.duoVictories} />
      <StatRow label="Brawlers" myVal={my.brawlers?.length} friendVal={friend.brawlers?.length} />
    </div>
  )
}

function ClashRows({ my, friend }: { my: ClashRoyaleStats; friend: ClashRoyaleStats }) {
  const myRate = winRate(my)
  const friendRate = winRate(friend)
  return (
    <div className="divide-y divide-[#1e1e2a]">
      <StatRow label="Trophies" myVal={my.trophies} friendVal={friend.trophies} />
      <StatRow label="Best Trophies" myVal={my.bestTrophies} friendVal={friend.bestTrophies} />
      <StatRow label="Wins" myVal={my.wins} friendVal={friend.wins} />
      <StatRow label="Win Rate %" myVal={myRate} friendVal={friendRate} />
      <StatRow label="3-Crown Wins" myVal={my.threeCrownWins} friendVal={friend.threeCrownWins} />
      <StatRow label="Battle Count" myVal={my.battleCount} friendVal={friend.battleCount} />
    </div>
  )
}

function winRate(s: ClashRoyaleStats): number | null {
  if (!s.wins || !s.battleCount || s.battleCount === 0) return null
  return Math.round((s.wins / s.battleCount) * 100)
}

// ── Data fetching ────────────────────────────────────────────────────────────

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

async function fetchH2H(myUsername: string, friendUsername: string): Promise<H2HData> {
  const [myResp, friendResp] = await Promise.all([
    fetch(`/api/chess-games?username=${encodeURIComponent(myUsername)}`).then(r => r.json()).catch(() => ({ games: [] })),
    fetch(`/api/chess-games?username=${encodeURIComponent(friendUsername)}`).then(r => r.json()).catch(() => ({ games: [] })),
  ])

  const myGames: ChessGame[] = myResp.games ?? []
  const friendGames: ChessGame[] = friendResp.games ?? []

  // Use the larger set; deduplicate by URL
  const allGamesMap = new Map<string, ChessGame>()
  for (const g of [...myGames, ...friendGames]) allGamesMap.set(g.url, g)

  const myL = myUsername.toLowerCase()
  const friendL = friendUsername.toLowerCase()

  const h2hGames = [...allGamesMap.values()].filter(g => {
    const wl = g.white.username.toLowerCase()
    const bl = g.black.username.toLowerCase()
    return (wl === myL && bl === friendL) || (wl === friendL && bl === myL)
  }).sort((a, b) => b.end_time - a.end_time)

  let myWins = 0, friendWins = 0, draws = 0

  function classifyResult(game: ChessGame): 'win' | 'loss' | 'draw' {
    const myIsWhite = game.white.username.toLowerCase() === myL
    const myResult = myIsWhite ? game.white.result : game.black.result
    if (myResult === 'win') return 'win'
    if (DRAW_RESULTS.has(myResult)) return 'draw'
    return 'loss'
  }

  for (const g of h2hGames) {
    const r = classifyResult(g)
    if (r === 'win') myWins++
    else if (r === 'draw') draws++
    else friendWins++
  }

  const recentGames: H2HGame[] = h2hGames.slice(0, 5).map(g => ({
    date: new Date(g.end_time * 1000).toLocaleDateString(),
    timeClass: g.time_class,
    myResult: classifyResult(g),
    url: g.url,
  }))

  return { myWins, friendWins, draws, recentGames }
}
