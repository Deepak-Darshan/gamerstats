'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Gamepad2, Check, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'

const PLATFORM_INFO: Record<string, { label: string; logo: string; color: string }> = {
  chess:       { label: 'Chess.com',    logo: '/logos/chess.png',       color: 'text-[#F59E0B]' },
  brawlstars:  { label: 'Brawl Stars',  logo: '/logos/brawlstars.png',  color: 'text-[#FBBF24]' },
  clashroyale: { label: 'Clash Royale', logo: '/logos/clashroyale.png', color: 'text-[#818CF8]' },
}

interface Inviter {
  id: string; username: string; avatar_url: string | null; platforms: string[]
}

type Status = 'loading' | 'not_found' | 'own_link' | 'already_friends' | 'can_add' | 'added' | 'unauthenticated'

export default function InvitePage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()
  const [inviter, setInviter] = useState<Inviter | null>(null)
  const [status, setStatus]   = useState<Status>('loading')
  const [adding, setAdding]   = useState(false)

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from('profiles').select('id, username, avatar_url').eq('invite_token', token).single()
      if (!profile) { setStatus('not_found'); return }

      const { data: accounts } = await supabase
        .from('linked_accounts').select('platform').eq('user_id', profile.id)
      setInviter({
        id: profile.id, username: profile.username, avatar_url: profile.avatar_url,
        platforms: (accounts || []).map((a: { platform: string }) => a.platform),
      })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStatus('unauthenticated'); return }
      const myId = session.user.id
      if (myId === profile.id) { setStatus('own_link'); return }

      const { data: myProfile } = await supabase
        .from('profiles').select('id').eq('id', myId).single()
      if (!myProfile) { router.replace(`/onboarding?redirect=/invite/${token}`); return }

      const { data: friendship } = await supabase
        .from('friendships').select('id')
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
      user_id: session.user.id, friend_id: inviter.id, status: 'accepted',
    })
    setStatus('added')
    setAdding(false)
    confetti({
      particleCount: 120, spread: 70, origin: { y: 0.6 },
      colors: ['#6366F1', '#818CF8', '#A5B4FC', '#F59E0B', '#FBBF24'],
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center">
        <div className="space-y-4 w-72">
          <div className="skeleton w-20 h-20 rounded-full mx-auto" />
          <div className="skeleton h-5 w-32 rounded mx-auto" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#0D1117] border border-[#1E2A3A] flex items-center justify-center mx-auto mb-4">
            <Link2 size={24} className="text-[#475569]" />
          </div>
          <p className="text-lg font-bold text-[#F1F5F9] mb-1">Invalid invite link</p>
          <p className="text-sm text-[#94A3B8] mb-6">This link may have expired or been removed.</p>
          <Link href="/dashboard" className="text-sm text-[#6366F1] hover:text-indigo-300 transition-colors">
            Go to Dashboard →
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080B14] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <motion.div
          className="float-animation"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-3xl p-8 text-center relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Avatar */}
            <div className="flex justify-center mb-5">
              {inviter?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inviter.avatar_url} alt={inviter?.username}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-[#6366F1]/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 ring-4 ring-[#6366F1]/30 flex items-center justify-center text-white text-2xl font-bold">
                  {inviter?.username?.[0]?.toUpperCase() ?? <Gamepad2 size={32} />}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[#F1F5F9] mb-1">{inviter?.username}</h1>
            <p className="text-sm text-[#94A3B8] mb-6">wants to connect on GamerStats</p>

            {/* Game badges */}
            {inviter && inviter.platforms.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Plays on</p>
                <div className="flex justify-center flex-wrap gap-2">
                  {inviter.platforms.map(platform => {
                    const info = PLATFORM_INFO[platform]
                    if (!info) return null
                    return (
                      <div key={platform} className="flex items-center gap-2 bg-[#161B27] border border-[#2E3D52] px-3 py-2 rounded-xl">
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
            <AnimatePresence mode="wait">
              {status === 'own_link' && (
                <motion.div key="own" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-[#161B27] rounded-2xl p-4"
                >
                  <p className="text-sm text-[#94A3B8]">This is your own invite link.</p>
                  <Link href="/dashboard" className="text-[#6366F1] hover:text-indigo-300 text-sm mt-2 block transition-colors">
                    Go to Dashboard →
                  </Link>
                </motion.div>
              )}

              {status === 'already_friends' && (
                <motion.div key="already" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-center gap-2 text-[#10B981] font-medium mb-2">
                    <Check size={16} /> Already connected!
                  </div>
                  <Link href="/dashboard" className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors block">
                    Go to Dashboard →
                  </Link>
                </motion.div>
              )}

              {status === 'added' && (
                <motion.div key="added"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-4 space-y-3"
                >
                  <p className="text-[#10B981] font-semibold text-lg">
                    <Check className="inline mr-1" size={18} />
                    {inviter?.username} added!
                  </p>
                  <Link
                    href={`/profile/${inviter?.id}`}
                    className="block w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold py-3 rounded-xl text-center text-sm hover:opacity-90 transition-opacity"
                  >
                    View their profile
                  </Link>
                  <Link href="/dashboard" className="block text-sm text-[#475569] hover:text-[#94A3B8] transition-colors">
                    Go to Dashboard
                  </Link>
                </motion.div>
              )}

              {status === 'can_add' && (
                <motion.button key="add"
                  onClick={handleAdd} disabled={adding}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
                >
                  {adding ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><UserPlus size={18} /> Add {inviter?.username}</>
                  )}
                </motion.button>
              )}

              {status === 'unauthenticated' && (
                <motion.div key="unauth" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-[#94A3B8] mb-4">
                    Sign up or log in to add {inviter?.username} as a friend.
                  </p>
                  <Link
                    href={`/auth/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                    className="block w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold py-3.5 rounded-2xl text-center hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
                  >
                    Sign Up Free
                  </Link>
                  <Link
                    href={`/auth/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                    className="block w-full bg-[#161B27] hover:bg-[#1E2A3A] border border-[#2E3D52] text-[#94A3B8] hover:text-[#F1F5F9] font-semibold py-3.5 rounded-2xl text-center transition-all"
                  >
                    Log In
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="text-center text-[#475569] text-xs mt-5">
          GamerStats — Track and compare your gaming stats
        </p>
      </div>
    </div>
  )
}
