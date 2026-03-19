import { ChessStats } from '@/lib/types'

interface Props {
  username: string
  data: ChessStats
}

export default function ChessCard({ username, data }: Props) {
  const rapid = data.chess_rapid?.last?.rating
  const blitz = data.chess_blitz?.last?.rating
  const bullet = data.chess_bullet?.last?.rating

  return (
    <div className="bg-[#1a1a24] border border-amber-500/30 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-xl">
          ♟️
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Chess.com</h3>
          <p className="text-amber-400 text-xs">{username}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Rapid" value={rapid} color="amber" />
        <StatBox label="Blitz" value={blitz} color="amber" />
        <StatBox label="Bullet" value={bullet} color="amber" />
      </div>

      {data.fide && (
        <p className="text-xs text-gray-400">FIDE Rating: <span className="text-amber-300 font-medium">{data.fide}</span></p>
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div className="bg-[#0f0f13] rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold text-${color}-400`}>
        {value ?? '—'}
      </p>
    </div>
  )
}
