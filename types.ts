export interface Credentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface Game {
  id: number;
  title: string;
  genre: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  artworkUrl: string;
}

export interface Profile {
  id: number;
  username: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNext: number;
  achievementCount: number;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  gamesPlayed: number;
}
