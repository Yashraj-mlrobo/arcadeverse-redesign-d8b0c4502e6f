import type { ReactElement } from "react";
import { useState } from "react";
import { useAsync } from "../lib/useAction";
import { api } from "../api/generated";
import { Page, Button, Skeleton, Alert } from "../components/ui";
import SnakeGame from "../games/SnakeGame";
import BrickGame from "../games/BrickGame";
import SpaceGame from "../games/SpaceGame";
import MemoryGame from "../games/MemoryGame";
import TicTacGame from "../games/TicTacGame";

export default function GamePage({ id, soundOn, onToggleSound }: { id: number; soundOn: boolean; onToggleSound: () => void }) {
  const { data: game, error, loading, reload } = useAsync(() => api.getGamesById(id), `game-${id}`);
  const [localSound, setLocalSound] = useState(soundOn);

  if (loading) {
    return (
      <Page title="Loading game" subtitle="Preparing the arena">
        <Skeleton lines={4} />
      </Page>
    );
  }
  if (error || !game) {
    return (
      <Page title="Game unavailable" subtitle="We could not load this title" actions={<Button onClick={reload}>Retry</Button>}>
        <Alert tone="error">{error ? error.message : "Game not found"}</Alert>
      </Page>
    );
  }

  const title = game.title.toLowerCase();
  const commonProps = { game, soundOn: localSound, onToggleSound: () => { setLocalSound((s) => !s); onToggleSound(); } };

  let arena: ReactElement;
  if (title.includes("snake")) arena = <SnakeGame {...commonProps} />;
  else if (title.includes("brick")) arena = <BrickGame {...commonProps} />;
  else if (title.includes("space") || title.includes("invader")) arena = <SpaceGame {...commonProps} />;
  else if (title.includes("memory")) arena = <MemoryGame {...commonProps} />;
  else if (title.includes("tic")) arena = <TicTacGame {...commonProps} />;
  else arena = <SnakeGame {...commonProps} />;

  return (
    <Page title={game.title} subtitle={`${game.genre} · ${game.difficulty}`} actions={<a className="btn btn-secondary" href="#/games">Exit to library</a>}>
      {arena}
    </Page>
  );
}
