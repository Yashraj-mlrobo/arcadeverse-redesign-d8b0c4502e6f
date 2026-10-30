import { useAsync } from "../lib/useAction";
import { api } from "../api/generated";
import { errorStatus } from "../lib/useAction";
import { Page, Button, Skeleton, Alert, EmptyState } from "../components/ui";

export default function LeaderboardPage({ currentUsername }: { currentUsername?: string }) {
  const { data, error, loading, reload } = useAsync(() => api.getLeaderboard(), "leaderboard");

  if (loading) {
    return (
      <Page title="Leaderboard" subtitle="Loading rankings…">
        <Skeleton lines={8} />
      </Page>
    );
  }
  if (error) {
    return (
      <Page title="Leaderboard" subtitle="We could not load rankings" actions={<Button onClick={reload}>Retry</Button>}>
        <Alert tone="error">{error.message}</Alert>
      </Page>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <Page title="Leaderboard" subtitle="No scores yet">
        <EmptyState title="Leaderboard empty" action={<Button onClick={reload}>Refresh</Button>}>Be the first to play.</EmptyState>
      </Page>
    );
  }

  const topThree = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <Page title="Leaderboard" subtitle="Top players across every arcade title" actions={<a className="btn btn-primary" href="#/games">Play now</a>}>
      {errorStatus(error) === 401 && <Alert tone="error">Please log in to view your ranking.</Alert>}
      <div className="podium">
        {topThree.map((player) => (
          <div key={player.rank} className={`podium-slot ${player.rank === 1 ? "first" : ""}`}>
            {player.avatarUrl ? (
              <img className="podium-avatar" src={player.avatarUrl} alt={player.username} />
            ) : (
              <div className="podium-avatar" style={{ display: "grid", placeItems: "center", background: "var(--surface-2)" }}>
                {player.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="podium-rank">#{player.rank}</div>
            <div className="podium-name">{player.username}</div>
            <div className="podium-score">{player.score} pts · {player.gamesPlayed} games</div>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <section className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Player</th>
                    <th scope="col">Score</th>
                    <th scope="col">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((player) => {
                    const isCurrent = !!currentUsername && player.username === currentUsername;
                    return (
                      <tr key={player.rank} style={isCurrent ? { background: "var(--primary-soft)" } : undefined}>
                        <td>#{player.rank}</td>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            {player.avatarUrl ? (
                              <img src={player.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <span className="brand-mark" style={{ width: 28, height: 28, fontSize: "0.8rem" }}>
                                {player.username.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span>{player.username}</span>
                            {isCurrent && <span className="badge badge-primary">You</span>}
                          </div>
                        </td>
                        <td>{player.score}</td>
                        <td>{player.gamesPlayed}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </Page>
  );
}
