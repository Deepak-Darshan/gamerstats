import { Trophy, Star, BarChart2, Swords, Shield, Gamepad2, Crown, Target, Heart } from 'lucide-react'
import type { ReactNode } from 'react'
import { ClashRoyaleStats } from '@/lib/types'

interface Props {
  username: string
  data: ClashRoyaleStats
}

export default function ClashRoyaleCard({ username, data }: Props) {
  const winRate = data.wins && data.battleCount && data.battleCount > 0
    ? Math.round((data.wins / data.battleCount) * 100)
    : null

  return (
    <div className="bg-[#1a1a24] border border-blue-500/30 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/clashroyale.png" alt="Clash Royale" className="w-10 h-10 rounded-lg object-cover" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">Clash Royale</h3>
          <p className="text-blue-400 text-xs truncate">{data.name || username}</p>
        </div>
        {(data.arena || data.clan) && (
          <div className="text-right text-xs text-gray-500">
            {data.arena && <p className="text-blue-300">{data.arena.name}</p>}
            {data.clan && <p className="text-gray-500 truncate max-w-[80px]">{data.clan.name}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile icon={<Trophy size={11} />} label="Trophies" value={data.trophies.toLocaleString()} />
        <Tile icon={<Star size={11} />} label="Best" value={data.bestTrophies.toLocaleString()} />
        <Tile icon={<BarChart2 size={11} />} label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Battle Record</p>
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<Swords size={11} />} label="Wins" value={data.wins?.toLocaleString() ?? '—'} accent="green" />
          <Tile icon={<Shield size={11} />} label="Losses" value={data.losses?.toLocaleString() ?? '—'} accent="red" />
          <Tile icon={<Gamepad2 size={11} />} label="Battles" value={data.battleCount?.toLocaleString() ?? '—'} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile icon={<Crown size={11} />} label="3-Crown W" value={data.threeCrownWins?.toLocaleString() ?? '—'} />
        <Tile icon={<Target size={11} />} label="Ch. Wins" value={data.challengeMaxWins?.toLocaleString() ?? '—'} />
        <Tile icon={<Star size={11} />} label="Ch. Cards" value={data.challengeCardsWon?.toLocaleString() ?? '—'} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<Heart size={11} />} label="Donations" value={data.totalDonations?.toLocaleString() ?? '—'} />
        <FavCardTile card={data.currentFavouriteCard} />
      </div>
    </div>
  )
}

function Tile({ icon, label, value, accent }: {
  icon: ReactNode
  label: string
  value: string
  accent?: 'green' | 'red'
}) {
  const valueClass = accent === 'green'
    ? 'text-green-400'
    : accent === 'red'
      ? 'text-red-400'
      : 'text-blue-400'

  return (
    <div className="bg-[#0f0f13] rounded-lg p-3">
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-base font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

function FavCardTile({ card }: { card?: { name: string; iconUrls?: { medium: string } } }) {
  return (
    <div className="bg-[#0f0f13] rounded-lg p-3 flex items-center gap-2">
      {card?.iconUrls?.medium ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.iconUrls.medium} alt={card.name} className="w-8 h-8 object-contain" />
      ) : (
        <Star size={20} className="text-blue-400/40" />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
          <Heart size={10} />
          <span>Fav Card</span>
        </div>
        <p className="text-xs font-bold text-blue-300 truncate">{card?.name ?? '—'}</p>
      </div>
    </div>
  )
}
