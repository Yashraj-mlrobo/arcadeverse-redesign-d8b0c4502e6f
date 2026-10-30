import { useEffect, useRef, useState } from "react";
import type { GetGamesByIdResponse } from "../api/generated";
import GameFrame from "../components/GameFrame";
import { recordRecentPlay } from "../lib/recent";

type Status = "idle" | "playing" | "paused" | "won" | "lost";

const GRID = 20;

export default function SnakeGame({ game, soundOn, onToggleSound }: { game: GetGamesByIdResponse; soundOn: boolean; onToggleSound: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [snake, setSnake] = useState([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 10 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });

  const randomFood = (blocked: { x: number; y: number }[]) => {
    let point = { x: 0, y: 0 };
    do {
      point = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (blocked.some((s) => s.x === point.x && s.y === point.y));
    return point;
  };

  const reset = () => {
    const start = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    setSnake(start);
    setFood(randomFood(start));
    setScore(0);
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
  };

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      const d = nextDirRef.current;
      dirRef.current = d;
      setSnake((prev) => {
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y };
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
          setStatus("lost");
          return prev;
        }
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setStatus("lost");
          return prev;
        }
        const grown = head.x === food.x && head.y === food.y;
        const next = [head, ...prev];
        if (!grown) next.pop();
        if (grown) {
          setScore((s) => s + 10);
          setFood(randomFood(next));
        }
        return next;
      });
    }, 140);
    return () => window.clearInterval(timer);
  }, [status, food]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cell = canvas.width / GRID;
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(canvas.width, i * cell);
      ctx.stroke();
    }
    ctx.fillStyle = "#22c55e";
    snake.forEach((s, i) => {
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
      if (i === 0) {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(s.x * cell + 3, s.y * cell + 3, cell - 6, cell - 6);
        ctx.fillStyle = "#22c55e";
      }
    });
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);
  }, [snake, food, status]);

  useEffect(() => {
    if (status !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      let nd: { x: number; y: number } | null = null;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") nd = { x: 0, y: -1 };
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") nd = { x: 0, y: 1 };
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") nd = { x: -1, y: 0 };
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") nd = { x: 1, y: 0 };
      if (!nd) return;
      e.preventDefault();
      if (nd.x === -dirRef.current.x && nd.y === -dirRef.current.y) return;
      nextDirRef.current = nd;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status]);

  useEffect(() => {
    if (status === "lost") recordRecentPlay(game.id, game.title, score);
  }, [status, game.id, game.title, score]);

  const setDirection = (nd: { x: number; y: number }) => {
    if (nd.x === -dirRef.current.x && nd.y === -dirRef.current.y) return;
    nextDirRef.current = nd;
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
      touchControls={
        <>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn-secondary" type="button" onClick={() => setDirection({ x: 0, y: -1 })}>↑</button>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn-secondary" type="button" onClick={() => setDirection({ x: -1, y: 0 })}>←</button>
            <button className="btn btn-secondary" type="button" onClick={() => setDirection({ x: 0, y: 1 })}>↓</button>
            <button className="btn btn-secondary" type="button" onClick={() => setDirection({ x: 1, y: 0 })}>→</button>
          </div>
        </>
      }
    >
      <canvas ref={canvasRef} className="game-canvas" width={400} height={400} aria-label="Snake game board" />
    </GameFrame>
  );
}
