import { useEffect, useRef, useState } from "react";
import type { GetGamesByIdResponse } from "../api/generated";
import GameFrame from "../components/GameFrame";
import { recordRecentPlay } from "../lib/recent";

type Status = "idle" | "playing" | "paused" | "won" | "lost";

const W = 480;
const H = 360;
const PLAYER_W = 36;
const PLAYER_H = 18;
const PLAYER_Y = H - 34;
const BULLET_SPEED = 7;
const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;

interface Enemy {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
}

interface State {
  playerX: number;
  bullets: Bullet[];
  enemies: Enemy[];
  enemyDir: number;
  enemyTimer: number;
  score: number;
  lives: number;
  keys: { left: boolean; right: boolean };
  shootCooldown: number;
  shootQueued: boolean;
}

export default function SpaceGame({ game, soundOn, onToggleSound }: { game: GetGamesByIdResponse; soundOn: boolean; onToggleSound: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State>({
    playerX: W / 2 - PLAYER_W / 2,
    bullets: [],
    enemies: [],
    enemyDir: 1,
    enemyTimer: 0,
    score: 0,
    lives: 3,
    keys: { left: false, right: false },
    shootCooldown: 0,
    shootQueued: false,
  });

  const makeEnemies = (): Enemy[] => {
    const enemies: Enemy[] = [];
    for (let r = 0; r < ENEMY_ROWS; r++) {
      for (let c = 0; c < ENEMY_COLS; c++) {
        enemies.push({ x: 40 + c * 50, y: 40 + r * 34, alive: true });
      }
    }
    return enemies;
  };

  const resetState = () => {
    stateRef.current = {
      playerX: W / 2 - PLAYER_W / 2,
      bullets: [],
      enemies: makeEnemies(),
      enemyDir: 1,
      enemyTimer: 0,
      score: 0,
      lives: 3,
      keys: { left: false, right: false },
      shootCooldown: 0,
      shootQueued: false,
    };
    setScore(0);
    setLives(3);
  };

  const draw = (s: State) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(s.playerX, PLAYER_Y, PLAYER_W, PLAYER_H);
    ctx.fillStyle = "#f472b6";
    s.bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 6, 4, 10));
    s.enemies.forEach((e) => {
      if (!e.alive) return;
      ctx.fillStyle = "#818cf8";
      ctx.fillRect(e.x, e.y, 30, 20);
      ctx.fillStyle = "#c4b5fd";
      ctx.fillRect(e.x + 10, e.y - 4, 10, 6);
    });
  };

  useEffect(() => {
    if (status !== "playing") return;
    let raf = 0;
    const loop = () => {
      const s = stateRef.current;
      if (s.keys.left) s.playerX = Math.max(0, s.playerX - 5);
      if (s.keys.right) s.playerX = Math.min(W - PLAYER_W, s.playerX + 5);

      if (s.shootCooldown > 0) s.shootCooldown -= 1;
      if (s.shootQueued && s.shootCooldown === 0) {
        s.bullets.push({ x: s.playerX + PLAYER_W / 2, y: PLAYER_Y });
        s.shootCooldown = 18;
        s.shootQueued = false;
      }

      s.bullets = s.bullets
        .map((b) => ({ x: b.x, y: b.y - BULLET_SPEED }))
        .filter((b) => b.y > -10);

      s.enemyTimer += 1;
      if (s.enemyTimer > 28) {
        let hitEdge = false;
        s.enemies.forEach((e) => {
          if (!e.alive) return;
          e.x += 12 * s.enemyDir;
          if (e.x <= 10 || e.x >= W - 40) hitEdge = true;
        });
        if (hitEdge) {
          s.enemyDir *= -1;
          s.enemies.forEach((e) => {
            if (e.alive) e.y += 18;
          });
        }
        s.enemyTimer = 0;
      }

      const hitBullets = new Set<number>();
      s.bullets.forEach((b, bi) => {
        s.enemies.forEach((e) => {
          if (!e.alive) return;
          if (b.x > e.x && b.x < e.x + 30 && b.y > e.y && b.y < e.y + 20) {
            e.alive = false;
            hitBullets.add(bi);
            s.score += 10;
          }
        });
      });
      s.bullets = s.bullets.filter((_, i) => !hitBullets.has(i));

      if (s.enemies.some((e) => e.alive && e.y + 20 >= PLAYER_Y)) {
        setStatus("lost");
      }
      if (s.enemies.every((e) => !e.alive)) {
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
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        stateRef.current.shootQueued = true;
      }
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

  const queueShot = () => {
    stateRef.current.shootQueued = true;
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
          <button className="btn btn-primary" type="button" onClick={queueShot}>
            Fire
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
      <canvas ref={canvasRef} className="game-canvas" width={W} height={H} aria-label="Space invaders board" />
    </GameFrame>
  );
}
