import { Trophy, Swords, Target, Users, Bot, Award, Home } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrawlStarsStats } from '@/lib/types'

interface Props {
  username: string
  data: BrawlStarsStats
}

export default function BrawlStarsCard({ username, data }: Props) {
  const victories3v3 = data['3vs3Victories']
  const topBrawlers = data.brawlers
    ? [...data.brawlers].sort((a, b) => b.trophies - a.trophies).slice(0, 3)
    : []

  return (
    <div className="bg-[#1a1a24] border border-yellow-500/30 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
          <span className="text-yellow-400 text-xs font-bold">BS</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">Brawl Stars</h3>
          <p className="text-yellow-400 text-xs truncate">{data.name || username}</p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
            Lv. {data.expLevel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<Trophy size={11} />} label="Trophies" value={data.trophies.toLocaleString()} />
        <Tile icon={<Award size={11} />} label="Best Ever" value={data.highestTrophies.toLocaleString()} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Victories</p>
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<Swords size={11} />} label="3v3" value={victories3v3?.toLocaleString() ?? '—'} />
          <Tile icon={<Target size={11} />} label="Solo" value={data.soloVictories?.toLocaleString() ?? '—'} />
          <Tile icon={<Users size={11} />} label="Duo" value={data.duoVictories?.toLocaleString() ?? '—'} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile
          icon={<Bot size={11} />}
          label="Brawlers"
          value={data.brawlers ? String(data.brawlers.length) : '—'}
        />
        <Tile
          icon={<Trophy size={11} />}
          label="Power Play"
          value={data.highestPowerPlayPoints?.toLocaleString() ?? '—'}
        />
        <Tile
          icon={<Home size={11} />}
          label="Club"
          value={data.club?.name ?? 'None'}
          small
        />
      </div>

      {topBrawlers.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Top Brawlers</p>
          <div className="flex flex-col gap-1">
            {topBrawlers.map((b, i) => (
              <div key={i} className="flex items-center justify-between bg-[#0f0f13] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-4">{i + 1}.</span>
                  <span className="text-sm text-white font-medium">{b.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="text-yellow-600">Pw.{b.power}</span>
                  <div className="flex items-center gap-1 text-yellow-400 font-medium">
                    <Trophy size={11} />
                    <span>{b.trophies.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ icon, label, value, small }: {
  icon: ReactNode
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="bg-[#0f0f13] rounded-lg p-3">
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`font-bold text-yellow-400 truncate ${small ? 'text-xs' : 'text-base'}`}>
        {value}
      </p>
    </div>
  )
}
