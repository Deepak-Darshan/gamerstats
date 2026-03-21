'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star, BarChart2, Swords, Shield, Gamepad2, Crown, Target, Heart, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { ClashRoyaleStats } from '@/lib/types'

const COLOR   = '#818CF8'
const GLOW    = 'rgba(129, 140, 248, 0.15)'
const SURFACE = '#161B27'

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}

// ── Battlelog types ───────────────────────────────────────────────────────────

interface CRCard {
  name: string
  iconUrls?: { medium?: string }
}

interface CRPlayer {
  tag: string
  name: string
  cards: CRCard[]
}

interface BattleItem {
  battleTime: string
  team: CRPlayer[]
  opponent: CRPlayer[]
}

interface DeckCard {
  name: string
  iconUrl?: string
}

interface DayInsights {
  favName: string
  favCount: number
  topDeck: DeckCard[]
  topDeckCount: number
}

function todayUTCPrefix() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function analyzeBattlelog(battles: BattleItem[], playerTag: string): DayInsights | null {
  const prefix   = todayUTCPrefix()
  const cleanSelf = playerTag.replace(/^#/, '').toUpperCase()

  const oppCounts  = new Map<string, number>()
  const oppNames   = new Map<string, string>()
  const deckCounts = new Map<string, number>()
  const deckCards  = new Map<string, DeckCard[]>()

  for (const b of battles) {
    if (!b.battleTime.startsWith(prefix)) continue

    // Opponents
    for (const opp of (b.opponent ?? [])) {
      const key = opp.tag.replace(/^#/, '').toUpperCase()
      oppCounts.set(key, (oppCounts.get(key) ?? 0) + 1)
      oppNames.set(key, opp.name)
    }

    // Current player's deck — match by tag, fall back to team[0]
    const me = b.team?.find(p => p.tag.replace(/^#/, '').toUpperCase() === cleanSelf)
      ?? b.team?.[0]
    if (me?.cards?.length) {
      const sorted = [...me.cards].sort((a, b) => a.name.localeCompare(b.name))
      const deckKey = sorted.map(c => c.name).join('|')
      deckCounts.set(deckKey, (deckCounts.get(deckKey) ?? 0) + 1)
      // Store card data (with icon URLs) on first encounter
      if (!deckCards.has(deckKey)) {
        deckCards.set(deckKey, sorted.map(c => ({ name: c.name, iconUrl: c.iconUrls?.medium })))
      }
    }
  }

  if (oppCounts.size === 0 && deckCounts.size === 0) return null

  const [favTag = '', favCount = 0]         = [...oppCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  const [topDeckKey = '', topDeckCount = 0] = [...deckCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []

  return {
    favName: oppNames.get(favTag) ?? favTag,
    favCount,
    topDeck: deckCards.get(topDeckKey) ?? [],
    topDeckCount,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { username: string; data: ClashRoyaleStats }

export default function ClashRoyaleCard({ username, data }: Props) {
  const winRate = data.wins && data.battleCount && data.battleCount > 0
    ? Math.round((data.wins / data.battleCount) * 100)
    : null

  const animatedTrophies = useCountUp(data.trophies)
  const animatedBest     = useCountUp(data.bestTrophies)
  const animatedWins     = useCountUp(data.wins ?? 0)
  const animatedLosses   = useCountUp(data.losses ?? 0)
  const animatedBattles  = useCountUp(data.battleCount ?? 0)

  // Flip state
  const [flipped, setFlipped]   = useState(false)
  const [shaking, setShaking]   = useState(false)
  const [insights, setInsights] = useState<DayInsights | null | undefined>(undefined)
  const [insightsLoading, setInsightsLoading] = useState(false)

  async function fetchInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch(`/api/clashroyale-battlelog?tag=${encodeURIComponent(username)}`)
      if (!res.ok) { setInsights(null); return }
      const battles: BattleItem[] = await res.json()
      setInsights(analyzeBattlelog(Array.isArray(battles) ? battles : [], username))
    } catch {
      setInsights(null)
    } finally {
      setInsightsLoading(false)
    }
  }

  function handleClick() {
    if (shaking) return
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      const next = !flipped
      setFlipped(next)
      if (next && insights === undefined) fetchInsights()
    }, 420)
  }

  return (
    <div style={{ perspective: '1200px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={shaking
          ? { opacity: 1, y: 0, rotate: [-3, 3, -2, 2, -1, 0] }
          : { opacity: 1, y: 0, rotate: 0 }
        }
        transition={shaking
          ? { duration: 0.42, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
          : { duration: 0.4, ease: 'easeOut', delay: 0.1 }
        }
        whileHover={!shaking ? { scale: 1.02, boxShadow: `0 0 40px ${GLOW}` } : {}}
        onClick={handleClick}
        className="cursor-pointer"
        style={{ transition: 'box-shadow 0.2s' }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        >

          {/* ── FRONT ───────────────────────────────────────────────── */}
          <div
            className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden flex flex-col"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="h-[3px]" style={{ background: COLOR }} />

            <div className="p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/clashroyale.png" alt="Clash Royale" className="w-9 h-9 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLOR }}>Clash Royale</p>
                  <p className="text-sm font-medium text-[#94A3B8] truncate">{data.name || username}</p>
                </div>
                {(data.arena || data.clan) && (
                  <div className="text-right text-xs">
                    {data.arena && <p className="font-medium" style={{ color: COLOR }}>{data.arena.name}</p>}
                    {data.clan  && <p className="text-[#475569] truncate max-w-[80px]">{data.clan.name}</p>}
                  </div>
                )}
              </div>

              {/* Main stat */}
              <div className="text-center py-2">
                <p className="text-5xl font-bold tabular-nums" style={{ color: COLOR }}>
                  {animatedTrophies.toLocaleString()}
                </p>
                <p className="text-xs text-[#475569] uppercase tracking-wider mt-1">Trophies</p>
              </div>

              {/* Stat tiles — row 1 */}
              <div className="grid grid-cols-3 gap-2">
                <Tile icon={<Star size={11} />}      label="Best"      value={animatedBest.toLocaleString()}                color={COLOR} />
                <Tile icon={<BarChart2 size={11} />} label="Win Rate"  value={winRate !== null ? `${winRate}%` : '—'}       color={COLOR} />
                <Tile icon={<Crown size={11} />}     label="3-Crown W" value={data.threeCrownWins?.toLocaleString() ?? '—'} color={COLOR} />
              </div>

              {/* Battle record */}
              <div className="grid grid-cols-3 gap-2">
                <Tile icon={<Swords size={11} />}   label="Wins"    value={animatedWins.toLocaleString()}    color="#10B981" accent="green" />
                <Tile icon={<Shield size={11} />}   label="Losses"  value={animatedLosses.toLocaleString()}  color="#EF4444" accent="red"   />
                <Tile icon={<Gamepad2 size={11} />} label="Battles" value={animatedBattles.toLocaleString()} color={COLOR} />
              </div>

              {/* Challenge + favourite card */}
              <div className="grid grid-cols-2 gap-2">
                <Tile icon={<Target size={11} />} label="Ch. Wins" value={data.challengeMaxWins?.toLocaleString() ?? '—'} color={COLOR} />
                <FavCardTile card={data.currentFavouriteCard} color={COLOR} />
              </div>

              {/* Donations */}
              {data.totalDonations != null && (
                <div className="rounded-xl p-3 bg-[#161B27] border-l-2 flex items-center gap-2" style={{ borderLeftColor: COLOR + '60' }}>
                  <Heart size={11} style={{ color: COLOR }} />
                  <span className="text-[10px] uppercase tracking-wider text-[#475569]">Donations</span>
                  <span className="ml-auto text-sm font-bold tabular-nums text-[#F1F5F9]">{data.totalDonations.toLocaleString()}</span>
                </div>
              )}

              {/* Click hint */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-[#1E2A3A]">
                <Star size={10} className="text-[#818CF8]/50" />
                <p className="text-[10px] text-[#475569]">Click to see today&apos;s battle insights</p>
              </div>
            </div>
          </div>

          {/* ── BACK ────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 bg-[#0D1117] border border-indigo-500/30 rounded-2xl flex flex-col overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />

            <div className="flex-1 flex flex-col justify-center p-5 gap-4 overflow-y-auto">
              {insightsLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin block" />
                  <p className="text-xs text-[#475569]">Checking today&apos;s battles…</p>
                </div>
              ) : insights === null ? (
                <div className="text-center space-y-2">
                  <p className="text-3xl">🃏</p>
                  <p className="text-sm font-semibold text-[#94A3B8]">No battles today yet!</p>
                  <p className="text-xs text-[#475569]">Come back after a match.</p>
                </div>
              ) : insights ? (
                <>
                  {/* Section 1: Favourite opponent */}
                  {insights.favCount > 0 && (
                    <div className="bg-[#161B27] border border-indigo-500/20 rounded-2xl p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <Swords size={11} className="text-indigo-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                          Favourite Opponent Today
                        </p>
                        <Swords size={11} className="text-indigo-400" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-lg shadow-indigo-500/20">
                        {insights.favName[0]?.toUpperCase()}
                      </div>
                      <p className="text-base font-bold text-[#F1F5F9] break-all leading-tight">{insights.favName}</p>
                      <p className="text-xs text-[#94A3B8]">
                        Faced <span className="font-bold" style={{ color: COLOR }}>{insights.favCount}</span>{' '}
                        {insights.favCount === 1 ? 'time' : 'times'} today
                      </p>
                    </div>
                  )}

                  {/* Section 2: Most used deck */}
                  {insights.topDeck.length > 0 && (
                    <div className="bg-[#161B27] border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Crown size={11} className="text-indigo-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                          Most Used Deck Today
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {insights.topDeck.slice(0, 8).map((card, i) => (
                          <div
                            key={i}
                            className="bg-[#0D1117] border border-indigo-500/20 rounded-lg p-1 flex flex-col items-center gap-0.5"
                            title={card.name}
                          >
                            {card.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={card.iconUrl} alt={card.name} className="w-10 h-10 object-contain" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-indigo-500/10 flex items-center justify-center">
                                <Crown size={14} className="text-indigo-400/50" />
                              </div>
                            )}
                            <p className="text-[8px] text-[#475569] leading-tight text-center line-clamp-1 w-full">{card.name}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#475569] text-center">
                        Used <span className="font-bold" style={{ color: COLOR }}>{insights.topDeckCount}</span>{' '}
                        {insights.topDeckCount === 1 ? 'time' : 'times'} today
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Flip back hint */}
            <div className="p-4 border-t border-[#1E2A3A] flex items-center justify-center gap-1.5 flex-shrink-0">
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

function Tile({ icon, label, value, color, accent }: {
  icon: ReactNode; label: string; value: string; color: string; accent?: 'green' | 'red'
}) {
  const valueColor = accent === 'green' ? '#10B981' : accent === 'red' ? '#EF4444' : '#F1F5F9'
  return (
    <div className="rounded-xl p-3 bg-[#161B27] border-l-2" style={{ borderLeftColor: color + '60' }}>
      <div className="flex items-center gap-1 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums" style={{ color: valueColor }}>{value}</p>
    </div>
  )
}

function FavCardTile({ card, color }: {
  card?: { name: string; iconUrls?: { medium: string } }; color: string
}) {
  return (
    <div className="rounded-xl p-3 bg-[#161B27] border-l-2 flex items-center gap-2" style={{ borderLeftColor: color + '60' }}>
      {card?.iconUrls?.medium ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.iconUrls.medium} alt={card.name} className="w-7 h-7 object-contain" />
      ) : (
        <Star size={16} style={{ color }} className="opacity-40" />
      )}
      <div className="min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Fav Card</span>
        <p className="text-xs font-bold truncate" style={{ color }}>{card?.name ?? '—'}</p>
      </div>
    </div>
  )
}
