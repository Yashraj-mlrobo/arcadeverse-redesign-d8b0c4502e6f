import { useAsync } from "../lib/useAction";
import { api } from "../api/generated";
import { errorStatus } from "../lib/useAction";
import { Page, Button, Skeleton, Alert, EmptyState } from "../components/ui";

export default function AchievementsPage() {
  const { data, error, loading, reload } = useAsync(() => api.getAchievementsMe(), "achievements");

  if (loading) {
    return (
      <Page title="Achievements" subtitle="Loading your badges…">
        <Skeleton lines={6} />
      </Page>
    );
  }
  if (error) {
    return (
      <Page title="Achievements" subtitle="We could not load achievements" actions={<Button onClick={reload}>Retry</Button>}>
        <Alert tone="error">{error.message}</Alert>
        {errorStatus(error) === 401 && <p className="muted">Please log in to view achievements.</p>}
      </Page>
    );
  }

  const achievements = data ?? [];
  if (achievements.length === 0) {
    return (
      <Page title="Achievements" subtitle="Badges you have unlocked" actions={<a className="btn btn-primary" href="#/games">Play now</a>}>
        <EmptyState title="No achievements yet" action={<a className="btn btn-primary" href="#/games">Start playing</a>}>
          Play games to unlock your first badge.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page title="Achievements" subtitle="Badges you have unlocked" actions={<a className="btn btn-primary" href="#/games">Play now</a>}>
      <div className="achievement-grid">
        {achievements.map((achievement) => (
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
    </Page>
  );
}
