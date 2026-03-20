'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  chess: { icon: '♟️', color: 'text-amber-400' },
  brawlstars: { icon: '⭐', color: 'text-yellow-400' },
  clashroyale: { icon: '👑', color: 'text-blue-400' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [stats, setStats] = useState<FetchedStat[]>([])
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!profile?.username) { router.replace('/onboarding'); return }
      setUsername(profile.username)

      // Use existing token or generate one if missing
      let token: string = profile.invite_token ?? ''
      if (!token) {
        const bytes = new Uint8Array(6)
        crypto.getRandomValues(bytes)
        token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
        const { data: updated } = await supabase
          .from('profiles')
          .update({ invite_token: token })
          .eq('id', session.user.id)
          .select('invite_token')
          .maybeSingle()
        // If the column doesn't exist yet the update will fail; use the
        // locally-generated token optimistically so the UI still shows.
        token = updated?.invite_token ?? token
      }
      setInviteToken(token)

      const { data: accounts } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', session.user.id)

      if (accounts && accounts.length > 0) {
        const results = await Promise.all(accounts.map(fetchStats))
        setStats(results)
      }

      // Load accepted friends with their linked accounts
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted')

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f =>
          f.user_id === session.user.id ? f.friend_id : f.user_id
        )

        const friendEntries = await Promise.all(friendIds.map(async (fid: string) => {
          const [{ data: fProfile }, { data: fAccounts }] = await Promise.all([
            supabase.from('profiles').select('id, username, avatar_url').eq('id', fid).single(),
            supabase.from('linked_accounts').select('platform').eq('user_id', fid),
          ])
          if (!fProfile) return null
          return {
            id: fProfile.id,
            username: fProfile.username,
            avatar_url: fProfile.avatar_url,
            platforms: (fAccounts || []).map((a: { platform: string }) => a.platform),
          }
        }))

        setFriends(friendEntries.filter(Boolean) as FriendEntry[])
      }

      setLoading(false)
    }

    load()
  }, [router])

  function copyInviteLink() {
    if (!inviteToken) return
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteToken}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome back, {username}</h2>
          <p className="text-gray-400 mt-1">Your game stats at a glance</p>
        </div>

        {/* Stats grid */}
        {stats.length === 0 ? (
          <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-10 text-center">
            <p className="text-gray-400 mb-4">No game accounts linked yet.</p>
            <a href="/settings" className="text-indigo-400 hover:text-indigo-300 text-sm">
              Link your accounts →
            </a>
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

        {/* Friends section */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Friends</h3>

          {/* Invite link */}
          <div className="bg-[#1a1a24] border border-indigo-500/30 rounded-xl p-5 mb-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xl flex-shrink-0">
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white mb-0.5">Invite a Friend</p>
              <p className="text-xs text-gray-500 truncate">
                {typeof window !== 'undefined' ? window.location.origin : 'https://gamerstats.com'}/invite/{inviteToken}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">Share this link with friends to connect on GamerStats</p>
            </div>
            <button
              onClick={copyInviteLink}
              className="flex-shrink-0 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Friends list */}
          {friends.length === 0 ? (
            <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No friends yet.</p>
              <p className="text-gray-600 text-xs mt-1">Share your invite link to connect with friends.</p>
            </div>
          ) : (
            <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl divide-y divide-[#2a2a3a]">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  {friend.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={friend.avatar_url} alt={friend.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm flex-shrink-0">
                      🎮
                    </div>
                  )}

                  {/* Name + game icons */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{friend.username}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {friend.platforms.length === 0 ? (
                        <span className="text-xs text-gray-600">No games linked</span>
                      ) : (
                        friend.platforms.map(p => {
                          const info = PLATFORM_ICONS[p]
                          return info ? (
                            <span key={p} title={p} className="text-sm">{info.icon}</span>
                          ) : null
                        })
                      )}
                    </div>
                  </div>

                  {/* Compare button */}
                  <Link
                    href={`/compare/${friend.id}`}
                    className="flex-shrink-0 text-xs bg-[#0f0f13] hover:bg-[#252530] border border-[#2a2a3a] text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Compare
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
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
