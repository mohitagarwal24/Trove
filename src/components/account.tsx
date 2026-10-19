"use client";
import { useEffect, useState } from "react";
import { api, post } from "@/lib/client";
import { useTrove } from "./trove-app";
import { EmptyState, Modal, Notice, downloadJson } from "./ui";
export function Account() {
  const { user, ensureAuth, refresh, notify } = useTrove();
  const [name, setName] = useState(user?.name || ""),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [closing, setClosing] = useState(false),
    [confirmation, setConfirmation] = useState("");
  useEffect(() => setName(user?.name || ""), [user?.name]);
  if (!user)
    return (
      <EmptyState
        title="Your account"
        description="Sign in to manage your profile and security."
        action={
          <button
            className="button button-primary"
            onClick={() => ensureAuth()}
          >
            Sign in
          </button>
        }
      />
    );
  return (
    <div className="account-page">
      <section className="page-heading compact-heading">
        <div>
          <h1>Account</h1>
          <p>{user.email}</p>
        </div>
      </section>
      {error && <Notice kind="error">{error}</Notice>}
      <section className="panel">
        <h2>Profile</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify({ name }),
              });
              await refresh();
              notify("Profile updated.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Name
            <input
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            Save profile
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Change password</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await post("/auth/change-password", {
                currentPassword: current,
                password,
              });
              setCurrent("");
              setPassword("");
              await refresh();
              notify("Password updated. Sign in again.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            New password
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small>
              At least 12 characters. Updating signs out all sessions and
              revokes agent tokens.
            </small>
          </label>
          <button className="button button-secondary" disabled={busy}>
            Update password
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Your data</h2>
        <p>Download your account and purchase records.</p>
        <button
          className="button button-secondary"
          onClick={async () => {
            try {
              downloadJson(await api("/auth/export"), "trove-account.json");
            } catch (e) {
              notify((e as Error).message, true);
            }
          }}
        >
          Export account data
        </button>
        <button
          className="text-button danger-action"
          onClick={() => setClosing(true)}
        >
          Close account
        </button>
      </section>
      <Modal
        open={closing}
        onOpenChange={setClosing}
        title="Close your account?"
        description="You will lose workspace and purchased-data access. Your profile is removed; transaction records remain for accounting."
      >
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await post("/auth/close-account", { password: confirmation });
              setClosing(false);
              setConfirmation("");
              await refresh();
              notify("Account closed.");
            } catch (e) {
              notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            Close account permanently
          </button>
        </form>
      </Modal>
    </div>
  );
}
