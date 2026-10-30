import type { FormEvent } from "react";
import { useState } from "react";
import { useHashRoute } from "../lib/useHashRoute";
import { useAction } from "../lib/useAction";
import { api, setToken, type PostRegisterRequest } from "../api/generated";
import { AuthLayout, Button, Field, Alert } from "../components/ui";

export default function RegisterPage({ onSignedIn }: { onSignedIn: (username: string) => void }) {
  const [, navigate] = useHashRoute("register");
  const register = useAction((body: PostRegisterRequest) => api.postRegister(body));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { username?: string; password?: string } = {};
    if (username.trim().length < 3) next.username = "Username must be at least 3 characters";
    if (password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const out = await register.run({ username: username.trim(), password });
    if (out) {
      setToken(out.token);
      onSignedIn(out.username);
      navigate("home");
    }
  };

  return (
    <AuthLayout brand="Arcadeverse" title="Create account" subtitle="Join the arcade" footer={<span>Already have an account? <a href="#/login">Log in</a></span>}>
      <form className="stack" onSubmit={onSubmit}>
        {register.error && <Alert tone="error">{register.error}</Alert>}
        <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} autoComplete="username" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" hint="At least 6 characters" />
        <Button type="submit" loading={register.pending} className="btn-block">Create account</Button>
      </form>
    </AuthLayout>
  );
}
