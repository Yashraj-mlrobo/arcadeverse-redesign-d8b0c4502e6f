import { useAsync } from "../lib/useAction";
import { api } from "../api/generated";
import { errorMessage, errorStatus } from "../lib/useAction";
import { Page, Stat, Skeleton, Alert, EmptyState, Grid } from "../components/ui";
import { getRecentPlays } from "../lib/recent";

export default function ProfilePage() {
  const profile = useAsync(() => api.getProfile(), "profile");
  const achievements = useAsync(() => api.getAchievementsMe(), "achievements");
  const leaderboard = useAsync(() => api.getLeaderboard(), "leaderboard");
  const recent = getRecentPlays();

  if (profile.loading) {
    return (
      <Page title="Profile" subtitle="Loading your arcade identity…">
        <Skeleton lines={6} />
      </Page>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <Page title="Profile" subtitle="We could not load your profile" actions={<button className="btn btn-secondary" type="button" onClick={profile.reload}>Retry</button>}>
        <Alert tone="error">{profile.error ? errorMessage(profile.error) : "Profile unavailable"}</Alert>
        {errorStatus(profile.error) === 401 && <p className="muted">Please log in to view your profile.</p>}
      </Page>
    );
  }

  const p = profile.data;
  const entry = (leaderboard.data ?? []).find((item) => item.username === p.username);
  const highestRecent = recent.length > 0 ? Math.max(...recent.map((item) => item.score)) : undefined;
  const xpTotal = Math.max(1, p.xp + p.xpToNext);
  const xpPercent = Math.min(100, Math.round((p.xp / xpTotal) * 100));

  return (
    <Page title="Profile" subtitle="Your arcade identity and progress" actions={<a className="btn btn-primary" href="#/games">Play now</a>}>
      <section className="profile-header">
        {p.avatarUrl ? (
          <img className="profile-avatar" src={p.avatarUrl} alt={p.username} />
        ) : (
          <div className="profile-avatar brand-mark">{p.username.slice(0, 1).toUpperCase()}</div>
        )}
        <div>
          <h2>{p.username}</h2>
          <p className="muted">Level {p.level}</p>
          <div className="xp-bar" aria-label="Experience progress">
            <span style={{ width: `${xpPercent}%` }} />
          </div>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
            {p.xp} / {xpTotal} XP · {p.achievementCount} achievements
          </p>
        </div>
      </section>

      <Grid min={180}>
        <Stat label="Games played" value={entry?.gamesPlayed ?? 0} />
        <Stat label="Total score" value={entry?.score ?? 0} />
        <Stat label="Games won" value="—" hint="Not tracked yet" />
        <Stat label="Highest score" value={highestRecent ?? "—"} hint="From recent plays" />
      </Grid>

      {recent.length > 0 && (
        <section>
          <h2>Recent activity</h2>
          <div className="stack">
            {recent.map((item) => (
              <article key={`${item.gameId}-${item.date}`} className="card" style={{ padding: 12 }}>
                <strong>{item.title}</strong>
                <span className="muted"> · Score {item.score} · {item.date}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Achievements</h2>
        {achievements.loading && <Skeleton lines={4} />}
        {achievements.error && <Alert tone="error">{errorMessage(achievements.error)}</Alert>}
        {!achievements.loading && !achievements.error && (achievements.data?.length ?? 0) === 0 && (
          <EmptyState title="No achievements yet" action={<a className="btn btn-primary" href="#/games">Start playing</a>}>
            Unlock badges by playing games.
          </EmptyState>
        )}
        <div className="achievement-grid">
          {(achievements.data ?? []).map((achievement) => (
            <article key={achievement.id} className="achievement-badge">
              {achievement.iconUrl ? (
                <img src={achievement.iconUrl} alt={achievement.name} />
              ) : (
                <div className="brand-mark" style={{ width: 48, height: 48, borderRadius: 12 }}>
                  {achievement.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <strong>{achievement.name}</strong>
              <span className="muted" style={{ fontSize: "0.88rem" }}>{achievement.description}</span>
              <span className="muted" style={{ fontSize: "0.78rem" }}>Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}</span>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
