import { ClashRoyaleStats } from '@/lib/types'

interface Props {
  username: string
  data: ClashRoyaleStats
}

export default function ClashRoyaleCard({ username, data }: Props) {
  const winRate = data.wins && data.losses
    ? Math.round((data.wins / (data.wins + data.losses)) * 100)
    : null

  return (
    <div className="bg-[#1a1a24] border border-blue-500/30 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl">
          👑
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Clash Royale</h3>
          <p className="text-blue-400 text-xs">{username}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f0f13] rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Trophies</p>
          <p className="text-lg font-bold text-blue-400">{data.trophies.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f13] rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Best</p>
          <p className="text-lg font-bold text-blue-300">{data.bestTrophies.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {data.arena ? (
            <span>Arena: <span className="text-white">{data.arena.name}</span></span>
          ) : (
            <span>In-game: <span className="text-white">{data.name}</span></span>
          )}
        </span>
        {winRate !== null && (
          <span>Win rate: <span className="text-blue-400 font-medium">{winRate}%</span></span>
        )}
      </div>
    </div>
  )
}
