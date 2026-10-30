import { useEffect, useState } from "react";
import { useHashRoute } from "./lib/useHashRoute";
import { useAsync, useAction } from "./lib/useAction";
import { api, getToken, setToken, type PostLoginResponse } from "./api/generated";
import { errorMessage, errorStatus } from "./lib/useAction";
import { AppShell } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import GamesPage from "./pages/GamesPage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import AchievementsPage from "./pages/AchievementsPage";

export default function App() {
  const [route, navigate] = useHashRoute("home");
  const [authed, setAuthed] = useState(() => !!getToken());
  const [soundOn, setSoundOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const profile = useAsync(() => (authed ? api.getProfile() : Promise.resolve(null)), authed ? "profile" : "none");

  useEffect(() => {
    if (authed && profile.error && errorStatus(profile.error) === 401) {
      setToken("");
      localStorage.removeItem("arcadeverse_user");
      setAuthed(false);
    }
  }, [authed, profile.error]);

  const handleSignedIn = (username: string) => {
    localStorage.setItem("arcadeverse_user", username);
    setAuthed(true);
  };

  const logout = () => {
    setToken("");
    localStorage.removeItem("arcadeverse_user");
    setAuthed(false);
    navigate("home");
  };

  if (!authed) {
    if (route === "register") {
      return <RegisterPage onSignedIn={handleSignedIn} />;
    }
    return <LoginPage onSignedIn={handleSignedIn} />;
  }

  const segment = route.split("/").filter(Boolean)[0] || "home";
  const gameId = Number(route.split("/")[1]);

  const nav = [
    { href: "#/", label: "Discover" },
    { href: "#/games", label: "Games" },
    { href: "#/leaderboard", label: "Leaderboard" },
    { href: "#/achievements", label: "Achievements" },
  ];

  const username = profile.data?.username ?? localStorage.getItem("arcadeverse_user") ?? "Player";
  const avatarUrl = profile.data?.avatarUrl ?? "";

  const right = (
    <>
      <button className="btn btn-ghost icon-btn" type="button" onClick={() => setSoundOn((s) => !s)} aria-label="Toggle sound">
        {soundOn ? "🔊" : "🔇"}
      </button>
      <a className="avatar-chip" href="#/profile">
        {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span className="brand-mark">{username.slice(0, 1).toUpperCase()}</span>}
        <span>{username}</span>
      </a>
      <div className="profile-menu">
        <button className="btn btn-ghost" type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
          Account ▾
        </button>
        {menuOpen && (
          <div className="menu-pop">
            <a href="#/profile" onClick={() => setMenuOpen(false)}>Profile</a>
            <a href="#/achievements" onClick={() => setMenuOpen(false)}>Achievements</a>
            <button type="button" onClick={logout}>Sign out</button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <AppShell brand="Arcadeverse" nav={nav} current={segment === "home" ? "" : segment} right={right}>
      {segment === "home" && <HomePage />}
      {segment === "games" && <GamesPage />}
      {segment === "game" && <GamePage id={Number.isFinite(gameId) ? gameId : 1} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} />}
      {segment === "leaderboard" && <LeaderboardPage currentUsername={username} />}
      {segment === "profile" && <ProfilePage />}
      {segment === "achievements" && <AchievementsPage />}
      {!["home", "games", "game", "leaderboard", "profile", "achievements"].includes(segment) && <HomePage />}
    </AppShell>
  );
}
