'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Swords, Trophy, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', authData.user.id).maybeSingle()

    if (profile?.username) {
      router.replace(redirect || '/dashboard')
    } else {
      router.replace(redirect ? `/onboarding?redirect=${encodeURIComponent(redirect)}` : '/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-[#080B14] flex">
      {/* ── Left panel (desktop only) ──────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[#0D1117] border-r border-[#1E2A3A] p-12 relative overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"
               style={{ animation: 'orb1 8s ease-in-out infinite' }} />
          <div className="absolute top-1/2 right-1/4 w-56 h-56 bg-violet-500/10 rounded-full blur-3xl"
               style={{ animation: 'orb2 10s ease-in-out infinite' }} />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl"
               style={{ animation: 'orb3 12s ease-in-out infinite' }} />
        </div>

        <div className="relative">
          <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            GamerStats
          </p>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-[#F1F5F9] leading-tight tracking-tight">
              Track.<br />Compare.<br />Compete.
            </h1>
            <p className="text-[#94A3B8] mt-4 leading-relaxed">
              One dashboard for all your gaming stats. See how you stack up against friends.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              { icon: <Trophy size={16} />,  text: 'Real-time stats from Chess.com, Brawl Stars & Clash Royale' },
              { icon: <Swords size={16} />,  text: 'Head-to-head comparisons with interactive charts' },
              { icon: <Users size={16} />,   text: 'Friend leaderboards to track who\'s on top' },
            ].map(({ icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-[#6366F1] flex-shrink-0">{icon}</span>
                <span className="text-sm text-[#94A3B8]">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#475569]">© 2025 GamerStats</p>
      </div>

      {/* ── Right panel (form) ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <p className="lg:hidden text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent mb-8 text-center">
            GamerStats
          </p>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Welcome back</h2>
            <p className="text-[#94A3B8] mt-1 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full bg-[#0D1117] border border-[#1E2A3A] rounded-xl px-4 py-3 text-[#F1F5F9] placeholder-[#475569] text-sm focus:outline-none focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-[#0D1117] border border-[#1E2A3A] rounded-xl px-4 py-3 text-[#F1F5F9] placeholder-[#475569] text-sm focus:outline-none focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all"
              />
            </Field>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3 rounded-xl"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </motion.button>
          </form>

          <p className="text-center text-[#475569] text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href={redirect ? `/auth/signup?redirect=${encodeURIComponent(redirect)}` : '/auth/signup'}
              className="text-[#6366F1] hover:text-indigo-300 transition-colors"
            >
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">{label}</label>
      {children}
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
