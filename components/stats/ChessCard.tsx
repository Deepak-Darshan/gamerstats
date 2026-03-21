'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Rocket, Wind, Puzzle, Gamepad2, Star, RotateCcw, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChessStats } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const COLOR   = '#F59E0B'
const GLOW    = 'rgba(245, 158, 11, 0.15)'
const SURFACE = '#161B27'

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}

interface ChessGame {
  end_time: number
  white: { username: string }
  black: { username: string }
}

interface FavFriend {
  opponent: string
  gameCount: number
  gsUserId: string | null
  gsUsername: string | null
}

interface Props { username: string; data: ChessStats }

export default function ChessCard({ username, data }: Props) {
  const blitz  = data.chess_blitz
  const rapid  = data.chess_rapid
  const bullet = data.chess_bullet
  const mainRating   = rapid?.last?.rating ?? blitz?.last?.rating ?? 0
  const puzzleRating = data.tactics?.highest?.rating ?? 0
  const totalGames   = sumRecord(blitz?.record) + sumRecord(rapid?.record) + sumRecord(bullet?.record)
  const countryCode  = data.country?.split('/').pop()
  const lastOnline   = formatLastOnline(data.last_online)
  const animatedMain   = useCountUp(mainRating)
  const animatedPuzzle = useCountUp(puzzleRating)
  const animatedGames  = useCountUp(totalGames)

  // Flip state
  const [flipped, setFlipped]       = useState(false)
  const [shaking, setShaking]       = useState(false)
  // undefined = not yet fetched, null = fetched but no result
  const [favFriend, setFavFriend]   = useState<FavFriend | null | undefined>(undefined)
  const [friendLoading, setFriendLoading] = useState(false)

  async function fetchFavFriend() {
    setFriendLoading(true)
    try {
      const res = await fetch(`/api/chess-games?username=${encodeURIComponent(username)}`)
      if (!res.ok) { setFavFriend(null); return }
      const { games }: { games: ChessGame[] } = await res.json()

      // Filter to today UTC
      const todayStart = new Date()
      todayStart.setUTCHours(0, 0, 0, 0)
      const todayStartTs = Math.floor(todayStart.getTime() / 1000)
      const todayGames = games.filter(g => g.end_time >= todayStartTs)

      if (todayGames.length === 0) { setFavFriend(null); return }

      const userLower = username.toLowerCase()
      const counts = new Map<string, number>()
      for (const g of todayGames) {
        const opp = g.white.username.toLowerCase() === userLower
          ? g.black.username
          : g.white.username
        const key = opp.toLowerCase()
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      const [favKey, gameCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]

      // Check if opponent has a GamerStats account
      const { data: gsAccount } = await supabase
        .from('linked_accounts')
        .select('user_id')
        .eq('platform', 'chess')
        .ilike('platform_username', favKey)
        .maybeSingle()

      let gsUsername: string | null = null
      if (gsAccount?.user_id) {
        const { data: profile } = await supabase
          .from('profiles').select('username').eq('id', gsAccount.user_id).maybeSingle()
        gsUsername = profile?.username ?? null
      }

      setFavFriend({
        opponent: favKey,
        gameCount,
        gsUserId: gsAccount?.user_id ?? null,
        gsUsername,
      })
    } catch {
      setFavFriend(null)
    } finally {
      setFriendLoading(false)
    }
  }

  function handleClick() {
    if (shaking) return
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      const next = !flipped
      setFlipped(next)
      if (next && favFriend === undefined) fetchFavFriend()
    }, 420)
  }

  return (
    // Perspective wrapper
    <div style={{ perspective: '1200px' }}>
      {/* Shake + hover wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={shaking
          ? { opacity: 1, y: 0, rotate: [-3, 3, -2, 2, -1, 0] }
          : { opacity: 1, y: 0, rotate: 0 }
        }
        transition={shaking
          ? { duration: 0.42, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
          : { duration: 0.4 }
        }
        whileHover={!shaking ? { scale: 1.02, boxShadow: `0 0 40px ${GLOW}` } : {}}
        onClick={handleClick}
        className="cursor-pointer"
        style={{ transition: 'box-shadow 0.2s' }}
      >
        {/* Flip inner */}
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        >

          {/* ── FRONT ─────────────────────────────────────────────── */}
          <div
            className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden flex flex-col"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="h-[3px]" style={{ background: COLOR }} />

            <div className="p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                {data.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.avatar} alt={username} className="w-9 h-9 rounded-xl object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/logos/chess.png" alt="Chess.com" className="w-9 h-9 rounded-xl object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider">Chess.com</p>
                  <p className="text-sm font-medium text-[#94A3B8] truncate">{username}</p>
                </div>
                <div className="text-right text-xs text-[#475569]">
                  {countryCode && <p className="font-medium">{countryCode}</p>}
                  {lastOnline  && <p className="mt-0.5">{lastOnline}</p>}
                </div>
              </div>

              {/* Main stat */}
              <div className="text-center py-2">
                <p className="text-5xl font-bold tabular-nums" style={{ color: COLOR }}>
                  {animatedMain > 0 ? animatedMain.toLocaleString() : '—'}
                </p>
                <p className="text-xs text-[#475569] uppercase tracking-wider mt-1">
                  {rapid?.last?.rating ? 'Rapid Rating' : 'Blitz Rating'}
                </p>
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-3 gap-2">
                <Tile icon={<Zap size={11} />}    label="Blitz"  value={blitz?.last?.rating}  record={blitz?.record}  color={COLOR} surface={SURFACE} />
                <Tile icon={<Rocket size={11} />} label="Rapid"  value={rapid?.last?.rating}  record={rapid?.record}  color={COLOR} surface={SURFACE} />
                <Tile icon={<Wind size={11} />}   label="Bullet" value={bullet?.last?.rating} record={bullet?.record} color={COLOR} surface={SURFACE} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SimpleTile icon={<Puzzle size={11} />}   label="Best Puzzle" value={animatedPuzzle > 0 ? animatedPuzzle.toLocaleString() : '—'} color={COLOR} surface={SURFACE} />
                <SimpleTile icon={<Gamepad2 size={11} />} label="Total Games" value={animatedGames  > 0 ? animatedGames.toLocaleString()  : '—'} color={COLOR} surface={SURFACE} />
              </div>

              {/* Click hint */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-[#1E2A3A]">
                <Star size={10} className="text-[#F59E0B]/50" />
                <p className="text-[10px] text-[#475569]">Click to reveal today&apos;s favourite opponent</p>
              </div>
            </div>
          </div>

          {/* ── BACK ──────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 bg-[#0D1117] border border-amber-500/30 rounded-2xl flex flex-col overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
              {friendLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin block" />
                  <p className="text-xs text-[#475569]">Checking today&apos;s games…</p>
                </div>
              ) : favFriend === null ? (
                <div className="text-center space-y-2">
                  <p className="text-3xl">♟</p>
                  <p className="text-sm font-semibold text-[#94A3B8]">No games played today yet!</p>
                  <p className="text-xs text-[#475569]">Come back after a match.</p>
                </div>
              ) : favFriend ? (
                <div className="text-center space-y-4 w-full">
                  {/* Label */}
                  <div className="flex items-center justify-center gap-1.5">
                    <Star size={11} className="text-amber-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                      Favourite Opponent Today
                    </p>
                    <Star size={11} className="text-amber-400" />
                  </div>

                  {/* Opponent avatar placeholder + name */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-amber-500/20">
                      {favFriend.opponent[0]?.toUpperCase()}
                    </div>
                    <p className="text-xl font-bold text-[#F1F5F9] break-all">{favFriend.opponent}</p>
                    <p className="text-sm text-[#94A3B8]">
                      Played <span className="text-amber-400 font-bold">{favFriend.gameCount}</span>{' '}
                      {favFriend.gameCount === 1 ? 'game' : 'games'} together today
                    </p>
                  </div>

                  {/* GamerStats badge */}
                  {favFriend.gsUserId && (
                    <Link
                      href={`/profile/${favFriend.gsUserId}`}
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-indigo-500/20 transition-colors"
                    >
                      Also on GamerStats!
                      <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
              ) : null}
            </div>

            {/* Flip back hint */}
            <div className="p-4 border-t border-[#1E2A3A] flex items-center justify-center gap-1.5">
              <RotateCcw size={11} className="text-[#475569]" />
              <p className="text-[10px] text-[#475569]">Click to flip back</p>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Tile({ icon, label, value, record, color, surface }: {
  icon: ReactNode; label: string
  value?: number; record?: { win: number; draw: number; loss: number }
  color: string; surface: string
}) {
  return (
    <div className="rounded-xl p-3 border-l-2" style={{ background: surface, borderLeftColor: color + '60' }}>
      <div className="flex items-center gap-1 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums text-[#F1F5F9]">{value ?? '—'}</p>
      {record && (
        <p className="text-[10px] mt-0.5 space-x-1">
          <span className="text-[#10B981]">{record.win}W</span>
          <span className="text-[#475569]">{record.draw}D</span>
          <span className="text-[#EF4444]">{record.loss}L</span>
        </p>
      )}
    </div>
  )
}

function SimpleTile({ icon, label, value, color, surface }: {
  icon: ReactNode; label: string; value: string; color: string; surface: string
}) {
  return (
    <div className="rounded-xl p-3 border-l-2" style={{ background: surface, borderLeftColor: color + '60' }}>
      <div className="flex items-center gap-1 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums text-[#F1F5F9]">{value}</p>
    </div>
  )
}

function sumRecord(r?: { win: number; draw: number; loss: number }) {
  return r ? r.win + r.draw + r.loss : 0
}

function formatLastOnline(ts?: number) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts * 1000) / 86400000)
  if (diff === 0) return 'online today'
  if (diff === 1) return 'yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(ts * 1000).toLocaleDateString()
}
