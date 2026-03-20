'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Swords } from 'lucide-react'
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
  backgroundColor: '#0D1117',
  border: '1px solid #1E2A3A',
  borderRadius: '10px',
  color: '#F1F5F9',
  fontSize: '12px',
}

const PLATFORM_INFO: Record<string, { label: string; logo: string; accent: string; ring: string }> = {
  chess:       { label: 'Chess.com',    logo: '/logos/chess.png',       accent: '#F59E0B', ring: 'ring-amber-500/40' },
  brawlstars:  { label: 'Brawl Stars',  logo: '/logos/brawlstars.png',  accent: '#FBBF24', ring: 'ring-yellow-400/40' },
  clashroyale: { label: 'Clash Royale', logo: '/logos/clashroyale.png', accent: '#818CF8', ring: 'ring-indigo-400/40' },
}

const PLATFORM_NAMES: Record<string, string> = {
  chess: 'Chess.com',
  brawlstars: 'Brawl Stars',
  clashroyale: 'Clash Royale',
}

// ── Chart wrapper (avoids recharts SSR issues) ──────────────────────────────

function ChartWrapper({ children, height = 220 }: { children: React.ReactNode; height?: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ height }} className="skeleton rounded-xl" />
  return <>{children}</>
}

// ── Avatar circle ────────────────────────────────────────────────────────────

function PlayerAvatar({ username, color, label }: { username: string; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] text-[#475569] uppercase tracking-widest">{label}</p>
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
        style={{
          background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
          boxShadow: `0 0 0 4px ${color}30`,
        }}
      >
        {username[0]?.toUpperCase()}
      </div>
      <p className="text-base font-bold text-[#F1F5F9]">{username}</p>
    </div>
  )
}

// ── Section divider ──────────────────────────────────────────────────────────

function GameDivider({ platform }: { platform: string }) {
  const info = PLATFORM_INFO[platform]
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-[#1E2A3A]" />
      <div className="flex items-center gap-2 bg-[#161B27] border border-[#2E3D52] px-3 py-1.5 rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={info?.logo} alt={info?.label} className="w-4 h-4 rounded object-cover" />
        <span className="text-xs font-semibold" style={{ color: info?.accent }}>{info?.label}</span>
      </div>
      <div className="flex-1 h-px bg-[#1E2A3A]" />
    </div>
  )
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
      <div className="min-h-screen bg-[#080B14]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div className="skeleton h-48 rounded-3xl" />
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!state) return null

  const { myUsername, friendUsername, myStats, friendStats, myPlatforms, friendPlatforms } = state
  const sharedPlatforms = myPlatforms.filter(p => friendPlatforms.includes(p))
  const myOnlyPlatforms = myPlatforms.filter(p => !friendPlatforms.includes(p))

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        <Link href="/friends" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94A3B8] transition-colors">
          <ArrowLeft size={14} />
          Back to Friends
        </Link>

        {/* VS header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0D1117] border border-[#1E2A3A] rounded-3xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <PlayerAvatar username={myUsername} color="#6366F1" label="You" />
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Swords size={28} className="text-[#475569]" />
              </motion.div>
              <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">VS</span>
            </div>
            <PlayerAvatar username={friendUsername} color="#F59E0B" label="Friend" />
          </div>
        </motion.div>

        {/* Chess H2H */}
        {(h2hLoading || h2h) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <ChessH2HSection
              myUsername={myUsername}
              friendUsername={friendUsername}
              data={h2h}
              loading={h2hLoading}
              friendChessUsername={friendStats.find(s => s.platform === 'chess')?.platformUsername ?? ''}
            />
          </motion.div>
        )}

        {/* Shared game comparisons */}
        {sharedPlatforms.length === 0 && (
          <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-8 text-center">
            <p className="text-[#475569] text-sm">No games in common to compare yet.</p>
          </div>
        )}

        {sharedPlatforms.map((platform, i) => {
          const my = myStats.find(s => s.platform === platform)
          const friend = friendStats.find(s => s.platform === platform)
          if (!my || !friend) return null
          return (
            <motion.div
              key={platform}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.08 }}
            >
              <GameDivider platform={platform} />
              <GameComparison
                platform={platform}
                myUsername={myUsername}
                friendUsername={friendUsername}
                myData={my.data}
                friendData={friend.data}
              />
            </motion.div>
          )
        })}

        {/* Games only I have */}
        {myOnlyPlatforms.map(platform => (
          <div key={platform} className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-6">
            <GameDivider platform={platform} />
            <p className="text-[#475569] text-sm mt-3">
              {friendUsername} hasn&apos;t linked {PLATFORM_NAMES[platform] ?? platform} yet.
            </p>
          </div>
        ))}

        <div className="text-center pb-4">
          <Link href="/friends" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#94A3B8] transition-colors">
            <ArrowLeft size={14} />
            Back to Friends
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Per-game comparison ──────────────────────────────────────────────────────

