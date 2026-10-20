"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, post } from "@/lib/client";
import { GoogleLink, Modal, Notice, PasswordField } from "./ui";
import { useTrove } from "./trove-context";
export function AuthDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => Promise<void>;
}) {
  const { capabilities } = useTrove();
  return <Authentication {...props} googleAuth={capabilities.googleAuth} />;
}
export function Authentication({
  open = true,
  onOpenChange = () => {},
  onAuthenticated,
  googleAuth,
  returnTo,
  inline = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAuthenticated: () => Promise<void>;
  googleAuth: boolean;
  returnTo?: string;
  inline?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(""),
    [verificationEmail, setVerificationEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [resendAt, setResendAt] = useState<string | null>(null),
    [seconds, setSeconds] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setError("");
    setPassword("");
  }, [open, mode]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setChecking(true);
    api<{
      email: string;
      verified: boolean;
      sent: boolean;
      resendAt: string | null;
    }>("/auth/verification", { signal: controller.signal })
      .then((status) => {
        if (!status.verified) {
          setVerificationEmail(status.email);
          setSent(status.sent);
          setResendAt(status.resendAt);
        }
      })
      .catch(() => {
        /* No pending signup in this browser. */
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [open]);
  useEffect(() => {
    if (!resendAt || !open) {
      setSeconds(0);
      return;
    }
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          Math.ceil((new Date(resendAt).getTime() - Date.now()) / 1000),
        ),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt, open]);
  useEffect(() => {
    if (open && verificationEmail) codeRef.current?.focus();
  }, [open, verificationEmail]);
  async function sendCode() {
    let result;
    try {
      result = await post<{
        sent: boolean;
        verified: boolean;
        resendAt: string | null;
      }>("/auth/verification/send");
    } catch (error) {
      const status = await api<{ sent: boolean; resendAt: string | null }>(
        "/auth/verification",
      ).catch(() => null);
      if (status) {
        setSent(status.sent);
        setResendAt(status.resendAt);
      }
      throw error;
    }
    if (result.verified) {
      await onAuthenticated();
      return;
    }
    setSent(result.sent);
    setResendAt(result.resendAt);
    setCode("");
    codeRef.current?.focus();
  }
  const title = verificationEmail
    ? "Verify your email"
    : mode === "register"
      ? "Create your account"
      : "Welcome back";
  const description = verificationEmail
    ? `${sent ? "Enter the code sent to" : "Confirm your address:"} ${verificationEmail}${sent ? ". It expires in 10 minutes." : "."}`
    : undefined;
  const content = (
    <>
      {verificationEmail ? (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await post("/auth/verification/confirm", { code });
              setVerificationEmail("");
              setCode("");
              await onAuthenticated();
            } catch (e) {
              setError((e as Error).message);
              codeRef.current?.focus();
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <Notice kind="error">{error}</Notice>}
          <label>
            Verification code
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </label>
          <button
            className="button button-primary"
            disabled={busy || code.length !== 6}
          >
            {busy ? "Please wait…" : "Verify email"}
          </button>
          {sent && (
            <small className="muted" role="status">
              Code sent. Check your inbox or spam folder.
            </small>
          )}
          <div className="auth-actions">
            <button
              type="button"
              className="text-button"
              disabled={busy || seconds > 0}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await sendCode();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {seconds > 0
                ? `Resend in ${seconds}s`
                : sent
                  ? "Resend code"
                  : "Send code"}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await post("/auth/logout");
                  setVerificationEmail("");
                  setCode("");
                  setSent(false);
                  setResendAt(null);
                  setMode("login");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Use another account
            </button>
          </div>
        </form>
      ) : (
        <>
          {googleAuth && (
            <div className="google-sign-in">
              <GoogleLink
                href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo || (typeof window === "undefined" ? "/dashboard" : location.pathname + location.search))}`}
              >
                Continue with Google
              </GoogleLink>
              <p className="auth-divider">
                <span>or</span>
              </p>
            </div>
          )}
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await post<{ signedIn: boolean; email: string }>(
                  `/auth/${mode}`,
                  { name, email, password },
                );
                setPassword("");
                if (result.signedIn) await onAuthenticated();
                else {
                  setVerificationEmail(result.email);
                  setSent(false);
                  setCode("");
                  setResendAt(null);
                  await sendCode();
                }
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
            <PasswordField
              label="Password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "register" ? 12 : 1}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={mode === "register" ? "At least 12 characters." : undefined}
            />
            <button
              className="button button-primary"
              disabled={busy || checking}
            >
              {busy || checking
                ? "Please wait…"
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
            </button>
            <div className="auth-actions">
              <button
                type="button"
                className="text-button"
                disabled={busy}
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
        </>
      )}
    </>
  );
  return inline ? (
    <section className="sign-in-form" aria-labelledby="sign-in-title">
      <header>
        <h1 id="sign-in-title">{title}</h1>
        <p>{description || "A clearer place to begin your research."}</p>
      </header>
      {content}
    </section>
  ) : (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      {content}
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
    <section className="panel recovery-panel page-enter">
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
            <PasswordField
              label="New password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 12 characters."
            />
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
      <Link className="text-link" href="/discover">
        Back to catalogue
      </Link>
    </section>
  );
}
