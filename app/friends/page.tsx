'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    await supabase.from('friendships').insert({
      user_id: userId,
      friend_id: targetId,
      status: 'pending',
    })
    await loadFriends(userId)
    setSearchResults(prev => prev.filter(p => p.id !== targetId))
    setActionLoading(null)
  }

  async function acceptRequest(friendshipId: string) {
    setActionLoading(friendshipId)
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
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
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <h2 className="text-2xl font-bold text-white">Friends</h2>

        {/* Search */}
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Find Players</h3>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by username..."
              className="flex-1 bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map(profile => {
                const alreadyFriend = existingIds.has(profile.id)
                return (
                  <div key={profile.id} className="flex items-center justify-between bg-[#0f0f13] rounded-lg px-4 py-3">
                    <Link href={`/profile/${profile.id}`} className="text-white hover:text-indigo-300 font-medium">
                      {profile.username}
                    </Link>
                    {alreadyFriend ? (
                      <span className="text-xs text-gray-500">Already connected</span>
                    ) : (
                      <button
                        onClick={() => sendRequest(profile.id)}
                        disabled={actionLoading === profile.id}
                        className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === profile.id ? 'Sending...' : 'Add Friend'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending requests received */}
        {pendingReceived.length > 0 && (
          <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Friend Requests</h3>
            <div className="space-y-2">
              {pendingReceived.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-[#0f0f13] rounded-lg px-4 py-3">
                  <Link href={`/profile/${f.profile.id}`} className="text-white hover:text-indigo-300 font-medium">
                    {f.profile.username}
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(f.id)}
                      disabled={actionLoading === f.id}
                      className="text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => removeFriend(f.id)}
                      disabled={actionLoading === f.id}
                      className="text-sm text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">
            Your Friends <span className="text-gray-500 font-normal text-sm">({accepted.length})</span>
          </h3>
          {accepted.length === 0 ? (
            <p className="text-gray-500 text-sm">No friends yet. Search for players above.</p>
          ) : (
            <div className="space-y-2">
              {accepted.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-[#0f0f13] rounded-lg px-4 py-3">
                  <Link href={`/profile/${f.profile.id}`} className="text-white hover:text-indigo-300 font-medium">
                    {f.profile.username}
                  </Link>
                  <button
                    onClick={() => removeFriend(f.id)}
                    disabled={actionLoading === f.id}
                    className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sent requests */}
        {pendingSent.length > 0 && (
          <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Pending Sent</h3>
            <div className="space-y-2">
              {pendingSent.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-[#0f0f13] rounded-lg px-4 py-3">
                  <Link href={`/profile/${f.profile.id}`} className="text-white hover:text-indigo-300 font-medium">
                    {f.profile.username}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-yellow-500">Pending</span>
                    <button
                      onClick={() => removeFriend(f.id)}
                      disabled={actionLoading === f.id}
                      className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
