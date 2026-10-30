import type { ReactNode } from "react";
import { Button } from "./ui";

type Status = "idle" | "playing" | "paused" | "won" | "lost";

export default function GameFrame({
  title,
  score,
  lives,
  soundOn,
  onToggleSound,
  onExit,
  status,
  onStart,
  onPause,
  onResume,
  onRestart,
  children,
  touchControls,
}: {
  title: string;
  score: number;
  lives?: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  status: Status;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  children: ReactNode;
  touchControls?: ReactNode;
}) {
  return (
    <div className="game-shell">
      <div className="game-topbar">
        <div>
          <div className="game-title">{title}</div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>Arcadeverse arena</div>
        </div>
        <div className="row">
          <span className="badge badge-primary">Score {score}</span>
          {typeof lives === "number" && <span className="badge">Lives {lives}</span>}
        </div>
        <div className="row">
          {status === "playing" && <Button variant="secondary" onClick={onPause}>Pause</Button>}
          {status === "paused" && <Button variant="secondary" onClick={onResume}>Resume</Button>}
          <Button variant="secondary" onClick={onRestart}>Restart</Button>
          <Button variant="ghost" onClick={onToggleSound}>{soundOn ? "🔊" : "🔇"}</Button>
          <a className="btn btn-ghost" href="#/games" onClick={onExit}>Exit</a>
        </div>
      </div>

      <div className="canvas-wrap">
        {children}
        {status !== "playing" && (
          <div className="game-overlay">
            <div className="game-overlay-card">
              {status === "idle" && (
                <>
                  <div className="game-overlay-title">Ready?</div>
                  <p className="muted">Press play to start. Use keyboard or touch controls.</p>
                  <Button onClick={onStart}>Play</Button>
                </>
              )}
              {status === "paused" && (
                <>
                  <div className="game-overlay-title">Paused</div>
                  <p className="muted">Take a breath, then jump back in.</p>
                  <Button onClick={onResume}>Resume</Button>
                </>
              )}
              {status === "won" && (
                <>
                  <div className="game-overlay-title">Victory</div>
                  <p className="muted">Final score: {score}</p>
                  <div className="row" style={{ justifyContent: "center" }}>
                    <Button onClick={onRestart}>Play again</Button>
                    <a className="btn btn-secondary" href="#/games">Exit</a>
                  </div>
                </>
              )}
              {status === "lost" && (
                <>
                  <div className="game-overlay-title">Game over</div>
                  <p className="muted">Final score: {score}</p>
                  <div className="row" style={{ justifyContent: "center" }}>
                    <Button onClick={onRestart}>Retry</Button>
                    <a className="btn btn-secondary" href="#/games">Exit</a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {touchControls && <div className="touch-controls">{touchControls}</div>}
    </div>
  );
}
