'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

const navLinks = [
  { href: '/dashboard',   label: 'Dashboard'   },
  { href: '/friends',     label: 'Friends'     },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/settings',    label: 'Settings'    },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [avatarLetter, setAvatarLetter] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle()
      const letter = data?.username?.[0] ?? session.user.email?.[0] ?? '?'
      setAvatarLetter(letter.toUpperCase())
      setAvatarUrl(data?.avatar_url ?? null)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"
        >
          GamerStats
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 text-sm rounded-md transition-colors ${
                  active ? 'text-[#F1F5F9]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-white/8"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="w-8 h-8 rounded-full overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-indigo-500/40 transition-all flex-shrink-0"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {avatarLetter || '?'}
                </div>
              )}
            </motion.div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-[#080B14]" />
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
