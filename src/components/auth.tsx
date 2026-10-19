"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { post } from "@/lib/client";
import { Modal, Notice } from "./ui";
import { useTrove } from "./trove-app";
export function AuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setError("");
    setPassword("");
  }, [open, mode]);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "register" ? "Create your account" : "Welcome back"}
      description={
        mode === "register"
          ? "Your research and purchases, in one workspace."
          : "Sign in to your workspace."
      }
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await post(`/auth/${mode}`, { name, email, password });
            await onAuthenticated();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice kind="error">{error}</Notice>}
        {mode === "register" && (
          <label>
            Name
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "register" ? 12 : 1}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={mode === "register" ? "password-hint" : undefined}
          />
        </label>
        {mode === "register" && (
          <small id="password-hint" className="muted">
            At least 12 characters.
          </small>
        )}
        <button className="button button-primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </button>
        <div className="auth-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Create an account"
              : "Already have an account? Sign in"}
          </button>
          {mode === "login" && (
            <Link
              className="text-link"
              href="/reset-password"
              onClick={() => onOpenChange(false)}
            >
              Forgot password?
            </Link>
          )}
        </div>
      </form>
    </Modal>
  );
}
export function PasswordRecovery() {
  const { ensureAuth } = useTrove(),
    params = useSearchParams(),
    token = params.get("token");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  return (
    <section className="panel recovery-panel">
      <h1>{token ? "Set a new password" : "Reset your password"}</h1>
      {done ? (
        <>
          <Notice>
            {token
              ? "Password updated. Sign in with your new password."
              : "If your account exists, you’ll receive a reset link."}
          </Notice>
          {token && (
            <button
              className="button button-primary"
              onClick={() => ensureAuth()}
            >
              Sign in
            </button>
          )}
        </>
      ) : (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await post(
                token ? "/auth/reset-password" : "/auth/forgot-password",
                token ? { token, password } : { email },
              );
              setDone(true);
              setPassword("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <Notice kind="error">{error}</Notice>}
          {token ? (
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <small>At least 12 characters.</small>
            </label>
          ) : (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <button className="button button-primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : token
                ? "Save password"
                : "Send reset link"}
          </button>
        </form>
      )}
      <Link className="text-link" href="/">
        Back to catalogue
      </Link>
    </section>
  );
}
