'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const [profileUsername, setProfileUsername] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<FetchedStat[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      if (session.user.id === profileId) {
        router.replace('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', profileId).single()

      if (!profile) { setNotFound(true); setLoading(false); return }
      setProfileUsername(profile.username)
      setProfileAvatarUrl(profile.avatar_url ?? null)

      const { data: accounts } = await supabase
        .from('linked_accounts').select('*').eq('user_id', profileId)

      if (!accounts || accounts.length === 0) { setLoading(false); return }

      const results = await Promise.all(accounts.map(fetchStats))
      setStats(results)
      setLoading(false)
    }
    load()
  }, [profileId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14]">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="skeleton w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-40 rounded-lg" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080B14]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-[#475569]">Player not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatarUrl}
                alt={profileUsername}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-[#6366F1]/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[#6366F1]/20">
                {profileUsername[0]?.toUpperCase()}
              </div>
            )}
            {/* Online dot */}
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-[#080B14]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">{profileUsername}</h1>
            <p className="text-sm text-[#475569] mt-0.5">
              {stats.length > 0 ? `${stats.length} game${stats.length !== 1 ? 's' : ''} linked` : 'No games linked'}
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        {stats.length === 0 ? (
          <div className="bg-[#0D1117] border border-dashed border-[#2E3D52] rounded-2xl p-10 text-center">
            <p className="text-[#475569] text-sm">This player hasn&apos;t linked any game accounts.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {stats.map(({ account, data, error }) => {
              if (error || !data) {
                return (
                  <div key={account.id} className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-6">
                    <p className="text-[#94A3B8] text-sm font-medium capitalize">{account.platform}</p>
                    <p className="text-[#EF4444] text-sm mt-2">{error || 'Failed to load stats'}</p>
                  </div>
                )
              }
              if (account.platform === 'chess') return <ChessCard key={account.id} username={account.platform_username} data={data as ChessStats} />
              if (account.platform === 'brawlstars') return <BrawlStarsCard key={account.id} username={account.platform_username} data={data as BrawlStarsStats} />
              if (account.platform === 'clashroyale') return <ClashRoyaleCard key={account.id} username={account.platform_username} data={data as ClashRoyaleStats} />
              return null
            })}
          </motion.div>
        )}
      </div>
    </div>
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
      if (!res.ok) return { account, data: null, error: 'Player not found' }
      return { account, data: await res.json() }
    }
    if (account.platform === 'clashroyale') {
      const res = await fetch(`/api/clashroyale?tag=${encodeURIComponent(account.platform_username)}`)
      if (!res.ok) return { account, data: null, error: 'Player not found' }
      return { account, data: await res.json() }
    }
    return { account, data: null, error: 'Unknown platform' }
  } catch {
    return { account, data: null, error: 'Network error' }
  }
}
