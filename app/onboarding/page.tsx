'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface GameAccount {
  platform: 'chess' | 'brawlstars' | 'clashroyale'
  username: string
}

const PLATFORMS = [
  { id: 'chess' as const, label: 'Chess.com', color: 'amber', placeholder: 'Your Chess.com username' },
  { id: 'brawlstars' as const, label: 'Brawl Stars', color: 'yellow', placeholder: 'Player tag (e.g. #ABC123)' },
  { id: 'clashroyale' as const, label: 'Clash Royale', color: 'blue', placeholder: 'Player tag (e.g. #ABC123)' },
]

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  const [username, setUsername] = useState('')
  const [accounts, setAccounts] = useState<Record<string, string>>({
    chess: '',
    brawlstars: '',
    clashroyale: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/login')
        return
      }
      setUserId(session.user.id)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    const tagPlatforms = ['brawlstars', 'clashroyale'] as const
    for (const p of tagPlatforms) {
      const val = accounts[p].trim()
      if (val && !/^#[A-Z0-9]{3,12}$/i.test(val)) {
        setError(`${p === 'brawlstars' ? 'Brawl Stars' : 'Clash Royale'} tag must start with # followed by letters and numbers (e.g. #ABC123)`)
        return
      }
    }

    setLoading(true)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, username: username.trim() })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    const linkedAccounts: GameAccount[] = PLATFORMS
      .filter(p => accounts[p.id].trim())
      .map(p => ({ platform: p.id, username: accounts[p.id].trim() }))

    if (linkedAccounts.length > 0) {
      const { error: accountsError } = await supabase
        .from('linked_accounts')
        .insert(linkedAccounts.map(a => ({
          user_id: userId,
          platform: a.platform,
          platform_username: a.username,
        })))

      if (accountsError) {
        setError(accountsError.message)
        setLoading(false)
        return
      }
    }

    router.replace(redirect || '/dashboard')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f0f13] py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Set Up Your Profile</h1>
          <p className="text-gray-400 mt-2">Choose a username and link your game accounts</p>
        </div>

        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="coolplayer99"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">
                Link Game Accounts <span className="text-gray-500 font-normal">(optional)</span>
              </p>
              <div className="space-y-3">
                {PLATFORMS.map(platform => (
                  <div key={platform.id}>
                    <label className="block text-xs text-gray-400 mb-1">{platform.label}</label>
                    <input
                      type="text"
                      value={accounts[platform.id]}
                      onChange={e => setAccounts(prev => ({ ...prev, [platform.id]: e.target.value }))}
                      className="w-full bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                      placeholder={platform.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  )
}
