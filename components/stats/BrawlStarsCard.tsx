'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Swords, Target, Users, Bot, Award } from 'lucide-react'
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
      whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${GLOW}` }}
      className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden flex flex-col"
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
          <Tile icon={<Trophy size={11} />}  label="Best Ever"   value={animatedBest.toLocaleString()} color={COLOR} />
          <Tile icon={<Swords size={11} />}  label="3v3 Wins"    value={animated3v3.toLocaleString()}  color={COLOR} />
          <Tile icon={<Target size={11} />}  label="Solo Wins"   value={animatedSolo.toLocaleString()} color={COLOR} />
          <Tile icon={<Users size={11} />}   label="Duo Wins"    value={animatedDuo.toLocaleString()}  color={COLOR} />
          <Tile icon={<Bot size={11} />}     label="Brawlers"    value={data.brawlers ? String(data.brawlers.length) : '—'} color={COLOR} />
          <Tile icon={<Award size={11} />}   label="Power Play"  value={data.highestPowerPlayPoints?.toLocaleString() ?? '—'} color={COLOR} />
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
      </div>
    </motion.div>
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
