'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Link2, Gamepad2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const PLATFORM_INFO: Record<string, { label: string; logo: string; color: string }> = {
  chess: { label: 'Chess.com', logo: '/logos/chess.png', color: 'text-amber-400' },
  brawlstars: { label: 'Brawl Stars', logo: '/logos/brawlstars.png', color: 'text-yellow-400' },
  clashroyale: { label: 'Clash Royale', logo: '/logos/clashroyale.png', color: 'text-blue-400' },
}

interface Inviter {
  id: string
  username: string
  avatar_url: string | null
  platforms: string[]
}

type Status =
  | 'loading'
  | 'not_found'
  | 'own_link'
  | 'already_friends'
  | 'can_add'
  | 'added'
  | 'unauthenticated'

export default function InvitePage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()
  const [inviter, setInviter] = useState<Inviter | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    async function load() {
      // Fetch inviter profile by token
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('invite_token', token)
        .single()

      if (!profile) {
        setStatus('not_found')
        return
      }

      // Fetch their linked accounts
      const { data: accounts } = await supabase
        .from('linked_accounts')
        .select('platform')
        .eq('user_id', profile.id)

      setInviter({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        platforms: (accounts || []).map((a: { platform: string }) => a.platform),
      })

      // Check auth
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setStatus('unauthenticated')
        return
      }

      const myId = session.user.id

      if (myId === profile.id) {
        setStatus('own_link')
        return
      }

      // Check if visitor has a profile; if not, redirect to onboarding
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', myId)
        .single()

      if (!myProfile) {
        router.replace(`/onboarding?redirect=/invite/${token}`)
        return
      }

      // Check if already friends
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${myId},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${myId})`)
        .maybeSingle()

      setStatus(friendship ? 'already_friends' : 'can_add')
    }

    load()
  }, [token, router])

  async function handleAdd() {
    setAdding(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !inviter) { setAdding(false); return }

    await supabase.from('friendships').insert({
      user_id: session.user.id,
      friend_id: inviter.id,
      status: 'accepted',
    })

    setStatus('added')
    setAdding(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Link2 size={28} className="text-gray-500" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Invalid invite link</p>
          <p className="text-gray-400 text-sm mb-4">This link may have expired or been removed.</p>
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm">
            Go to Dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-8 text-center">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {inviter?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={inviter.avatar_url}
                alt={inviter.username}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Gamepad2 size={36} className="text-indigo-400" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">{inviter?.username}</h1>
          <p className="text-gray-400 text-sm mb-6">wants to connect on GamerStats</p>

          {/* Linked games */}
          {inviter && inviter.platforms.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Plays on</p>
              <div className="flex justify-center flex-wrap gap-2">
                {inviter.platforms.map(platform => {
                  const info = PLATFORM_INFO[platform]
                  if (!info) return null
                  return (
                    <div key={platform} className="flex items-center gap-1.5 bg-[#0f0f13] px-3 py-2 rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={info.logo} alt={info.label} className="w-5 h-5 rounded object-cover" />
                      <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action area */}
          {status === 'own_link' && (
            <div className="bg-[#0f0f13] rounded-lg p-4">
              <p className="text-gray-400 text-sm">This is your own invite link.</p>
              <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 block">
                Go to Dashboard →
              </Link>
            </div>
          )}

          {status === 'already_friends' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 font-medium">You&apos;re already connected with {inviter?.username}!</p>
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-300 text-sm mt-2 block">
                Go to Dashboard →
              </Link>
            </div>
          )}

          {status === 'added' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
              <p className="text-green-400 font-semibold text-lg">✓ {inviter?.username} added as friend!</p>
              <Link
                href={`/profile/${inviter?.id}`}
                className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-center text-sm"
              >
                View their profile
              </Link>
              <Link href="/dashboard" className="block text-gray-500 hover:text-gray-400 text-sm text-center">
                Go to Dashboard
              </Link>
            </div>
          )}

          {status === 'can_add' && (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {adding ? 'Adding...' : `Add ${inviter?.username} as a friend`}
            </button>
          )}

          {status === 'unauthenticated' && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">
                Sign up or log in to add {inviter?.username} as a friend.
              </p>
              <Link
                href={`/auth/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors text-center"
              >
                Sign Up
              </Link>
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                className="block w-full bg-[#0f0f13] hover:bg-[#252530] border border-[#2a2a3a] text-white font-semibold py-3 rounded-lg transition-colors text-center"
              >
                Log In
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          GamerStats — Track and compare your gaming stats
        </p>
      </div>
    </div>
  )
}
