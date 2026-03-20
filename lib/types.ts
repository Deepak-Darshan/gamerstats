export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  invite_token?: string
  created_at: string
}

export interface LinkedAccount {
  id: string
  user_id: string
  platform: 'chess' | 'brawlstars' | 'clashroyale'
  platform_username: string
  created_at: string
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

// Chess.com stats (combined from /stats and /player endpoints)
interface ChessRecord {
  win: number
  draw: number
  loss: number
}

interface ChessMode {
  last?: { rating: number; date?: number }
  best?: { rating: number; date?: number }
  record?: ChessRecord
}

export interface ChessStats {
  chess_rapid?: ChessMode
  chess_blitz?: ChessMode
  chess_bullet?: ChessMode
  tactics?: { highest?: { rating: number }; lowest?: { rating: number } }
  fide?: number
  // From /player profile endpoint
  avatar?: string
  country?: string
  last_online?: number
  name?: string
}

// Brawl Stars stats
export interface BrawlBrawler {
  name: string
  power: number
  trophies: number
  highestTrophies?: number
}

export interface BrawlStarsStats {
  name: string
  trophies: number
  highestTrophies: number
  expLevel: number
  '3vs3Victories'?: number
  soloVictories?: number
  duoVictories?: number
  brawlers?: BrawlBrawler[]
  powerPlayPoints?: number
  highestPowerPlayPoints?: number
  club?: { name: string }
}

// Clash Royale stats
export interface ClashRoyaleStats {
  name: string
  trophies: number
  bestTrophies: number
  expLevel: number
  arena?: { name: string }
  wins?: number
  losses?: number
  battleCount?: number
  threeCrownWins?: number
  challengeMaxWins?: number
  challengeCardsWon?: number
  totalDonations?: number
  clan?: { name: string }
  currentFavouriteCard?: { name: string; iconUrls?: { medium: string } }
}

export interface GameStats {
  platform: LinkedAccount['platform']
  username: string
  data: ChessStats | BrawlStarsStats | ClashRoyaleStats | null
  error?: string
}
