'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/friends', label: 'Friends' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ]

  return (
    <nav className="border-b border-[#2a2a3a] bg-[#1a1a24]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-white font-bold text-lg">
            GamerStats
          </Link>
          <div className="flex gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === link.href
                    ? 'bg-[#0f0f13] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
