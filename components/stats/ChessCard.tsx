'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Rocket, Wind, Puzzle, Gamepad2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChessStats } from '@/lib/types'

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

interface Props { username: string; data: ChessStats }

export default function ChessCard({ username, data }: Props) {
  const blitz  = data.chess_blitz
  const rapid  = data.chess_rapid
  const bullet = data.chess_bullet
  const mainRating = rapid?.last?.rating ?? blitz?.last?.rating ?? 0
  const puzzleRating = data.tactics?.highest?.rating ?? 0
  const totalGames = sumRecord(blitz?.record) + sumRecord(rapid?.record) + sumRecord(bullet?.record)
  const countryCode = data.country?.split('/').pop()
  const lastOnline  = formatLastOnline(data.last_online)
  const animatedMain   = useCountUp(mainRating)
  const animatedPuzzle = useCountUp(puzzleRating)
  const animatedGames  = useCountUp(totalGames)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${GLOW}` }}
      className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl overflow-hidden flex flex-col"
      style={{ transition: 'box-shadow 0.2s' }}
    >
      {/* Colored top bar */}
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
          <Tile icon={<Zap size={11} />} label="Blitz"   value={blitz?.last?.rating}     record={blitz?.record}  color={COLOR} surface={SURFACE} />
          <Tile icon={<Rocket size={11} />} label="Rapid"  value={rapid?.last?.rating}     record={rapid?.record}  color={COLOR} surface={SURFACE} />
          <Tile icon={<Wind size={11} />} label="Bullet" value={bullet?.last?.rating}    record={bullet?.record} color={COLOR} surface={SURFACE} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SimpleTile icon={<Puzzle size={11} />}   label="Best Puzzle"   value={animatedPuzzle > 0 ? animatedPuzzle.toLocaleString() : '—'} color={COLOR} surface={SURFACE} />
          <SimpleTile icon={<Gamepad2 size={11} />} label="Total Games"   value={animatedGames > 0 ? animatedGames.toLocaleString() : '—'}  color={COLOR} surface={SURFACE} />
        </div>
      </div>
    </motion.div>
  )
}

function Tile({ icon, label, value, record, color, surface }: {
  icon: ReactNode; label: string
  value?: number; record?: { win: number; draw: number; loss: number }
  color: string; surface: string
}) {
  return (
    <div
      className="rounded-xl p-3 border-l-2"
      style={{ background: surface, borderLeftColor: color + '60' }}
    >
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
    <div
      className="rounded-xl p-3 border-l-2"
      style={{ background: surface, borderLeftColor: color + '60' }}
    >
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