function GameComparison({ platform, myUsername, friendUsername, myData, friendData }: {
  platform: string
  myUsername: string
  friendUsername: string
  myData: AnyStats | null
  friendData: AnyStats | null
}) {
  const info = PLATFORM_INFO[platform]
  return (
    <div
      className="bg-[#0D1117] rounded-2xl p-6 border border-[#1E2A3A]"
      style={{ borderColor: info ? `${info.accent}25` : undefined }}
    >
      {/* Chart */}
      {myData && friendData && (
        <div className="mb-6">
          {platform === 'chess' && (
            <ChessChart myUsername={myUsername} friendUsername={friendUsername} my={myData as ChessStats} friend={friendData as ChessStats} />
          )}
          {platform === 'brawlstars' && (
            <BrawlChart myUsername={myUsername} friendUsername={friendUsername} my={myData as BrawlStarsStats} friend={friendData as BrawlStarsStats} />
          )}
          {platform === 'clashroyale' && (
            <ClashChart myUsername={myUsername} friendUsername={friendUsername} my={myData as ClashRoyaleStats} friend={friendData as ClashRoyaleStats} />
          )}
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-2">
        <p className="text-xs text-[#475569] text-right truncate font-medium">{myUsername}</p>
        <div className="w-36" />
        <p className="text-xs text-[#475569] text-left truncate font-medium">{friendUsername}</p>
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
        <p className="text-[#475569] text-sm text-center py-2">Stats unavailable.</p>
      )}
    </div>
  )
}

// ── Charts ───────────────────────────────────────────────────────────────────

