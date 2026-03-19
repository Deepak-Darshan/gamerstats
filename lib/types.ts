export interface Profile {
  id: string
  username: string
  avatar_url: string | null
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

// Chess.com stats
export interface ChessStats {
  chess_rapid?: { last?: { rating: number }; best?: { rating: number } }
  chess_blitz?: { last?: { rating: number }; best?: { rating: number } }
  chess_bullet?: { last?: { rating: number }; best?: { rating: number } }
  fide?: number
}

// Brawl Stars stats
export interface BrawlStarsStats {
  name: string
  trophies: number
  highestTrophies: number
  expLevel: number
  brawlers?: { trophies: number }[]
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
}

export interface GameStats {
  platform: LinkedAccount['platform']
  username: string
  data: ChessStats | BrawlStarsStats | ClashRoyaleStats | null
  error?: string
}
