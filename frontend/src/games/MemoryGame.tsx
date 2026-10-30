import { useEffect, useState } from "react";
import type { GetGamesByIdResponse } from "../api/generated";
import GameFrame from "../components/GameFrame";
import { recordRecentPlay } from "../lib/recent";

type Status = "idle" | "playing" | "paused" | "won" | "lost";

interface Card {
  id: number;
  pair: number;
  flipped: boolean;
  matched: boolean;
}

const PAIR_COLORS = ["#22c55e", "#f97316", "#3b82f6", "#ec4899", "#06b6d4", "#a855f7", "#eab308", "#14b8a6"];

export default function MemoryGame({ game, soundOn, onToggleSound }: { game: GetGamesByIdResponse; soundOn: boolean; onToggleSound: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [cards, setCards] = useState<Card[]>([]);
  const [first, setFirst] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (status === "playing" && cards.length === 0) {
      const deck = [...Array.from({ length: 8 }, (_, i) => i), ...Array.from({ length: 8 }, (_, i) => i)]
        .sort(() => Math.random() - 0.5)
        .map((pair, id) => ({ id, pair, flipped: false, matched: false }));
      setCards(deck);
      setFirst(null);
      setLock(false);
      setMoves(0);
      setScore(0);
    }
  }, [status, cards.length]);

  useEffect(() => {
    if (status === "playing" && cards.length > 0 && cards.every((c) => c.matched)) {
      setStatus("won");
    }
  }, [cards, status]);

  useEffect(() => {
    if (status === "won") recordRecentPlay(game.id, game.title, score);
  }, [status, game.id, game.title, score]);

  const reset = () => {
    setCards([]);
    setFirst(null);
    setLock(false);
    setMoves(0);
    setScore(0);
  };

  const flipCard = (id: number) => {
    if (lock || status !== "playing") return;
    const card = cards[id];
    if (!card || card.flipped || card.matched) return;

    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));

    if (first === null) {
      setFirst(id);
      return;
    }

    setLock(true);
    setMoves((m) => m + 1);
    const other = cards[first];
    if (other.pair === card.pair) {
      setCards((prev) => prev.map((c) => (c.id === id || c.id === first ? { ...c, matched: true } : c)));
      setScore((s) => s + 20);
      setFirst(null);
      setLock(false);
    } else {
      window.setTimeout(() => {
        setCards((prev) => prev.map((c) => (c.id === id || c.id === first ? { ...c, flipped: false } : c)));
        setFirst(null);
        setLock(false);
      }, 750);
    }
  };

  return (
    <GameFrame
      title={game.title}
      score={score}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      onExit={() => setStatus("idle")}
      status={status}
      onStart={() => {
        reset();
        setStatus("playing");
      }}
      onPause={() => setStatus("paused")}
      onResume={() => setStatus("playing")}
      onRestart={() => {
        reset();
        setStatus("playing");
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          padding: 12,
        }}
      >
        {cards.map((card) => {
          const visible = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flipCard(card.id)}
              style={{
                aspectRatio: "1",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                background: visible ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #7c3aed, #00e5ff)",
                color: "#fff",
                fontSize: "1.4rem",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              aria-label={visible ? `Matched card ${card.pair + 1}` : "Hidden card"}
            >
              {visible ? (
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: PAIR_COLORS[card.pair],
                    boxShadow: `0 0 16px ${PAIR_COLORS[card.pair]}`,
                  }}
                />
              ) : (
                "?"
              )}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>Moves: {moves}</p>
    </GameFrame>
  );
}
