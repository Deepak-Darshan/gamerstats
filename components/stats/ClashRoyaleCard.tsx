'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star, BarChart2, Swords, Shield, Gamepad2, Crown, Target, Heart } from 'lucide-react'
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${GLOW}` }}
      className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden flex flex-col"
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
          <Tile icon={<Star size={11} />}    label="Best"      value={animatedBest.toLocaleString()}     color={COLOR} />
          <Tile icon={<BarChart2 size={11} />} label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} color={COLOR} />
          <Tile icon={<Crown size={11} />}   label="3-Crown W" value={data.threeCrownWins?.toLocaleString() ?? '—'} color={COLOR} />
        </div>

        {/* Battle record */}
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<Swords size={11} />}  label="Wins"    value={animatedWins.toLocaleString()}    color="#10B981" accent="green" />
          <Tile icon={<Shield size={11} />}  label="Losses"  value={animatedLosses.toLocaleString()}  color="#EF4444" accent="red" />
          <Tile icon={<Gamepad2 size={11} />} label="Battles" value={animatedBattles.toLocaleString()} color={COLOR} />
        </div>

        {/* Challenge + favourite card */}
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={<Target size={11} />} label="Ch. Wins"  value={data.challengeMaxWins?.toLocaleString() ?? '—'}   color={COLOR} />
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
      </div>
    </motion.div>
  )
}

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
