"""Tests for: Arcadeverse API. Every test starts with an EMPTY database (see fresh_db)."""

import os
import tempfile
import uuid

import pytest

os.environ["AF_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")  # must be set before importing the app

from fastapi.testclient import TestClient  # noqa: E402

from backend.app import app, get_conn  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    """Empty every table before each test, so tests never see each other's rows."""
    with get_conn() as conn:
        tables = [r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")]
        for table in tables:
            conn.execute(f'DELETE FROM "{table}"')
    yield


def unique(prefix: str = "user") -> str:
    return prefix + "_" + uuid.uuid4().hex[:8]


def register(username=None, password="secret123"):
    username = username or unique()
    response = client.post("/api/register", json={"username": username, "password": password})
    assert response.status_code == 200
    return username, response.json()["token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ---- tests: at least one per contract endpoint, plus auth and validation failures --
def test_register_success():
    username = unique()
    response = client.post("/api/register", json={"username": username, "password": "secret123"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == username
    assert isinstance(data["token"], str)
    assert data["token"]


def test_register_validation_errors():
    assert client.post("/api/register", json={}).status_code == 400
    assert client.post("/api/register", json={"username": "ab", "password": "secret123"}).status_code == 400
    assert client.post("/api/register", json={"username": "validname", "password": "123"}).status_code == 400
    assert client.post("/api/register", json={"username": "validname", "password": "secret123", "extra": "x"}).status_code == 400


def test_register_duplicate_username():
    username = unique()
    assert client.post("/api/register", json={"username": username, "password": "secret123"}).status_code == 200
    response = client.post("/api/register", json={"username": username, "password": "secret123"})
    assert response.status_code == 400


def test_login_success():
    username = unique()
    client.post("/api/register", json={"username": username, "password": "secret123"})
    response = client.post("/api/login", json={"username": username, "password": "secret123"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == username
    assert isinstance(data["token"], str)
    assert data["token"]


def test_login_invalid_credentials():
    username = unique()
    client.post("/api/register", json={"username": username, "password": "secret123"})
    assert client.post("/api/login", json={"username": username, "password": "wrongpass"}).status_code == 401
    assert client.post("/api/login", json={"username": "missing_user", "password": "secret123"}).status_code == 401


def test_login_validation_errors():
    assert client.post("/api/login", json={}).status_code == 400
    assert client.post("/api/login", json={"username": "ab", "password": "secret123"}).status_code == 400


def test_games_empty():
    response = client.get("/api/games")
    assert response.status_code == 200
    assert response.json() == []


def test_games_list_and_detail():
    with get_conn() as conn:
        cursor = conn.execute(
            "INSERT INTO games (title, genre, description, difficulty, artwork_url) VALUES (?, ?, ?, ?, ?)",
            ("Neon Snake", "Arcade", "Guide the glowing snake.", "Medium", "/images/games/neon-snake.jpg"),
        )
        game_id = cursor.lastrowid

    response = client.get("/api/games")
    assert response.status_code == 200
    games = response.json()
    assert len(games) == 1
    assert set(games[0]) == {"id", "title", "genre", "description", "difficulty", "artworkUrl"}
    assert games[0]["id"] == game_id

    response = client.get(f"/api/games/{game_id}")
    assert response.status_code == 200
    game = response.json()
    assert game["id"] == game_id
    assert game["title"] == "Neon Snake"
    assert set(game) == {"id", "title", "genre", "description", "difficulty", "artworkUrl"}


def test_game_not_found():
    assert client.get("/api/games/999").status_code == 404


def test_game_invalid_id():
    assert client.get("/api/games/0").status_code == 400
    assert client.get("/api/games/abc").status_code == 400


def test_profile_success():
    username, token = register()
    response = client.get("/api/profile", headers=auth_header(token))
    assert response.status_code == 200
    profile = response.json()
    assert profile["username"] == username
    assert set(profile) == {"id", "username", "avatarUrl", "level", "xp", "xpToNext", "achievementCount"}
    assert profile["level"] >= 1
    assert profile["xp"] >= 0
    assert profile["xpToNext"] >= 1
    assert profile["achievementCount"] >= 0


def test_profile_auth_failures():
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/profile", headers={"Authorization": "Bearer invalid-token"}).status_code == 401


def test_profile_achievement_count():
    username, token = register()
    with get_conn() as conn:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        conn.execute(
            "INSERT INTO achievements (user_id, name, description, icon_url, unlocked_at) VALUES (?, ?, ?, ?, ?)",
            (user["id"], "First Win", "Won your first game.", "/images/achievements/first-win.png", "2024-09-01T10:30:00Z"),
        )
    response = client.get("/api/profile", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json()["achievementCount"] == 1


def test_achievements_success():
    username, token = register()
    with get_conn() as conn:
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        conn.execute(
            "INSERT INTO achievements (user_id, name, description, icon_url, unlocked_at) VALUES (?, ?, ?, ?, ?)",
            (user["id"], "First Win", "Won your first game.", "/images/achievements/first-win.png", "2024-09-01T10:30:00Z"),
        )

    response = client.get("/api/achievements/me", headers=auth_header(token))
    assert response.status_code == 200
    achievements = response.json()
    assert len(achievements) == 1
    assert set(achievements[0]) == {"id", "name", "description", "iconUrl", "unlockedAt"}
    assert achievements[0]["name"] == "First Win"
    assert achievements[0]["unlockedAt"] == "2024-09-01T10:30:00Z"


def test_achievements_empty():
    _, token = register()
    response = client.get("/api/achievements/me", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json() == []


def test_achievements_auth_failures():
    assert client.get("/api/achievements/me").status_code == 401
    assert client.get("/api/achievements/me", headers={"Authorization": "Bearer invalid-token"}).status_code == 401


def test_leaderboard_empty():
    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    assert response.json() == []


def test_leaderboard_entries():
    user_one, _ = register()
    user_two, _ = register()
    with get_conn() as conn:
        conn.execute("UPDATE users SET score = 100, games_played = 5 WHERE username = ?", (user_one,))
        conn.execute("UPDATE users SET score = 200, games_played = 7 WHERE username = ?", (user_two,))

    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 2
    assert entries[0]["username"] == user_two
    assert entries[0]["rank"] == 1
    assert entries[0]["score"] == 200
    assert entries[0]["gamesPlayed"] == 7
    assert entries[1]["username"] == user_one
    assert entries[1]["rank"] == 2
    assert set(entries[0]) == {"rank", "username", "avatarUrl", "score", "gamesPlayed"}
