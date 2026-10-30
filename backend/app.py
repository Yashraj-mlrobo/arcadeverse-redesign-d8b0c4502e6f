"""Backend: Arcadeverse API

Starter template from AgentForge (known to work). Keep the imports and helpers; add your tables to
SCHEMA and implement every contract endpoint in the ROUTES section.
"""

import hashlib
import os
import secrets
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException  # noqa: F401
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field  # noqa: F401

DB_PATH = os.environ.get("AF_DB", str(Path(__file__).resolve().parent / "app.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '/images/avatars/default.png',
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    xp_to_next INTEGER NOT NULL DEFAULT 1000,
    score INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    artwork_url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT NOT NULL,
    unlocked_at TEXT NOT NULL
);
"""  # add the tables this API needs here

DEFAULT_GAMES = [
    ("Neon Snake", "Arcade", "Guide the glowing snake through neon mazes.", "Medium", "/images/games/neon-snake.jpg"),
    ("Brick Breaker", "Arcade", "Break bricks with a bouncing ball.", "Easy", "/images/games/brick-breaker.jpg"),
    ("Space Invaders", "Shooter", "Defend Earth from waves of alien invaders.", "Hard", "/images/games/space-invaders.jpg"),
    ("Memory Flip", "Puzzle", "Match pairs of glowing cards before time runs out.", "Easy", "/images/games/memory-flip.jpg"),
    ("Tic-Tac-Toe Arena", "Strategy", "Outsmart opponents in a competitive arena.", "Medium", "/images/games/tic-tac-toe-arena.jpg"),
]


@contextmanager
def get_conn():
    """Usage: with get_conn() as conn: conn.execute(...). Commits on success, always closes."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row  # rows support row["column"]; SELECT every column you read
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


with get_conn() as _conn:
    _conn.executescript(SCHEMA)
    _game_count = _conn.execute("SELECT COUNT(*) FROM games").fetchone()[0]
    if _game_count == 0:
        _conn.executemany(
            "INSERT INTO games (title, genre, description, difficulty, artwork_url) VALUES (?, ?, ?, ?, ?)",
            DEFAULT_GAMES,
        )

app = FastAPI(title="Arcadeverse API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request, exc):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# ---- auth helpers (use only if the contract has secured endpoints) ----------------
def hash_password(password: str, salt: str | None = None) -> str:
    """Returns one string "salt$digest" to store in users.password_hash (the salt is inside it)."""
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    """password_hash is the stored users.password_hash value."""
    salt = password_hash.split("$", 1)[0]
    return secrets.compare_digest(hash_password(password, salt), password_hash)


def issue_token(conn: sqlite3.Connection, user_id: int) -> str:
    """Call INSIDE the route's `with get_conn() as conn:` block, passing that conn (one connection per request;
    a second connection would hit 'database is locked' while the first holds an uncommitted write)."""
    token = secrets.token_hex(24)
    conn.execute("INSERT INTO tokens (token, user_id) VALUES (?, ?)", (token, user_id))
    return token


def current_user(authorization: str | None = Header(default=None)) -> sqlite3.Row:
    """FastAPI dependency: `user = Depends(current_user)` -> row with id, username. 401 if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    with get_conn() as conn:
        row = conn.execute("SELECT users.id, users.username FROM tokens JOIN users ON users.id = tokens.user_id "
                           "WHERE tokens.token = ?", (authorization[len("Bearer "):],)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="invalid token")
    return row


# ---- Pydantic models ------------------------------------------------------------
class Credentials(BaseModel):
    model_config = {"extra": "forbid"}

    username: str = Field(min_length=3)
    password: str = Field(min_length=6)


# ---- ROUTES: implement every endpoint of the contract below ----------------------
@app.post("/api/register", status_code=200)
def register(credentials: Credentials):
    try:
        with get_conn() as conn:
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (credentials.username, hash_password(credentials.password)),
            )
            user_id = cursor.lastrowid
            token = issue_token(conn, user_id)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="username already taken")
    return {"token": token, "username": credentials.username}


@app.post("/api/login", status_code=200)
def login(credentials: Credentials):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE username = ?",
            (credentials.username,),
        ).fetchone()
        if row is None or not verify_password(credentials.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="invalid credentials")
        token = issue_token(conn, row["id"])
    return {"token": token, "username": credentials.username}


@app.get("/api/games", status_code=200)
def get_games():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, genre, description, difficulty, artwork_url FROM games ORDER BY id"
        ).fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "genre": row["genre"],
            "description": row["description"],
            "difficulty": row["difficulty"],
            "artworkUrl": row["artwork_url"],
        }
        for row in rows
    ]


@app.get("/api/games/{id}", status_code=200)
def get_game(id: int):
    if id < 1:
        raise HTTPException(status_code=400, detail="id must be at least 1")
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, title, genre, description, difficulty, artwork_url FROM games WHERE id = ?",
            (id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="game not found")
    return {
        "id": row["id"],
        "title": row["title"],
        "genre": row["genre"],
        "description": row["description"],
        "difficulty": row["difficulty"],
        "artworkUrl": row["artwork_url"],
    }


@app.get("/api/profile", status_code=200)
def get_profile(user: sqlite3.Row = Depends(current_user)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, username, avatar_url, level, xp, xp_to_next FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail="invalid token")
        achievement_count = conn.execute(
            "SELECT COUNT(*) FROM achievements WHERE user_id = ?",
            (user["id"],),
        ).fetchone()[0]
    return {
        "id": row["id"],
        "username": row["username"],
        "avatarUrl": row["avatar_url"],
        "level": row["level"],
        "xp": row["xp"],
        "xpToNext": row["xp_to_next"],
        "achievementCount": achievement_count,
    }


@app.get("/api/achievements/me", status_code=200)
def get_my_achievements(user: sqlite3.Row = Depends(current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, description, icon_url, unlocked_at FROM achievements WHERE user_id = ? ORDER BY id",
            (user["id"],),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "iconUrl": row["icon_url"],
            "unlockedAt": row["unlocked_at"],
        }
        for row in rows
    ]


@app.get("/api/leaderboard", status_code=200)
def get_leaderboard():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT username, avatar_url, score, games_played FROM users ORDER BY score DESC, id ASC"
        ).fetchall()
    return [
        {
            "rank": index + 1,
            "username": row["username"],
            "avatarUrl": row["avatar_url"],
            "score": row["score"],
            "gamesPlayed": row["games_played"],
        }
        for index, row in enumerate(rows)
    ]
