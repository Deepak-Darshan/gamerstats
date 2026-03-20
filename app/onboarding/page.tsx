'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Platform = 'chess' | 'brawlstars' | 'clashroyale'

const PLATFORMS: {
  id: Platform; label: string; logo: string; placeholder: string
  description: string; accent: string; glow: string
}[] = [
  {
    id: 'chess', label: 'Chess.com', logo: '/logos/chess.png',
    placeholder: 'Your Chess.com username',
    description: 'Blitz, Rapid, Bullet ratings + W/D/L records',
    accent: '#F59E0B', glow: 'rgba(245,158,11,0.15)',
  },
  {
    id: 'brawlstars', label: 'Brawl Stars', logo: '/logos/brawlstars.png',
    placeholder: 'Player tag (e.g. #ABC123)',
    description: 'Trophies, victories, and top brawlers',
    accent: '#FBBF24', glow: 'rgba(251,191,36,0.15)',
  },
  {
    id: 'clashroyale', label: 'Clash Royale', logo: '/logos/clashroyale.png',
    placeholder: 'Player tag (e.g. #ABC123)',
    description: 'Trophies, win rate, and battle record',
    accent: '#818CF8', glow: 'rgba(129,140,248,0.15)',
  },
]

function OnboardingForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect')

  const [step, setStep]     = useState<1 | 2>(1)
  const [username, setUsername] = useState('')
  const [accounts, setAccounts] = useState<Record<Platform, string>>({
    chess: '', brawlstars: '', clashroyale: '',
  })
  const [expandedCard, setExpandedCard] = useState<Platform | null>(null)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth/login')
    })
  }, [router])

  // Real-time username availability check
  useEffect(() => {
    if (username.length < 3) { setUsernameAvailable(null); return }
    setCheckingUsername(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('username', username.trim()).maybeSingle()
      setUsernameAvailable(!data)
      setCheckingUsername(false)
    }, 450)
    return () => clearTimeout(timer)
  }, [username])

  function handleStep1() {
    setError('')
    if (!username.trim())                          { setError('Username is required'); return }
    if (username.length < 3)                       { setError('At least 3 characters'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username))         { setError('Letters, numbers, and underscores only'); return }
    if (usernameAvailable === false)               { setError('Username is taken'); return }
    setStep(2)
  }

  async function handleSubmit(skipGames = false) {
    setError('')
    const tagPlatforms: Platform[] = ['brawlstars', 'clashroyale']
    for (const p of tagPlatforms) {
      const val = accounts[p].trim()
      if (val && !/^#[A-Z0-9]{3,12}$/i.test(val)) {
        setError(`${p === 'brawlstars' ? 'Brawl Stars' : 'Clash Royale'} tag must start with # (e.g. #ABC123)`)
        return
      }
    }

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth/login'); return }
    const uid = session.user.id

    const { error: profileError } = await supabase
      .from('profiles').upsert({ id: uid, username: username.trim() })
    if (profileError) { setError(profileError.message); setLoading(false); return }

    if (!skipGames) {
      const linked = PLATFORMS.filter(p => accounts[p.id].trim())
        .map(p => ({ user_id: uid, platform: p.id, platform_username: accounts[p.id].trim() }))
      if (linked.length > 0) {
        const { error: accErr } = await supabase
          .from('linked_accounts').upsert(linked, { onConflict: 'user_id,platform' })
        if (accErr) { setError(accErr.message); setLoading(false); return }
      }
    }
    router.replace(redirect || '/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center px-4 py-12">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#475569] font-medium">Step {step} of 2</p>
          <p className="text-xs text-[#475569]">{step === 1 ? 'Choose a username' : 'Link your games'}</p>
        </div>
        <div className="h-1 bg-[#1E2A3A] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            animate={{ width: step === 1 ? '50%' : '100%' }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            GamerStats
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Username ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Choose your username</h1>
                <p className="text-[#94A3B8] mt-2 text-sm">This is how you'll appear to friends</p>
              </div>

              <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-6 space-y-4">
                <div className="relative">
                  <input
                    type="text" value={username}
                    onChange={e => { setUsername(e.target.value); setError('') }}
                    placeholder="coolplayer99"
                    className="w-full bg-[#080B14] border border-[#1E2A3A] rounded-xl px-4 py-3.5 text-[#F1F5F9] placeholder-[#475569] text-base focus:outline-none focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <span className="w-4 h-4 border-2 border-[#475569] border-t-[#6366F1] rounded-full animate-spin block" />
                    )}
                    {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                      <Check size={16} className="text-[#10B981]" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <span className="text-[#EF4444] text-xs font-bold">✕</span>
                    )}
                  </div>
                </div>
                {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                  <p className="text-xs text-[#10B981]">Username is available</p>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <p className="text-xs text-[#EF4444]">Username is already taken</p>
                )}
                {error && <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 px-3 py-2 rounded-lg">{error}</p>}
              </div>

              <motion.button
                onClick={handleStep1}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                Continue <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: Link Games ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Link your games</h1>
                <p className="text-[#94A3B8] mt-2 text-sm">Connect your accounts to see your stats</p>
              </div>

              <div className="space-y-3">
                {PLATFORMS.map(platform => {
                  const expanded = expandedCard === platform.id
                  const hasValue = !!accounts[platform.id]
                  return (
                    <motion.div
                      key={platform.id}
                      layout
                      className="bg-[#0D1117] border rounded-2xl overflow-hidden cursor-pointer"
                      style={{ borderColor: expanded ? platform.accent + '50' : '#1E2A3A' }}
                      onClick={() => setExpandedCard(expanded ? null : platform.id)}
                    >
                      <div className="flex items-center gap-3 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={platform.logo} alt={platform.label} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#F1F5F9]">{platform.label}</p>
                          <p className="text-xs text-[#475569] truncate">{platform.description}</p>
                        </div>
                        {hasValue && !expanded && (
                          <Check size={14} className="text-[#10B981] flex-shrink-0" />
                        )}
                        <motion.span
                          animate={{ rotate: expanded ? 90 : 0 }}
                          className="text-[#475569] flex-shrink-0"
                        >
                          <ChevronRight size={16} />
                        </motion.span>
                      </div>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            onClick={e => e.stopPropagation()}
                            className="px-4 pb-4"
                          >
                            <input
                              type="text"
                              value={accounts[platform.id]}
                              onChange={e => setAccounts(prev => ({ ...prev, [platform.id]: e.target.value }))}
                              placeholder={platform.placeholder}
                              autoFocus
                              className="w-full bg-[#080B14] border rounded-xl px-4 py-3 text-[#F1F5F9] placeholder-[#475569] text-sm focus:outline-none transition-all"
                              style={{
                                borderColor: platform.accent + '40',
                                boxShadow: `0 0 0 0px ${platform.accent}`,
                              }}
                              onFocus={e => {
                                e.currentTarget.style.borderColor = platform.accent
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${platform.glow}`
                              }}
                              onBlur={e => {
                                e.currentTarget.style.borderColor = platform.accent + '40'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>

              {error && (
                <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 px-4 py-3 rounded-xl">{error}</p>
              )}

              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => handleSubmit(false)} disabled={loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    <>Get Started <ChevronRight size={16} /></>
                  )}
                </motion.button>
                <button
                  onClick={() => handleSubmit(true)} disabled={loading}
                  className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors py-2"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <Suspense><OnboardingForm /></Suspense>
}
