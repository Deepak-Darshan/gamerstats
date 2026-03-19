'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

  const [myId, setMyId] = useState<string | null>(null)
  const [profileUsername, setProfileUsername] = useState('')
  const [stats, setStats] = useState<FetchedStat[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      setMyId(session.user.id)

      // If viewing own profile, redirect to dashboard
      if (session.user.id === profileId) {
        router.replace('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (!profile) { setNotFound(true); setLoading(false); return }
      setProfileUsername(profile.username)

      const { data: accounts } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', profileId)

      if (!accounts || accounts.length === 0) { setLoading(false); return }

      const results = await Promise.all(accounts.map(fetchStats))
      setStats(results)
      setLoading(false)
    }
    load()
  }, [profileId, router])

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

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-gray-400">Player not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">{profileUsername}</h2>
          <p className="text-gray-400 mt-1">Player stats</p>
        </div>

        {stats.length === 0 ? (
          <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-10 text-center">
            <p className="text-gray-400">This player hasn&apos;t linked any game accounts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {stats.map(({ account, data, error }) => {
              if (error || !data) {
                return (
                  <div key={account.id} className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6">
                    <p className="text-gray-400 text-sm font-medium capitalize">{account.platform}</p>
                    <p className="text-red-400 text-sm mt-2">{error || 'Failed to load stats'}</p>
                  </div>
                )
              }
              if (account.platform === 'chess') return <ChessCard key={account.id} username={account.platform_username} data={data as ChessStats} />
              if (account.platform === 'brawlstars') return <BrawlStarsCard key={account.id} username={account.platform_username} data={data as BrawlStarsStats} />
              if (account.platform === 'clashroyale') return <ClashRoyaleCard key={account.id} username={account.platform_username} data={data as ClashRoyaleStats} />
              return null
            })}
          </div>
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
