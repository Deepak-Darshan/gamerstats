'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Copy, Check, Gamepad2, ChevronRight, Swords } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LinkedAccount, ChessStats, BrawlStarsStats, ClashRoyaleStats } from '@/lib/types'
import Navbar from '@/components/ui/Navbar'
import ChessCard from '@/components/stats/ChessCard'
import BrawlStarsCard from '@/components/stats/BrawlStarsCard'
import ClashRoyaleCard from '@/components/stats/ClashRoyaleCard'

interface FetchedStat {
  account: LinkedAccount
  data: ChessStats | BrawlStarsStats | ClashRoyaleStats | null
  error?: string
}

interface FriendEntry {
  id: string
  username: string
  avatar_url: string | null
  platforms: string[]
}

const PLATFORM_LOGOS: Record<string, string> = {
  chess:       '/logos/chess.png',
  brawlstars:  '/logos/brawlstars.png',
  clashroyale: '/logos/clashroyale.png',
}

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
}
const fadeUp = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

// ── Skeleton components ────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden">
      <div className="h-[3px] skeleton" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        </div>
        <div className="skeleton h-12 w-32 rounded-lg mx-auto" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [username, setUsername]       = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [stats, setStats]             = useState<FetchedStat[]>([])
  const [friends, setFriends]         = useState<FriendEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle()

      if (!profile?.username) { router.replace('/onboarding'); return }
      setUsername(profile.username)

      let token: string = profile.invite_token ?? ''
      if (!token) {
        const bytes = new Uint8Array(6)
        crypto.getRandomValues(bytes)
        token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
        const { data: updated } = await supabase
          .from('profiles').update({ invite_token: token })
          .eq('id', session.user.id).select('invite_token').maybeSingle()
        token = updated?.invite_token ?? token
      }
      setInviteToken(token)
      setLoading(false) // page appears, stat cards still loading

      const [{ data: accounts }, { data: friendships }] = await Promise.all([
        supabase.from('linked_accounts').select('*').eq('user_id', session.user.id),
        supabase.from('friendships').select('user_id, friend_id')
          .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
          .eq('status', 'accepted'),
      ])

      const friendIds = (friendships || []).map(f =>
        f.user_id === session.user.id ? f.friend_id : f.user_id
      )

      const [statsResults, friendEntries] = await Promise.all([
        accounts && accounts.length > 0
          ? Promise.all(accounts.map(fetchStats))
          : Promise.resolve([]),
        Promise.all(friendIds.map(async (fid: string) => {
          const [{ data: fProfile }, { data: fAccounts }] = await Promise.all([
            supabase.from('profiles').select('id, username, avatar_url').eq('id', fid).single(),
            supabase.from('linked_accounts').select('platform').eq('user_id', fid),
          ])
          if (!fProfile) return null
          return {
            id: fProfile.id, username: fProfile.username, avatar_url: fProfile.avatar_url,
            platforms: (fAccounts || []).map((a: { platform: string }) => a.platform),
          }
        })),
      ])

      setStats(statsResults)
      setFriends(friendEntries.filter(Boolean) as FriendEntry[])
      setStatsLoading(false)
    }
    load()
  }, [router])

  function copyInviteLink() {
    if (!inviteToken) return
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteToken}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Full page skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14]">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <div className="space-y-2">
            <div className="skeleton h-8 w-56 rounded-lg" />
            <div className="skeleton h-4 w-72 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  const linkedCount  = stats.length
  const acceptedFriends = friends

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Radial glow */}
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
          />
          <div className="relative">
            <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{username}</span>
            </h1>
            <p className="text-[#94A3B8] mt-2">
              {linkedCount > 0
                ? `${linkedCount} game${linkedCount !== 1 ? 's' : ''} linked · ${acceptedFriends.length} friend${acceptedFriends.length !== 1 ? 's' : ''}`
                : 'No games linked yet — head to Settings to get started'}
            </p>
          </div>
        </motion.div>

        {/* ── Stats grid ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4">Your Stats</h2>
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(Math.max(linkedCount, 1))].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : stats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-[#0D1117] border border-dashed border-[#2E3D52] rounded-2xl p-12 text-center"
            >
              <Gamepad2 size={32} className="text-[#2E3D52] mx-auto mb-3" />
              <p className="text-[#94A3B8] mb-2">No game accounts linked yet</p>
              <Link href="/settings" className="text-sm text-[#6366F1] hover:text-indigo-300 transition-colors">
                Link your accounts in Settings →
              </Link>
            </motion.div>
          ) : (
            <motion.div
              variants={stagger} initial="initial" animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {stats.map(({ account, data, error }) => {
                if (error || !data) {
                  return (
                    <motion.div key={account.id} variants={fadeUp}
                      className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-6"
                    >
                      <p className="text-[#94A3B8] text-sm capitalize font-medium">{account.platform}</p>
                      <p className="text-[#EF4444] text-sm mt-2">{error || 'Failed to load stats'}</p>
                    </motion.div>
                  )
                }
                if (account.platform === 'chess')
                  return <ChessCard key={account.id} username={account.platform_username} data={data as ChessStats} />
                if (account.platform === 'brawlstars')
                  return <BrawlStarsCard key={account.id} username={account.platform_username} data={data as BrawlStarsStats} />
                if (account.platform === 'clashroyale')
                  return <ClashRoyaleCard key={account.id} username={account.platform_username} data={data as ClashRoyaleStats} />
                return null
              })}
            </motion.div>
          )}
        </section>

        {/* ── Friends ───────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#475569]">Friends</h2>
            <Link
              href="/friends"
              className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-indigo-300 transition-colors"
            >
              Manage <ChevronRight size={12} />
            </Link>
          </div>

          {/* Invite card */}
          <div className="bg-[#0D1117] border border-dashed border-[#2E3D52] rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-[#6366F1]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F1F5F9] mb-1">Invite a Friend</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 text-xs text-[#6366F1] bg-black/50 rounded-lg px-3 py-2 font-mono truncate">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://gamerstats.app'}/invite/{inviteToken}
                  </code>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={copyInviteLink}
                    className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#161B27] border border-[#2E3D52] flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#6366F1] transition-colors"
                  >
                    {copied ? <Check size={15} className="text-[#10B981]" /> : <Copy size={15} />}
                  </motion.button>
                </div>
                <p className="text-xs text-[#475569] mt-1.5">Share this link to add you as a friend</p>
              </div>
            </div>
          </div>

          {/* Friend cards */}
          {acceptedFriends.length === 0 ? (
            <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-8 text-center">
              <Users size={28} className="text-[#2E3D52] mx-auto mb-2" />
              <p className="text-[#475569] text-sm">No friends yet — share your invite link above</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {acceptedFriends.map(friend => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}

function FriendCard({ friend }: { friend: FriendEntry }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(99,102,241,0.12)' }}
      className="flex-shrink-0 w-52 bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-4 flex flex-col items-center gap-3"
    >
      {friend.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={friend.avatar_url} alt={friend.username}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-[#1E2A3A]" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#161B27] flex items-center justify-center text-[#6366F1] font-bold text-lg ring-2 ring-[#1E2A3A]">
          {friend.username[0]?.toUpperCase()}
        </div>
      )}
      <p className="text-sm font-semibold text-[#F1F5F9] truncate max-w-full">{friend.username}</p>
      <div className="flex items-center gap-1.5">
        {friend.platforms.length === 0
          ? <span className="text-xs text-[#475569]">No games</span>
          : friend.platforms.map(p => {
              const src = PLATFORM_LOGOS[p]
              // eslint-disable-next-line @next/next/no-img-element
              return src ? <img key={p} src={src} alt={p} title={p} className="w-5 h-5 rounded object-cover" /> : null
            })
        }
      </div>
      <Link
        href={`/compare/${friend.id}`}
        className="w-full flex items-center justify-center gap-1.5 bg-[#161B27] hover:bg-[#1E2A3A] border border-[#2E3D52] text-xs text-[#94A3B8] hover:text-[#F1F5F9] rounded-xl py-2 transition-colors"
      >
        <Swords size={12} /> Compare
      </Link>
    </motion.div>
  )
}

async function fetchStats(account: LinkedAccount): Promise<FetchedStat> {
  try {
    if (account.platform === 'chess') {
      const res = await fetch(`/api/chess?username=${encodeURIComponent(account.platform_username)}`)
      if (!res.ok) return { account, data: null, error: 'Player not found' }
      return { account, data: await res.json() }
    }
    if (account.platform === 'brawlstars') {
      const res = await fetch(`/api/brawlstars?tag=${encodeURIComponent(account.platform_username)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { account, data: null, error: body.detail ? `${body.error}: ${body.detail}` : body.error || 'Player not found' }
      }
      return { account, data: await res.json() }
    }
    if (account.platform === 'clashroyale') {
      const res = await fetch(`/api/clashroyale?tag=${encodeURIComponent(account.platform_username)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { account, data: null, error: body.detail ? `${body.error}: ${body.detail}` : body.error || 'Player not found' }
      }
      return { account, data: await res.json() }
    }
    return { account, data: null, error: 'Unknown platform' }
  } catch {
    return { account, data: null, error: 'Network error' }
  }
}
