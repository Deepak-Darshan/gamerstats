import { BrawlStarsStats } from '@/lib/types'

interface Props {
  username: string
  data: BrawlStarsStats
}

export default function BrawlStarsCard({ username, data }: Props) {
  return (
    <div className="bg-[#1a1a24] border border-yellow-500/30 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-xl">
          ⭐
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Brawl Stars</h3>
          <p className="text-yellow-400 text-xs">{username}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f0f13] rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Trophies</p>
          <p className="text-lg font-bold text-yellow-400">{data.trophies.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f13] rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Best</p>
          <p className="text-lg font-bold text-yellow-300">{data.highestTrophies.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>In-game: <span className="text-white">{data.name}</span></span>
        <span>Level <span className="text-yellow-400 font-medium">{data.expLevel}</span></span>
      </div>
    </div>
  )
}
