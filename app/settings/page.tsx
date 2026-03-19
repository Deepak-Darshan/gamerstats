'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'

type Platform = 'chess' | 'brawlstars' | 'clashroyale'

const PLATFORMS: { id: Platform; label: string; placeholder: string }[] = [
  { id: 'chess', label: 'Chess.com', placeholder: 'Your Chess.com username' },
  { id: 'brawlstars', label: 'Brawl Stars', placeholder: 'Player tag (e.g. #ABC123)' },
  { id: 'clashroyale', label: 'Clash Royale', placeholder: 'Player tag (e.g. #ABC123)' },
]

function validateTag(platform: Platform, value: string): string | null {
  if (!value) return null
  if (platform === 'brawlstars' || platform === 'clashroyale') {
    if (!/^#[A-Z0-9]{3,12}$/i.test(value)) {
      return `Tag must start with # followed by letters and numbers (e.g. #ABC123)`
    }
  }
  return null
}

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Record<Platform, string>>({
    chess: '',
    brawlstars: '',
    clashroyale: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<Platform, string>>({
    chess: '',
    brawlstars: '',
    clashroyale: '',
  })
  const [saving, setSaving] = useState<Platform | null>(null)
  const [saved, setSaved] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      setUserId(session.user.id)

      const { data } = await supabase
        .from('linked_accounts')
        .select('platform, platform_username')
        .eq('user_id', session.user.id)

      if (data) {
        const map: Record<Platform, string> = { chess: '', brawlstars: '', clashroyale: '' }
        for (const row of data) {
          map[row.platform as Platform] = row.platform_username
        }
        setAccounts(map)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(platform: Platform) {
    if (!userId) return

    const value = accounts[platform].trim()

    // Validate
    const err = validateTag(platform, value)
    if (err) {
      setFieldErrors(prev => ({ ...prev, [platform]: err }))
      return
    }
    setFieldErrors(prev => ({ ...prev, [platform]: '' }))
    setSaving(platform)

    let saveError: string | null = null

    if (!value) {
      const { error } = await supabase
        .from('linked_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform)
      if (error) saveError = error.message
    } else {
      // Try update first, then insert if no row exists
      const { error: updateError, data: updated } = await supabase
        .from('linked_accounts')
        .update({ platform_username: value })
        .eq('user_id', userId)
        .eq('platform', platform)
        .select()

      if (updateError) {
        saveError = updateError.message
      } else if (!updated || updated.length === 0) {
        // No existing row — insert
        const { error: insertError } = await supabase
          .from('linked_accounts')
          .insert({ user_id: userId, platform, platform_username: value })
        if (insertError) saveError = insertError.message
      }
    }

    setSaving(null)
    if (saveError) {
      setFieldErrors(prev => ({ ...prev, [platform]: saveError! }))
    } else {
      setSaved(platform)
      setTimeout(() => setSaved(null), 2000)
    }
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
      <div className="max-w-xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6 space-y-6">
          <h3 className="font-semibold text-white">Linked Game Accounts</h3>

          {PLATFORMS.map(platform => (
            <div key={platform.id}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {platform.label}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accounts[platform.id]}
                  onChange={e => {
                    setAccounts(prev => ({ ...prev, [platform.id]: e.target.value }))
                    setFieldErrors(prev => ({ ...prev, [platform.id]: '' }))
                  }}
                  placeholder={platform.placeholder}
                  className="flex-1 bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
                <button
                  onClick={() => handleSave(platform.id)}
                  disabled={saving === platform.id}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white min-w-[70px]"
                >
                  {saving === platform.id ? '...' : saved === platform.id ? 'Saved!' : 'Save'}
                </button>
              </div>
              {fieldErrors[platform.id] && (
                <p className="text-red-400 text-xs mt-1.5">{fieldErrors[platform.id]}</p>
              )}
              <p className="text-gray-600 text-xs mt-1">Leave empty to unlink</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
