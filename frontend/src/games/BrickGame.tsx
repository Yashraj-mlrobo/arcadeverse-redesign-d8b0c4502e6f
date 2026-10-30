import { useEffect, useRef, useState } from "react";
import type { GetGamesByIdResponse } from "../api/generated";
import GameFrame from "../components/GameFrame";
import { recordRecentPlay } from "../lib/recent";

type Status = "idle" | "playing" | "paused" | "won" | "lost";

const W = 480;
const H = 360;
const PADDLE_W = 90;
const PADDLE_H = 12;
const PADDLE_Y = H - 30;
const BALL_R = 7;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 50;
const BRICK_H = 18;
const BRICK_GAP = 6;
const BRICK_TOP = 40;

interface Brick {
  x: number;
  y: number;
  alive: boolean;
}

interface State {
  paddleX: number;
  ball: { x: number; y: number; vx: number; vy: number };
  bricks: Brick[];
  score: number;
  lives: number;
  keys: { left: boolean; right: boolean };
}

export default function BrickGame({ game, soundOn, onToggleSound }: { game: GetGamesByIdResponse; soundOn: boolean; onToggleSound: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State>({
    paddleX: W / 2 - PADDLE_W / 2,
    ball: { x: W / 2, y: H - 60, vx: 3.2, vy: -3.2 },
    bricks: [],
    score: 0,
    lives: 3,
    keys: { left: false, right: false },
  });

  const makeBricks = (): Brick[] => {
    const bricks: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: 24 + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          alive: true,
        });
      }
    }
    return bricks;
  };

  const resetState = () => {
    stateRef.current = {
      paddleX: W / 2 - PADDLE_W / 2,
      ball: { x: W / 2, y: H - 60, vx: 3.2, vy: -3.2 },
      bricks: makeBricks(),
      score: 0,
      lives: 3,
      keys: { left: false, right: false },
    };
    setScore(0);
    setLives(3);
  };

  const resetBall = (s: State) => {
    s.ball = { x: s.paddleX + PADDLE_W / 2, y: H - 60, vx: 3.2, vy: -3.2 };
  };

  const draw = (s: State) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, W, H);
    const colors = ["#f97316", "#fb923c", "#fdba74", "#facc15", "#fde047"];
    s.bricks.forEach((b, i) => {
      if (!b.alive) return;
      ctx.fillStyle = colors[Math.floor(i / BRICK_COLS) % colors.length];
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
    });
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    if (status !== "playing") return;
    let raf = 0;
    const loop = () => {
      const s = stateRef.current;
      if (s.keys.left) s.paddleX = Math.max(0, s.paddleX - 6);
      if (s.keys.right) s.paddleX = Math.min(W - PADDLE_W, s.paddleX + 6);

      s.ball.x += s.ball.vx;
      s.ball.y += s.ball.vy;

      if (s.ball.x < BALL_R) {
        s.ball.x = BALL_R;
        s.ball.vx = Math.abs(s.ball.vx);
      }
      if (s.ball.x > W - BALL_R) {
        s.ball.x = W - BALL_R;
        s.ball.vx = -Math.abs(s.ball.vx);
      }
      if (s.ball.y < BALL_R) {
        s.ball.y = BALL_R;
        s.ball.vy = Math.abs(s.ball.vy);
      }

      if (
        s.ball.y + BALL_R >= PADDLE_Y &&
        s.ball.x >= s.paddleX &&
        s.ball.x <= s.paddleX + PADDLE_W &&
        s.ball.vy > 0
      ) {
        s.ball.vy = -Math.abs(s.ball.vy);
        const hit = (s.ball.x - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        s.ball.vx = hit * 4;
      }

      for (const b of s.bricks) {
        if (!b.alive) continue;
        if (s.ball.x + BALL_R > b.x && s.ball.x - BALL_R < b.x + BRICK_W && s.ball.y + BALL_R > b.y && s.ball.y - BALL_R < b.y + BRICK_H) {
          b.alive = false;
          s.score += 10;
          s.ball.vy = -s.ball.vy;
          break;
        }
      }

      if (s.ball.y - BALL_R > H) {
        s.lives -= 1;
        if (s.lives <= 0) {
          setStatus("lost");
        } else {
          resetBall(s);
        }
      }

      if (s.bricks.every((b) => !b.alive)) {
        setStatus("won");
      }

      setScore(s.score);
      setLives(s.lives);
      draw(s);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (status === "lost" || status === "won") recordRecentPlay(game.id, game.title, score);
  }, [status, game.id, game.title, score]);

  const setKey = (key: "left" | "right", value: boolean) => {
    stateRef.current.keys[key] = value;
  };

  return (
    <GameFrame
      title={game.title}
      score={score}
      lives={lives}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      onExit={() => setStatus("idle")}
      status={status}
      onStart={() => {
        resetState();
        setStatus("playing");
      }}
      onPause={() => setStatus("paused")}
      onResume={() => setStatus("playing")}
      onRestart={() => {
        resetState();
        setStatus("playing");
      }}
      touchControls={
        <div className="row" style={{ justifyContent: "center" }}>
          <button
            className="btn btn-secondary"
            type="button"
            onMouseDown={() => setKey("left", true)}
            onMouseUp={() => setKey("left", false)}
            onMouseLeave={() => setKey("left", false)}
            onTouchStart={() => setKey("left", true)}
            onTouchEnd={() => setKey("left", false)}
          >
            Left
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onMouseDown={() => setKey("right", true)}
            onMouseUp={() => setKey("right", false)}
            onMouseLeave={() => setKey("right", false)}
            onTouchStart={() => setKey("right", true)}
            onTouchEnd={() => setKey("right", false)}
          >
            Right
          </button>
        </div>
      }
    >
      <canvas ref={canvasRef} className="game-canvas" width={W} height={H} aria-label="Brick breaker board" />
    </GameFrame>
  );
}
