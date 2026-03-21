'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Swords, Target, Users, Bot, Award, Star, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrawlStarsStats } from '@/lib/types'

const COLOR = '#FBBF24'
const GLOW  = 'rgba(251, 191, 36, 0.15)'

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

interface BattlePlayer {
  tag: string
  name: string
  brawler: { name: string }
}

interface BattleItem {
  battleTime: string
  battle: {
    teams?: BattlePlayer[][]
    players?: BattlePlayer[]
  }
}

interface DayInsights {
  favTag: string
  favName: string
  favCount: number
  topBrawler: string
  topBrawlerCount: number
}

function todayUTCPrefix() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function analyzeBattlelog(items: BattleItem[], playerTag: string): DayInsights | null {
  const prefix = todayUTCPrefix()
  const cleanSelf = playerTag.replace(/^#/, '').toUpperCase()

  const friendCounts = new Map<string, number>()
  const friendNames  = new Map<string, string>()
  const brawlerCounts = new Map<string, number>()

  for (const item of items) {
    if (!item.battleTime.startsWith(prefix)) continue

    const allPlayers: BattlePlayer[] = item.battle.teams
      ? item.battle.teams.flat()
      : (item.battle.players ?? [])

    for (const p of allPlayers) {
      const cleanTag = p.tag.replace(/^#/, '').toUpperCase()
      if (cleanTag === cleanSelf) {
        // This is the current player — record their brawler
        if (p.brawler?.name) {
          brawlerCounts.set(p.brawler.name, (brawlerCounts.get(p.brawler.name) ?? 0) + 1)
        }
      } else {
        friendCounts.set(cleanTag, (friendCounts.get(cleanTag) ?? 0) + 1)
        friendNames.set(cleanTag, p.name)
      }
    }
  }

  if (friendCounts.size === 0 && brawlerCounts.size === 0) return null

  const [favTag = '', favCount = 0] = [...friendCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  const [topBrawler = '', topBrawlerCount = 0] = [...brawlerCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []

  return {
    favTag,
    favName: friendNames.get(favTag) ?? favTag,
    favCount,
    topBrawler,
    topBrawlerCount,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { username: string; data: BrawlStarsStats }

export default function BrawlStarsCard({ username, data }: Props) {
  const victories3v3 = data['3vs3Victories'] ?? 0
  const topBrawlers  = data.brawlers
    ? [...data.brawlers].sort((a, b) => b.trophies - a.trophies).slice(0, 3)
    : []

  const animatedTrophies = useCountUp(data.trophies)
  const animatedBest     = useCountUp(data.highestTrophies)
  const animated3v3      = useCountUp(victories3v3)
  const animatedSolo     = useCountUp(data.soloVictories ?? 0)
  const animatedDuo      = useCountUp(data.duoVictories ?? 0)

  // Flip state
  const [flipped, setFlipped]   = useState(false)
  const [shaking, setShaking]   = useState(false)
  // undefined = not yet fetched, null = fetched / no data
  const [insights, setInsights] = useState<DayInsights | null | undefined>(undefined)
  const [insightsLoading, setInsightsLoading] = useState(false)

  async function fetchInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch(`/api/brawlstars-battlelog?tag=${encodeURIComponent(username)}`)
      if (!res.ok) { setInsights(null); return }
      const { items }: { items: BattleItem[] } = await res.json()
      setInsights(analyzeBattlelog(items ?? [], username))
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
          : { duration: 0.4, ease: 'easeOut', delay: 0.05 }
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
                <img src="/logos/brawlstars.png" alt="Brawl Stars" className="w-9 h-9 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLOR }}>Brawl Stars</p>
                  <p className="text-sm font-medium text-[#94A3B8] truncate">{data.name || username}</p>
                </div>
                <span className="text-xs bg-[#161B27] border border-[#2E3D52] text-[#FBBF24] px-2 py-0.5 rounded-full font-medium">
                  Lv.{data.expLevel}
                </span>
              </div>

              {/* Main stat */}
              <div className="text-center py-2">
                <p className="text-5xl font-bold tabular-nums" style={{ color: COLOR }}>
                  {animatedTrophies.toLocaleString()}
                </p>
                <p className="text-xs text-[#475569] uppercase tracking-wider mt-1">Trophies</p>
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-3 gap-2">
                <Tile icon={<Trophy size={11} />} label="Best Ever"  value={animatedBest.toLocaleString()} color={COLOR} />
                <Tile icon={<Swords size={11} />} label="3v3 Wins"   value={animated3v3.toLocaleString()}  color={COLOR} />
                <Tile icon={<Target size={11} />} label="Solo Wins"  value={animatedSolo.toLocaleString()} color={COLOR} />
                <Tile icon={<Users size={11} />}  label="Duo Wins"   value={animatedDuo.toLocaleString()}  color={COLOR} />
                <Tile icon={<Bot size={11} />}    label="Brawlers"   value={data.brawlers ? String(data.brawlers.length) : '—'} color={COLOR} />
                <Tile icon={<Award size={11} />}  label="Power Play" value={data.highestPowerPlayPoints?.toLocaleString() ?? '—'} color={COLOR} />
              </div>

              {/* Club */}
              {data.club?.name && (
                <p className="text-xs text-[#475569] text-center truncate">
                  <span className="text-[#2E3D52]">Club:</span>{' '}
                  <span className="text-[#94A3B8]">{data.club.name}</span>
                </p>
              )}

              {/* Top brawlers */}
              {topBrawlers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wider">Top Brawlers</p>
                  {topBrawlers.map((b, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#161B27] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#475569] w-4">{i + 1}.</span>
                        <span className="text-sm text-[#F1F5F9] font-medium">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[#FBBF24]/60">Pw.{b.power}</span>
                        <div className="flex items-center gap-1 font-semibold" style={{ color: COLOR }}>
                          <Trophy size={10} />
                          <span>{b.trophies.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Click hint */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-[#1E2A3A]">
                <Star size={10} className="text-[#FBBF24]/50" />
                <p className="text-[10px] text-[#475569]">Click to see today&apos;s battle insights</p>
              </div>
            </div>
          </div>

          {/* ── BACK ────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 bg-[#0D1117] border border-yellow-500/30 rounded-2xl flex flex-col overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="h-[3px] bg-gradient-to-r from-yellow-400 to-amber-500" />

            <div className="flex-1 flex flex-col justify-center p-5 gap-5">
              {insightsLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin block" />
                  <p className="text-xs text-[#475569]">Checking today&apos;s battles…</p>
                </div>
              ) : insights === null ? (
                <div className="text-center space-y-2">
                  <p className="text-3xl">⚔️</p>
                  <p className="text-sm font-semibold text-[#94A3B8]">No battles today yet!</p>
                  <p className="text-xs text-[#475569]">Come back after a match.</p>
                </div>
              ) : insights ? (
                <>
                  {/* Section 1: Favourite opponent */}
                  {insights.favCount > 0 && (
                    <div className="bg-[#161B27] border border-yellow-500/20 rounded-2xl p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <Swords size={11} className="text-yellow-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
                          Favourite Today
                        </p>
                        <Swords size={11} className="text-yellow-400" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-lg shadow-yellow-400/20">
                        {insights.favName[0]?.toUpperCase()}
                      </div>
                      <p className="text-base font-bold text-[#F1F5F9] break-all leading-tight">{insights.favName}</p>
                      <p className="text-xs text-[#94A3B8]">
                        Shared <span className="text-yellow-400 font-bold">{insights.favCount}</span>{' '}
                        {insights.favCount === 1 ? 'battle' : 'battles'} today
                      </p>
                    </div>
                  )}

                  {/* Section 2: Most used brawler */}
                  {insights.topBrawlerCount > 0 && (
                    <div className="bg-[#161B27] border border-yellow-500/20 rounded-2xl p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <Bot size={11} className="text-yellow-400" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
                          Most Used Brawler
                        </p>
                      </div>
                      <p className="text-xl font-bold text-[#F1F5F9]">{insights.topBrawler}</p>
                      <p className="text-xs text-[#94A3B8]">
                        Used <span className="text-yellow-400 font-bold">{insights.topBrawlerCount}</span>{' '}
                        {insights.topBrawlerCount === 1 ? 'time' : 'times'} today
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

function Tile({ icon, label, value, color }: {
  icon: ReactNode; label: string; value: string; color: string
}) {
  return (
    <div className="rounded-xl p-3 bg-[#161B27] border-l-2" style={{ borderLeftColor: color + '60' }}>
      <div className="flex items-center gap-1 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums text-[#F1F5F9]">{value}</p>
    </div>
  )
}
