import type { FormEvent } from "react";
import { useState } from "react";
import { useHashRoute } from "../lib/useHashRoute";
import { useAction } from "../lib/useAction";
import { api, setToken, type PostLoginRequest } from "../api/generated";
import { errorMessage } from "../lib/useAction";
import { AuthLayout, Button, Field, Alert } from "../components/ui";

export default function LoginPage({ onSignedIn }: { onSignedIn: (username: string) => void }) {
  const [, navigate] = useHashRoute("login");
  const login = useAction((body: PostLoginRequest) => api.postLogin(body));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { username?: string; password?: string } = {};
    if (!username.trim()) next.username = "Username is required";
    if (!password) next.password = "Password is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const out = await login.run({ username: username.trim(), password });
    if (out) {
      setToken(out.token);
      onSignedIn(out.username);
      navigate("home");
    }
  };

  return (
    <AuthLayout brand="Arcadeverse" title="Log in" subtitle="Enter the arcade" footer={<span>New here? <a href="#/register">Create an account</a></span>}>
      <form className="stack" onSubmit={onSubmit}>
        {login.error && <Alert tone="error">{login.error}</Alert>}
        <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} autoComplete="username" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="current-password" />
        <Button type="submit" loading={login.pending} className="btn-block">Log in</Button>
      </form>
    </AuthLayout>
  );
}
