'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Check, Save, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'

type Platform = 'chess' | 'brawlstars' | 'clashroyale'

const PLATFORMS: {
  id: Platform; label: string; placeholder: string; logo: string; accent: string; glow: string
}[] = [
  {
    id: 'chess', label: 'Chess.com', placeholder: 'Your Chess.com username',
    logo: '/logos/chess.png', accent: '#F59E0B', glow: 'rgba(245,158,11,0.15)',
  },
  {
    id: 'brawlstars', label: 'Brawl Stars', placeholder: 'Player tag (e.g. #ABC123)',
    logo: '/logos/brawlstars.png', accent: '#FBBF24', glow: 'rgba(251,191,36,0.15)',
  },
  {
    id: 'clashroyale', label: 'Clash Royale', placeholder: 'Player tag (e.g. #ABC123)',
    logo: '/logos/clashroyale.png', accent: '#818CF8', glow: 'rgba(129,140,248,0.15)',
  },
]

function validateTag(platform: Platform, value: string): string | null {
  if (!value) return null
  if (platform === 'brawlstars' || platform === 'clashroyale') {
    if (!/^#[A-Z0-9]{3,12}$/i.test(value)) {
      return 'Tag must start with # followed by letters and numbers (e.g. #ABC123)'
    }
  }
  return null
}

async function resizeImageToBlob(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.85)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function SettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [accounts, setAccounts] = useState<Record<Platform, string>>({
    chess: '', brawlstars: '', clashroyale: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<Platform, string>>({
    chess: '', brawlstars: '', clashroyale: '',
  })
  const [saving, setSaving] = useState<Platform | null>(null)
  const [saved, setSaved] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      setUserId(session.user.id)

      const [{ data: profile }, { data: accounts }] = await Promise.all([
        supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single(),
        supabase.from('linked_accounts').select('platform, platform_username').eq('user_id', session.user.id),
      ])

      if (profile) {
        setUsername(profile.username ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
      }

      if (accounts) {
        const map: Record<Platform, string> = { chess: '', brawlstars: '', clashroyale: '' }
        for (const row of accounts) map[row.platform as Platform] = row.platform_username
        setAccounts(map)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    e.target.value = ''

    setAvatarError('')
    setAvatarUploading(true)
    try {
      const blob = await resizeImageToBlob(file, 400)
      const ext = 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) { setAvatarError(uploadError.message); return }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // Bust cache by appending a timestamp
      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      const { error: profileError } = await supabase
        .from('profiles').update({ avatar_url: urlWithBust }).eq('id', userId)

      if (profileError) { setAvatarError(profileError.message); return }
      setAvatarUrl(urlWithBust)
    } catch {
      setAvatarError('Upload failed. Please try again.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleSave(platform: Platform) {
    if (!userId) return

    const value = accounts[platform].trim()
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
        .from('linked_accounts').delete().eq('user_id', userId).eq('platform', platform)
      if (error) saveError = error.message
    } else {
      const { error: updateError, data: updated } = await supabase
        .from('linked_accounts')
        .update({ platform_username: value })
        .eq('user_id', userId).eq('platform', platform).select()

      if (updateError) {
        saveError = updateError.message
      } else if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('linked_accounts').insert({ user_id: userId, platform, platform_username: value })
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
      <div className="min-h-screen bg-[#080B14]">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 py-8 space-y-4">
          <div className="skeleton h-8 w-28 rounded-lg" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0D1117] border border-[#1E2A3A] flex items-center justify-center">
            <Settings size={18} className="text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F1F5F9]">Settings</h1>
            <p className="text-xs text-[#475569]">Manage your linked accounts</p>
          </div>
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4">Profile Picture</p>
          <div className="flex items-center gap-5">
            {/* Clickable avatar */}
            <div className="relative group flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                onClick={() => !avatarUploading && fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative w-20 h-20 rounded-full overflow-hidden focus:outline-none"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold">
                    {username[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  {avatarUploading ? (
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>
              {/* Ring */}
              <div className="absolute inset-0 rounded-full ring-2 ring-[#1E2A3A] group-hover:ring-[#6366F1]/50 transition-all pointer-events-none" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#F1F5F9] mb-1">{username}</p>
              <p className="text-xs text-[#475569] mb-3">
                Click your avatar to upload a new photo. Automatically resized to 400×400.
              </p>
              <button
                onClick={() => !avatarUploading && fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs font-semibold text-[#6366F1] hover:text-indigo-300 disabled:opacity-50 transition-colors"
              >
                {avatarUploading ? 'Uploading…' : 'Change photo'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {avatarError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="text-xs text-[#EF4444] mt-3"
              >
                {avatarError}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Linked accounts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[#1E2A3A]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]">Linked Game Accounts</p>
          </div>

          <div className="divide-y divide-[#1E2A3A]">
            {PLATFORMS.map((platform, i) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                className="p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={platform.logo} alt={platform.label} className="w-8 h-8 rounded-xl object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-[#F1F5F9]">{platform.label}</p>
                    <p className="text-xs text-[#475569]">
                      {accounts[platform.id] ? `Linked: ${accounts[platform.id]}` : 'Not linked'}
                    </p>
                  </div>
                  {accounts[platform.id] && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                      <Check size={10} /> Active
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accounts[platform.id]}
                    onChange={e => {
                      setAccounts(prev => ({ ...prev, [platform.id]: e.target.value }))
                      setFieldErrors(prev => ({ ...prev, [platform.id]: '' }))
                    }}
                    placeholder={platform.placeholder}
                    className="flex-1 bg-[#080B14] border rounded-xl px-4 py-2.5 text-[#F1F5F9] placeholder-[#475569] text-sm focus:outline-none transition-all"
                    style={{ borderColor: `${platform.accent}40` }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = platform.accent
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${platform.glow}`
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = `${platform.accent}40`
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    onClick={() => handleSave(platform.id)}
                    disabled={saving === platform.id}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all min-w-[80px] justify-center"
                    style={{
                      background: saved === platform.id
                        ? 'rgba(16,185,129,0.15)'
                        : `linear-gradient(135deg, ${platform.accent}33, ${platform.accent}22)`,
                      color: saved === platform.id ? '#10B981' : platform.accent,
                      border: `1px solid ${saved === platform.id ? '#10B981' : platform.accent}30`,
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {saving === platform.id ? (
                        <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin block" />
                        </motion.span>
                      ) : saved === platform.id ? (
                        <motion.span key="check" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                          <Check size={14} /> Saved
                        </motion.span>
                      ) : (
                        <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                          <Save size={13} /> Save
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <AnimatePresence>
                  {fieldErrors[platform.id] && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-[#EF4444] mt-2"
                    >
                      {fieldErrors[platform.id]}
                    </motion.p>
                  )}
                </AnimatePresence>
                <p className="text-[10px] text-[#2E3D52] mt-1.5">Leave empty to unlink this account</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
