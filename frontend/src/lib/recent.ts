export interface RecentPlay {
  gameId: number;
  title: string;
  score: number;
  date: string;
}

export function getRecentPlays(): RecentPlay[] {
  try {
    const raw = localStorage.getItem("arcadeverse_recent");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentPlay[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentPlay(gameId: number, title: string, score: number): void {
  const list = getRecentPlays();
  list.unshift({ gameId, title, score, date: new Date().toLocaleDateString() });
  const seen = new Set<number>();
  const unique: RecentPlay[] = [];
  for (const item of list) {
    if (seen.has(item.gameId)) continue;
    seen.add(item.gameId);
    unique.push(item);
    if (unique.length >= 8) break;
  }
  localStorage.setItem("arcadeverse_recent", JSON.stringify(unique));
}