function ChessChart({ myUsername, friendUsername, my, friend }: {
  myUsername: string; friendUsername: string; my: ChessStats; friend: ChessStats
}) {
  const data = [
    { category: 'Blitz',  [myUsername]: my.chess_blitz?.last?.rating,  [friendUsername]: friend.chess_blitz?.last?.rating },
    { category: 'Rapid',  [myUsername]: my.chess_rapid?.last?.rating,  [friendUsername]: friend.chess_rapid?.last?.rating },
    { category: 'Bullet', [myUsername]: my.chess_bullet?.last?.rating, [friendUsername]: friend.chess_bullet?.last?.rating },
    { category: 'Puzzle', [myUsername]: my.tactics?.highest?.rating,   [friendUsername]: friend.tactics?.highest?.rating },
  ].filter(d => d[myUsername] || d[friendUsername])

  if (data.length === 0) return null

  return (
    <ChartWrapper>
      <p className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Rating Comparison</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3A" />
          <XAxis dataKey="category" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1E2A3A', opacity: 0.5 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          <Bar dataKey={myUsername} fill={CHART_COLORS.me} radius={[4, 4, 0, 0]} />
          <Bar dataKey={friendUsername} fill={CHART_COLORS.friend} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

function BrawlChart({ myUsername, friendUsername, my, friend }: {
  myUsername: string; friendUsername: string; my: BrawlStarsStats; friend: BrawlStarsStats
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
      <p className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Trophy Distribution (top brawlers)</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3A" />
          <XAxis dataKey="rank" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          <Line type="monotone" dataKey={myUsername} stroke={CHART_COLORS.me} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey={friendUsername} stroke={CHART_COLORS.friend} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

function ClashChart({ myUsername, friendUsername, my, friend }: {
  myUsername: string; friendUsername: string; my: ClashRoyaleStats; friend: ClashRoyaleStats
}) {
  const data = [
    { category: 'Trophies', [myUsername]: my.trophies, [friendUsername]: friend.trophies },
    { category: 'Best',     [myUsername]: my.bestTrophies, [friendUsername]: friend.bestTrophies },
  ]

  return (
    <ChartWrapper>
      <p className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Trophy Comparison</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="40%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3A" />
          <XAxis dataKey="category" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1E2A3A', opacity: 0.5 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          <Bar dataKey={myUsername} fill={CHART_COLORS.me} radius={[4, 4, 0, 0]} />
          <Bar dataKey={friendUsername} fill={CHART_COLORS.friend} radius={[4, 4, 0, 0]} />
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
    <div className="bg-[#0D1117] border border-amber-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#1E2A3A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/chess.png" alt="Chess.com" className="w-6 h-6 rounded object-cover" />
        <h3 className="font-bold text-[#F1F5F9]">Head to Head — Chess.com</h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin block" />
        </div>
      )}

      {!loading && data && (data.myWins + data.friendWins + data.draws) === 0 && (
        <div className="text-center py-4">
          <p className="text-[#475569] text-sm mb-3">You haven&apos;t played each other on Chess.com yet.</p>
          <a
            href={`https://www.chess.com/member/${friendChessUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
          >
            Challenge them on Chess.com
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {!loading && data && (data.myWins + data.friendWins + data.draws) > 0 && (
        <div className="space-y-5">
          {/* W-D-L record */}
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-black text-[#10B981]">{data.myWins}</p>
              <p className="text-[10px] text-[#475569] uppercase tracking-widest mt-1">{myUsername}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-[#475569]">{data.draws}</p>
              <p className="text-[10px] text-[#475569] uppercase tracking-widest mt-1">Draws</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-[#EF4444]">{data.friendWins}</p>
              <p className="text-[10px] text-[#475569] uppercase tracking-widest mt-1">{friendUsername}</p>
            </div>
          </div>

          {/* Recent games */}
          {data.recentGames.length > 0 && (
            <div>
              <p className="text-[10px] text-[#475569] uppercase tracking-widest mb-2">Recent Games</p>
              <div className="space-y-1.5">
                {data.recentGames.map((game, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#161B27] border border-[#1E2A3A] rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-8 ${
                        game.myResult === 'win' ? 'text-[#10B981]' :
                        game.myResult === 'loss' ? 'text-[#EF4444]' :
                        'text-[#475569]'
                      }`}>
                        {game.myResult === 'win' ? 'Win' : game.myResult === 'loss' ? 'Loss' : 'Draw'}
                      </span>
                      <span className="text-xs text-[#475569] capitalize">{game.timeClass}</span>
                      <span className="text-xs text-[#2E3D52]">{game.date}</span>
                    </div>
                    <a
                      href={game.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#475569] hover:text-amber-400 transition-colors"
                    >
                      View
                      <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
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
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
      <div className={`text-right font-semibold text-sm rounded-lg px-3 py-2 ${myClass}`}>{fmt(myVal)}</div>
      <p className="text-xs text-[#475569] text-center w-36 px-1">{label}</p>
      <div className={`text-left font-semibold text-sm rounded-lg px-3 py-2 ${friendClass}`}>{fmt(friendVal)}</div>
    </div>
  )
}

function resolveClasses(
  myVal: number | null | undefined,
  friendVal: number | null | undefined,
  higherIsBetter: boolean,
): [string, string] {
  const gray = 'text-[#94A3B8]'
  const green = 'bg-[#10B981]/10 text-[#10B981] border-l-2 border-[#10B981]'
  const red = 'bg-[#EF4444]/10 text-[#EF4444] border-l-2 border-[#EF4444]'
  if (myVal == null || friendVal == null) return [gray, gray]
  if (myVal === friendVal) return [gray, gray]
  const myWins = higherIsBetter ? myVal > friendVal : myVal < friendVal
  return myWins ? [green, red] : [red, green]
}

function ChessRows({ my, friend }: { my: ChessStats; friend: ChessStats }) {
  return (
    <div className="space-y-0.5">
      <StatRow label="Blitz" myVal={my.chess_blitz?.last?.rating} friendVal={friend.chess_blitz?.last?.rating} />
      <StatRow label="Rapid" myVal={my.chess_rapid?.last?.rating} friendVal={friend.chess_rapid?.last?.rating} />
      <StatRow label="Bullet" myVal={my.chess_bullet?.last?.rating} friendVal={friend.chess_bullet?.last?.rating} />
      <StatRow label="Puzzle" myVal={my.tactics?.highest?.rating} friendVal={friend.tactics?.highest?.rating} />
    </div>
  )
}

function BrawlRows({ my, friend }: { my: BrawlStarsStats; friend: BrawlStarsStats }) {
  return (
    <div className="space-y-0.5">
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
    <div className="space-y-0.5">
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
