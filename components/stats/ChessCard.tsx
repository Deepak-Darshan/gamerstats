import { Zap, Rocket, Wind, Puzzle, Gamepad2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChessStats } from '@/lib/types'

interface Props {
  username: string
  data: ChessStats
}

export default function ChessCard({ username, data }: Props) {
  const blitz = data.chess_blitz
  const rapid = data.chess_rapid
  const bullet = data.chess_bullet
  const puzzleRating = data.tactics?.highest?.rating

  const totalGames =
    sumRecord(blitz?.record) + sumRecord(rapid?.record) + sumRecord(bullet?.record)

  const countryCode = data.country?.split('/').pop()
  const lastOnline = formatLastOnline(data.last_online)

  return (
    <div className="bg-[#1a1a24] border border-amber-500/30 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {data.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatar} alt={username} className="w-10 h-10 rounded-lg object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <span className="text-amber-400 font-bold text-base">♟</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">Chess.com</h3>
          <p className="text-amber-400 text-xs truncate">{username}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          {countryCode && <p>{countryCode}</p>}
          {data.last_online && <p className="text-gray-600">{lastOnline}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <RatingTile icon={<Zap size={11} />} label="Blitz" mode={blitz} />
        <RatingTile icon={<Rocket size={11} />} label="Rapid" mode={rapid} />
        <RatingTile icon={<Wind size={11} />} label="Bullet" mode={bullet} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0f0f13] rounded-lg p-3">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Puzzle size={11} />
            <span>Puzzles</span>
          </div>
          <p className="text-base font-bold text-amber-400">{puzzleRating ?? '—'}</p>
          <p className="text-xs text-gray-600 mt-0.5">highest</p>
        </div>
        <div className="bg-[#0f0f13] rounded-lg p-3">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Gamepad2 size={11} />
            <span>Total Games</span>
          </div>
          <p className="text-base font-bold text-amber-400">
            {totalGames > 0 ? totalGames.toLocaleString() : '—'}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">all modes</p>
        </div>
      </div>
    </div>
  )
}

function RatingTile({ icon, label, mode }: {
  icon: ReactNode
  label: string
  mode?: { last?: { rating: number }; record?: { win: number; draw: number; loss: number } }
}) {
  const rating = mode?.last?.rating
  const r = mode?.record
  return (
    <div className="bg-[#0f0f13] rounded-lg p-3">
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-base font-bold text-amber-400">{rating ?? '—'}</p>
      {r ? (
        <p className="text-xs text-gray-600 mt-0.5">
          <span className="text-green-600">{r.win}W</span>
          {' '}<span className="text-gray-500">{r.draw}D</span>
          {' '}<span className="text-red-700">{r.loss}L</span>
        </p>
      ) : (
        <p className="text-xs text-gray-700 mt-0.5">no record</p>
      )}
    </div>
  )
}

function sumRecord(r?: { win: number; draw: number; loss: number }): number {
  if (!r) return 0
  return r.win + r.draw + r.loss
}

function formatLastOnline(ts?: number): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts * 1000) / 86400000)
  if (diff === 0) return 'online today'
  if (diff === 1) return 'yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(ts * 1000).toLocaleDateString()
}
