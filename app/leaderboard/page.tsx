'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ChessStats, BrawlStarsStats, ClashRoyaleStats } from '@/lib/types'
import Navbar from '@/components/ui/Navbar'

type Platform = 'chess' | 'brawlstars' | 'clashroyale'

interface LeaderboardEntry {
  userId: string
  username: string
  value: number | null
}

const PLATFORM_CONFIG: Record<Platform, {
  label: string; statLabel: string; accent: string; logo: string
  accentBg: string; accentBorder: string
}> = {
  chess: {
    label: 'Chess.com', statLabel: 'Rapid Rating', accent: '#F59E0B',
    logo: '/logos/chess.png', accentBg: 'bg-amber-500/10', accentBorder: 'border-amber-500/20',
  },
  brawlstars: {
    label: 'Brawl Stars', statLabel: 'Trophies', accent: '#FBBF24',
    logo: '/logos/brawlstars.png', accentBg: 'bg-yellow-400/10', accentBorder: 'border-yellow-400/20',
  },
  clashroyale: {
    label: 'Clash Royale', statLabel: 'Trophies', accent: '#818CF8',
    logo: '/logos/clashroyale.png', accentBg: 'bg-indigo-400/10', accentBorder: 'border-indigo-400/20',
  },
}

const MEDAL_STYLES = [
  { icon: <Medal size={18} />, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { icon: <Medal size={18} />, color: 'text-slate-300', bg: 'bg-slate-300/10' },
  { icon: <Medal size={18} />, color: 'text-amber-700', bg: 'bg-amber-700/10' },
]

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

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
      .eq('status', 'accepted')

    const friendIds = (friendships || []).map(f =>
      f.user_id === uid ? f.friend_id : f.user_id
    )
    const allIds = [uid, ...friendIds]

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

    const [{ data: profiles }, statResults] = await Promise.all([
      supabase.from('profiles').select('id, username').in('id', accounts.map(a => a.user_id)),
      Promise.all(
        accounts.map(account =>
          fetchSingleStat(plat, account.platform_username).then(value => ({
            userId: account.user_id, value,
          }))
        )
      ),
    ])

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.username]))

    const sorted = statResults
      .map(({ userId, value }) => ({ userId, username: profileMap[userId] || 'Unknown', value }))
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
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0D1117] border border-[#1E2A3A] flex items-center justify-center">
            <Trophy size={18} className="text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F1F5F9]">Leaderboard</h1>
            <p className="text-xs text-[#475569]">You and your friends</p>
          </div>
        </motion.div>

        {/* Platform tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex gap-2 p-1 bg-[#0D1117] border border-[#1E2A3A] rounded-2xl"
        >
          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(plat => {
            const cfg = PLATFORM_CONFIG[plat]
            const active = platform === plat
            return (
              <button
                key={plat}
                onClick={() => handlePlatformChange(plat)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-[#161B27] text-[#F1F5F9] shadow-sm' : 'text-[#475569] hover:text-[#94A3B8]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.logo} alt={cfg.label} className="w-4 h-4 rounded object-cover" />
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            )
          })}
        </motion.div>

        {/* Board */}
        <AnimatePresence mode="wait">
          <motion.div
            key={platform}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`bg-[#0D1117] border rounded-2xl overflow-hidden ${config.accentBorder}`}
          >
            <div className="px-6 py-4 border-b border-[#1E2A3A] flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.logo} alt={config.label} className="w-5 h-5 rounded object-cover" />
              <h3 className="font-semibold text-[#F1F5F9] flex-1">{config.label}</h3>
              <span className="text-xs font-medium" style={{ color: config.accent }}>{config.statLabel}</span>
            </div>

            {loading ? (
              <div className="divide-y divide-[#1E2A3A]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="skeleton w-8 h-8 rounded-lg" />
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-5 w-16 rounded ml-auto" />
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#161B27] border border-[#2E3D52] flex items-center justify-center mx-auto mb-3">
                  <Trophy size={20} className="text-[#2E3D52]" />
                </div>
                <p className="text-[#475569] text-sm">
                  No {config.label} accounts linked among you and your friends.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1E2A3A]">
                {entries.map((entry, index) => {
                  const isMe = entry.userId === userId
                  const medal = MEDAL_STYLES[index]
                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors ${isMe ? 'bg-[#6366F1]/5' : 'hover:bg-[#161B27]/50'}`}
                    >
                      <span className="w-8 flex justify-center flex-shrink-0">
                        {medal ? (
                          <span className={`w-8 h-8 rounded-lg ${medal.bg} ${medal.color} flex items-center justify-center`}>
                            {medal.icon}
                          </span>
                        ) : (
                          <span className="text-[#475569] text-sm font-medium">#{index + 1}</span>
                        )}
                      </span>
                      <Link href={`/profile/${entry.userId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: isMe ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #374151, #1F2937)' }}
                        >
                          {entry.username[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#F1F5F9] group-hover:text-indigo-300 transition-colors truncate">
                          {entry.username}
                          {isMe && <span className="ml-2 text-[10px] text-[#6366F1] font-semibold bg-[#6366F1]/10 px-1.5 py-0.5 rounded-full">you</span>}
                        </span>
                      </Link>
                      <span className="text-base font-bold flex-shrink-0" style={{ color: config.accent }}>
                        {entry.value?.toLocaleString()}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
