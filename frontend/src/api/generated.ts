// GENERATED from contract/openapi.yaml by AgentForge. Do not edit: regenerate from the contract instead.


const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const TOKEN_KEY = "app.token";

// Storage can be unavailable (sandboxed preview iframes, private mode): fall back to memory.
let memoryToken: string | null = null;
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) ?? memoryToken; } catch { return memoryToken; }
}
export function setToken(token: string | null): void {
  memoryToken = token;
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch { /* memory only */ }
}

/** Error from the API: `status` is the HTTP status (0 = network failure), `message` is the server's detail. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function detailMessage(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d))).join("; ");
  return `Request failed (HTTP ${status})`;
}

async function request<T>(method: string, path: string, opts: { body?: unknown; query?: object; auth: boolean }): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {}) as [string, unknown][]) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (opts.auth && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}${qs.toString() ? `?${qs}` : ""}`, {
      method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }
  const text = await res.text();
  let data: unknown = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
  if (!res.ok) {
    const detail = data && typeof data === "object" && "detail" in data ? (data as { detail: unknown }).detail : data;
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, detailMessage(detail, res.status), detail);
  }
  return data as T;
}

export interface PostRegisterRequest {
  username: string;
  password: string;
}

export interface PostRegisterResponse {
  token: string;
  username: string;
}

export interface PostLoginRequest {
  username: string;
  password: string;
}

export interface PostLoginResponse {
  token: string;
  username: string;
}

export interface GetGamesItem {
  id: number;
  title: string;
  genre: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  artworkUrl: string;
}

export type GetGamesResponse = GetGamesItem[];

export interface GetGamesByIdResponse {
  id: number;
  title: string;
  genre: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  artworkUrl: string;
}

export interface GetProfileResponse {
  id: number;
  username: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNext: number;
  achievementCount: number;
}

export interface GetAchievementsMeItem {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: string;
}

export type GetAchievementsMeResponse = GetAchievementsMeItem[];

export interface GetLeaderboardItem {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  gamesPlayed: number;
}

export type GetLeaderboardResponse = GetLeaderboardItem[];


export const api = {
  /** POST /api/register - Register a new user */
  postRegister: (body: PostRegisterRequest): Promise<PostRegisterResponse> =>
    request<PostRegisterResponse>("POST", `/api/register`, { body, auth: false }),
  /** POST /api/login - Log in an existing user */
  postLogin: (body: PostLoginRequest): Promise<PostLoginResponse> =>
    request<PostLoginResponse>("POST", `/api/login`, { body, auth: false }),
  /** GET /api/games - Get list of all games */
  getGames: (): Promise<GetGamesResponse> =>
    request<GetGamesResponse>("GET", `/api/games`, { auth: false }),
  /** GET /api/games/{id} - Get a single game by ID */
  getGamesById: (id: number): Promise<GetGamesByIdResponse> =>
    request<GetGamesByIdResponse>("GET", `/api/games/${encodeURIComponent(String(id))}`, { auth: false }),
  /** GET /api/profile (requires login) - Get authenticated user's profile */
  getProfile: (): Promise<GetProfileResponse> =>
    request<GetProfileResponse>("GET", `/api/profile`, { auth: true }),
  /** GET /api/achievements/me (requires login) - Get achievements for the current user */
  getAchievementsMe: (): Promise<GetAchievementsMeResponse> =>
    request<GetAchievementsMeResponse>("GET", `/api/achievements/me`, { auth: true }),
  /** GET /api/leaderboard - Get leaderboard ranking */
  getLeaderboard: (): Promise<GetLeaderboardResponse> =>
    request<GetLeaderboardResponse>("GET", `/api/leaderboard`, { auth: false }),
};


/** Every contract operation (used by AgentForge checks). */
export const endpoints = [
  { name: "postRegister", method: "POST", path: "/api/register", auth: false },
  { name: "postLogin", method: "POST", path: "/api/login", auth: false },
  { name: "getGames", method: "GET", path: "/api/games", auth: false },
  { name: "getGamesById", method: "GET", path: "/api/games/{id}", auth: false },
  { name: "getProfile", method: "GET", path: "/api/profile", auth: true },
  { name: "getAchievementsMe", method: "GET", path: "/api/achievements/me", auth: true },
  { name: "getLeaderboard", method: "GET", path: "/api/leaderboard", auth: false },
] as const;
