import { useEffect, useState } from "react";
import type { GetGamesByIdResponse } from "../api/generated";
import GameFrame from "../components/GameFrame";
import { recordRecentPlay } from "../lib/recent";

type Status = "idle" | "playing" | "paused" | "won" | "lost";

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWin(board: string[], player: string) {
  return LINES.some((line) => line.every((i) => board[i] === player));
}

export default function TicTacGame({ game, soundOn, onToggleSound }: { game: GetGamesByIdResponse; soundOn: boolean; onToggleSound: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [score, setScore] = useState(0);

  const reset = () => {
    setBoard(Array(9).fill(""));
  };

  useEffect(() => {
    if (status === "won" || status === "lost") recordRecentPlay(game.id, game.title, score);
  }, [status, game.id, game.title, score]);

  const finishMove = (next: string[]) => {
    if (checkWin(next, "X")) {
      setScore((s) => s + 10);
      setStatus("won");
      return true;
    }
    if (next.every(Boolean)) {
      setStatus("lost");
      return true;
    }
    return false;
  };

  const playCell = (index: number) => {
    if (status !== "playing" || board[index]) return;
    const next = [...board];
    next[index] = "X";
    setBoard(next);
    if (finishMove(next)) return;

    window.setTimeout(() => {
      setBoard((current) => {
        const empties = current.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
        if (empties.length === 0) return current;
        const ai = empties[Math.floor(Math.random() * empties.length)];
        const aiBoard = [...current];
        aiBoard[ai] = "O";
        if (checkWin(aiBoard, "O")) {
          setStatus("lost");
        } else if (aiBoard.every(Boolean)) {
          setStatus("lost");
        }
        return aiBoard;
      });
    }, 350);
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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          width: "100%",
          maxWidth: 320,
          margin: "0 auto",
          padding: 12,
        }}
      >
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            onClick={() => playCell(index)}
            style={{
              aspectRatio: "1",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: cell === "X" ? "#00e5ff" : "#f472b6",
              fontSize: "2rem",
              fontWeight: 800,
              cursor: status === "playing" && !cell ? "pointer" : "default",
            }}
            aria-label={`Cell ${index + 1}`}
          >
            {cell}
          </button>
        ))}
      </div>
    </GameFrame>
  );
}
