import { useEffect, useState } from "react";
import { useAsync } from "../lib/useAction";
import { api } from "../api/generated";
import { Page, Button, Skeleton, EmptyState, Alert } from "../components/ui";

const palettes = [
  { accent: "#22c55e", glow: "rgba(34,197,94,0.45)" },
  { accent: "#f97316", glow: "rgba(249,115,22,0.45)" },
  { accent: "#3b82f6", glow: "rgba(59,130,246,0.45)" },
  { accent: "#ec4899", glow: "rgba(236,72,153,0.45)" },
  { accent: "#06b6d4", glow: "rgba(6,182,212,0.45)" },
];

export default function HomePage() {
  const { data: games, error, loading, reload } = useAsync(() => api.getGames(), "games");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!games || games.length === 0) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % games.length), 6500);
    return () => clearInterval(timer);
  }, [games]);

  if (loading) {
    return (
      <Page title="Discover" subtitle="Loading the arcade…">
        <Skeleton lines={6} />
      </Page>
    );
  }
  if (error) {
    return (
      <Page title="Discover" subtitle="We could not reach the arcade" actions={<Button onClick={reload}>Retry</Button>}>
        <Alert tone="error">{error.message}</Alert>
      </Page>
    );
  }
  if (!games || games.length === 0) {
    return (
      <Page title="Discover" subtitle="No games available yet">
        <EmptyState title="The arcade is empty" action={<Button onClick={reload}>Refresh</Button>}>Check back soon.</EmptyState>
      </Page>
    );
  }

  const featured = games[index % games.length];
  const palette = palettes[index % palettes.length];

  return (
    <Page title="Discover" subtitle="A premium arcade of handcrafted games" actions={<a className="btn btn-primary" href="#/games">Explore games</a>}>
      <section className="hero" style={{ ["--accent" as string]: palette.glow }}>
        <div className="hero-art" style={{ backgroundImage: `url(${featured.artworkUrl})` }} />
        <div className="hero-overlay" />
        <div className="hero-particles" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${i * 0.7}s`, animationDuration: `${7 + (i % 5)}s` }} />
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-eyebrow">Featured game · {featured.genre}</div>
          <h1 className="hero-title">Enter the arcade</h1>
          <p className="hero-sub">
            Step into {featured.title}. {featured.description} Built for fast reflexes, deep focus, and one more run.
          </p>
          <div className="hero-meta">
            <span className="badge badge-primary">{featured.difficulty}</span>
            <span>{featured.title}</span>
          </div>
          <div className="row">
            <a className="btn btn-primary" href={`#/game/${featured.id}`}>Play now</a>
            <a className="btn btn-secondary" href="#/games">Explore games</a>
          </div>
        </div>
      </section>

      <section>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div className="titles">
            <h2>Featured games</h2>
            <p>Hand-picked titles with distinct worlds and mechanics.</p>
          </div>
          <div className="row">
            <Button variant="ghost" onClick={() => setIndex((i) => (i - 1 + games.length) % games.length)}>Prev</Button>
            <Button variant="ghost" onClick={() => setIndex((i) => (i + 1) % games.length)}>Next</Button>
          </div>
        </div>
        <div className="game-rail">
          {games.map((game, i) => {
            const p = palettes[i % palettes.length];
            return (
              <article key={game.id} className="game-card" style={{ ["--accent" as string]: p.glow }}>
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
                    <a className="btn btn-ghost" href={`#/game/${game.id}`}>Details</a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </Page>
  );
}
