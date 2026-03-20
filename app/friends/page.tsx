'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, UserPlus, Check, X, Clock, Swords } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import Navbar from '@/components/ui/Navbar'

interface FriendEntry {
  id: string
  profile: Profile
  status: 'pending' | 'accepted'
  direction: 'sent' | 'received'
}

export default function FriendsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      setUserId(session.user.id)
      await loadFriends(session.user.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadFriends(uid: string) {
    const { data } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`)

    if (!data) return

    const otherIds = data.map(row => row.user_id === uid ? row.friend_id : row.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherIds)

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

    const entries = data
      .map(row => {
        const otherId = row.user_id === uid ? row.friend_id : row.user_id
        const profile = profileMap[otherId]
        if (!profile) return null
        return {
          id: row.id,
          profile,
          status: row.status,
          direction: row.user_id === uid ? 'sent' : 'received',
        } as FriendEntry
      })
      .filter(Boolean) as FriendEntry[]
    setFriends(entries)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim() || !userId) return
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${search.trim()}%`)
      .neq('id', userId)
      .limit(10)
    setSearchResults(data || [])
    setSearching(false)
  }

  async function sendRequest(targetId: string) {
    if (!userId) return
    setActionLoading(targetId)
    await supabase.from('friendships').insert({ user_id: userId, friend_id: targetId, status: 'pending' })
    await loadFriends(userId)
    setSearchResults(prev => prev.filter(p => p.id !== targetId))
    setActionLoading(null)
  }

  async function acceptRequest(friendshipId: string) {
    setActionLoading(friendshipId)
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    if (userId) await loadFriends(userId)
    setActionLoading(null)
  }

  async function removeFriend(friendshipId: string) {
    setActionLoading(friendshipId)
    await supabase.from('friendships').delete().eq('id', friendshipId)
    if (userId) await loadFriends(userId)
    setActionLoading(null)
  }

  const accepted = friends.filter(f => f.status === 'accepted')
  const pendingReceived = friends.filter(f => f.status === 'pending' && f.direction === 'received')
  const pendingSent = friends.filter(f => f.status === 'pending' && f.direction === 'sent')
  const existingIds = new Set(friends.map(f => f.profile.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <div className="skeleton h-8 w-32 rounded-lg" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0D1117] border border-[#1E2A3A] flex items-center justify-center">
            <Users size={18} className="text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F1F5F9]">Friends</h1>
            <p className="text-xs text-[#475569]">{accepted.length} connected</p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-3">Find Players</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by username..."
                className="w-full bg-[#080B14] border border-[#1E2A3A] rounded-xl pl-9 pr-4 py-2.5 text-[#F1F5F9] placeholder-[#475569] text-sm focus:outline-none focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            >
              {searching ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
              ) : 'Search'}
            </button>
          </form>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-1.5 overflow-hidden"
              >
                {searchResults.map(profile => {
                  const alreadyFriend = existingIds.has(profile.id)
                  return (
                    <div key={profile.id} className="flex items-center justify-between bg-[#161B27] border border-[#2E3D52] rounded-xl px-4 py-3">
                      <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                          {profile.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#F1F5F9] group-hover:text-indigo-300 transition-colors">
                          {profile.username}
                        </span>
                      </Link>
                      {alreadyFriend ? (
                        <span className="text-xs text-[#475569] flex items-center gap-1"><Check size={12} /> Connected</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(profile.id)}
                          disabled={actionLoading === profile.id}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#6366F1] hover:text-indigo-300 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === profile.id ? (
                            <span className="w-3 h-3 border border-[#6366F1]/30 border-t-[#6366F1] rounded-full animate-spin block" />
                          ) : <UserPlus size={13} />}
                          Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Pending requests received */}
        <AnimatePresence>
          {pendingReceived.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-[#0D1117] border border-[#10B981]/20 rounded-2xl p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
                Friend Requests <span className="ml-1 bg-[#10B981]/20 text-[#10B981] text-[10px] px-2 py-0.5 rounded-full">{pendingReceived.length}</span>
              </p>
              <div className="space-y-2">
                {pendingReceived.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-[#161B27] border border-[#1E2A3A] rounded-xl px-4 py-3">
                    <Link href={`/profile/${f.profile.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                        {f.profile.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[#F1F5F9] group-hover:text-indigo-300 transition-colors">
                        {f.profile.username}
                      </span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptRequest(f.id)}
                        disabled={actionLoading === f.id}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        onClick={() => removeFriend(f.id)}
                        disabled={actionLoading === f.id}
                        className="flex items-center gap-1 text-xs text-[#475569] hover:text-[#EF4444] disabled:opacity-50 transition-colors p-1.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friends list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-3">
            Your Friends
            <span className="ml-2 text-[#2E3D52] font-normal normal-case tracking-normal">({accepted.length})</span>
          </p>
          {accepted.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-[#161B27] border border-[#2E3D52] flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-[#2E3D52]" />
              </div>
              <p className="text-sm text-[#475569]">No friends yet.</p>
              <p className="text-xs text-[#2E3D52] mt-1">Search for players above to connect.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accepted.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between bg-[#161B27] border border-[#1E2A3A] rounded-xl px-4 py-3 group hover:border-[#2E3D52] transition-colors"
                >
                  <Link href={`/profile/${f.profile.id}`} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                      {f.profile.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[#F1F5F9] group-hover:text-indigo-300 transition-colors">
                      {f.profile.username}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/compare/${f.profile.id}`}
                      className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#6366F1] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#6366F1]/10"
                    >
                      <Swords size={12} /> Compare
                    </Link>
                    <button
                      onClick={() => removeFriend(f.id)}
                      disabled={actionLoading === f.id}
                      className="text-xs text-[#2E3D52] hover:text-[#EF4444] disabled:opacity-50 transition-colors p-1.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sent requests */}
        <AnimatePresence>
          {pendingSent.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-3">Pending Sent</p>
              <div className="space-y-2">
                {pendingSent.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-[#161B27] border border-[#1E2A3A] rounded-xl px-4 py-3">
                    <Link href={`/profile/${f.profile.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                        {f.profile.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[#F1F5F9] group-hover:text-indigo-300 transition-colors">
                        {f.profile.username}
                      </span>
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
                        <Clock size={11} /> Pending
                      </span>
                      <button
                        onClick={() => removeFriend(f.id)}
                        disabled={actionLoading === f.id}
                        className="text-xs text-[#2E3D52] hover:text-[#EF4444] disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
