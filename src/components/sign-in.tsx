"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Authentication } from "./auth";
import { Logo, Notice } from "./ui";
import { safeReturnPath } from "@/lib/routes";
export function SignIn({ googleAuth }: { googleAuth: boolean }) {
  const params = useSearchParams(),
    router = useRouter();
  const returnTo = safeReturnPath(params.get("returnTo"));
  const errors: Record<string, string> = {
    google_start: "Google sign-in is unavailable. Please try again.",
    google_callback: "Google sign-in could not be completed. Please try again.",
    google_link:
      "Sign in with your email first, then connect Google in Account.",
  };
  const error = errors[params.get("auth_error") || ""];
  return (
    <main className="sign-in-page">
      <header className="sign-in-brand">
        <Link href="/" aria-label="Trove home">
          <Logo />
        </Link>
      </header>
      <div className="sign-in-main">
        <Link className="sign-in-back" href="/">
          <ArrowLeft size={16} /> Back to Trove
        </Link>
        <div className="sign-in-inner">
          {error && <Notice kind="error">{error}</Notice>}
          <Authentication
            inline
            googleAuth={googleAuth}
            returnTo={returnTo}
            onAuthenticated={async () => {
              router.replace(returnTo);
              router.refresh();
            }}
          />
          <p className="sign-in-legal">
            By continuing, you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
