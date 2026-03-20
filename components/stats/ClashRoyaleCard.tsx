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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl">
          👑
        </div>
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

      {/* Trophies + Win rate */}
      <div className="grid grid-cols-3 gap-2">
        <Tile icon="🏆" label="Trophies" value={data.trophies.toLocaleString()} />
        <Tile icon="⭐" label="Best" value={data.bestTrophies.toLocaleString()} />
        <Tile icon="📊" label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} />
      </div>

      {/* Battle record */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Battle Record</p>
        <div className="grid grid-cols-3 gap-2">
          <Tile icon="⚔️" label="Wins" value={data.wins?.toLocaleString() ?? '—'} accent="green" />
          <Tile icon="💀" label="Losses" value={data.losses?.toLocaleString() ?? '—'} accent="red" />
          <Tile icon="🎮" label="Battles" value={data.battleCount?.toLocaleString() ?? '—'} />
        </div>
      </div>

      {/* Challenge & crown stats */}
      <div className="grid grid-cols-3 gap-2">
        <Tile icon="👑" label="3-Crown W" value={data.threeCrownWins?.toLocaleString() ?? '—'} />
        <Tile icon="🎯" label="Ch. Wins" value={data.challengeMaxWins?.toLocaleString() ?? '—'} />
        <Tile icon="🃏" label="Ch. Cards" value={data.challengeCardsWon?.toLocaleString() ?? '—'} />
      </div>

      {/* Donations + Fav card */}
      <div className="grid grid-cols-2 gap-2">
        <Tile icon="💝" label="Donations" value={data.totalDonations?.toLocaleString() ?? '—'} />
        <FavCardTile card={data.currentFavouriteCard} />
      </div>
    </div>
  )
}

function Tile({ icon, label, value, accent }: {
  icon: string
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
      <p className="text-xs text-gray-500 mb-1">{icon} {label}</p>
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
        <span className="text-lg">🃏</span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">❤️ Fav Card</p>
        <p className="text-xs font-bold text-blue-300 truncate">{card?.name ?? '—'}</p>
      </div>
    </div>
  )
}
