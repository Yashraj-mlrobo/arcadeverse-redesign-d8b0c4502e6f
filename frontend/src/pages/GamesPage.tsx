import { useState } from "react";
import { useAsync } from "../lib/useAction";
import { api } from "../api/generated";
import { getRecentPlays } from "../lib/recent";
import { Page, Button, Skeleton, EmptyState, Alert, Toolbar, Field } from "../components/ui";

const palettes = ["#22c55e", "#f97316", "#3b82f6", "#ec4899", "#06b6d4"];

export default function GamesPage() {
  const { data: games, error, loading, reload } = useAsync(() => api.getGames(), "games");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const recent = getRecentPlays();

  if (loading) {
    return (
      <Page title="Game library" subtitle="Loading titles…">
        <Skeleton lines={8} />
      </Page>
    );
  }
  if (error) {
    return (
      <Page title="Game library" subtitle="We could not load the library" actions={<Button onClick={reload}>Retry</Button>}>
        <Alert tone="error">{error.message}</Alert>
      </Page>
    );
  }
  if (!games || games.length === 0) {
    return (
      <Page title="Game library" subtitle="No titles available">
        <EmptyState title="Library empty" action={<Button onClick={reload}>Refresh</Button>}>No games published yet.</EmptyState>
      </Page>
    );
  }

  const filtered = games.filter((g) => {
    const matchesCategory = category === "All" || g.difficulty === category;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const featured = games[0];

  return (
    <Page title="Game library" subtitle="Browse, search, and launch every arcade title" actions={<a className="btn btn-primary" href={`#/game/${featured.id}`}>Featured: {featured.title}</a>}>
      <section className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
          <div style={{ position: "relative", minHeight: 220, backgroundImage: `url(${featured.artworkUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(7,11,24,0.9), rgba(7,11,24,0.35))" }} />
            <div style={{ position: "relative", padding: 24, display: "grid", gap: 10, maxWidth: 520 }}>
              <span className="hero-eyebrow">Featured banner</span>
              <h2 style={{ fontFamily: "Orbitron, var(--font)", fontSize: "1.6rem" }}>{featured.title}</h2>
              <p style={{ color: "#c7d2ee" }}>{featured.description}</p>
              <div className="row">
                <span className="badge badge-primary">{featured.genre}</span>
                <span className="badge">{featured.difficulty}</span>
              </div>
              <a className="btn btn-primary" href={`#/game/${featured.id}`} style={{ width: "fit-content" }}>Play featured</a>
            </div>
          </div>
        </div>
      </section>

      <Toolbar>
        <Field label="Search games" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title, genre, description" />
        <div className="row">
          {["All", "Easy", "Medium", "Hard"].map((c) => (
            <Button key={c} variant={category === c ? "primary" : "secondary"} onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" action={<Button onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</Button>}>Try a different search.</EmptyState>
      ) : (
        <div className="grid library-grid" style={{ ["--min" as string]: "280px" }}>
          {filtered.map((game, i) => (
            <article key={game.id} className="game-card" style={{ ["--accent" as string]: `${palettes[i % palettes.length]}66` }}>
              <div className="game-card-art" style={{ backgroundImage: `url(${game.artworkUrl})` }} />
              <div className="game-card-shade" />
              <div className="game-card-body">
                <div className="game-card-title">{game.title}</div>
                <div className="game-card-meta">
                  <span className="badge badge-primary">{game.genre}</span>
                  <span className="badge">{game.difficulty}</span>
                </div>
                <p className="game-card-desc">{game.description}</p>
                <div className="game-card-actions">
                  <a className="btn btn-primary" href={`#/game/${game.id}`}>Play</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 12 }}>Recently played</h2>
          <div className="card">
            <ul className="list">
              {recent.map((r) => (
                <li key={`${r.gameId}-${r.date}`}>
                  <div style={{ flex: 1 }}>
                    <strong>{r.title}</strong>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>{r.date}</div>
                  </div>
                  <span className="badge badge-primary">Score {r.score}</span>
                  <a className="btn btn-ghost" href={`#/game/${r.gameId}`}>Play again</a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 style={{ marginBottom: 12 }}>Popular now</h2>
        <div className="game-rail">
          {games.slice(0, 4).map((game, i) => (
            <article key={game.id} className="game-card" style={{ ["--accent" as string]: `${palettes[i % palettes.length]}66` }}>
              <div className="game-card-art" style={{ backgroundImage: `url(${game.artworkUrl})` }} />
              <div className="game-card-shade" />
              <div className="game-card-body">
                <div className="game-card-title">{game.title}</div>
                <a className="btn btn-primary" href={`#/game/${game.id}`}>Play</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
