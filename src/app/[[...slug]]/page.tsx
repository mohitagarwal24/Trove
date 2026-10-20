import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { TroveApp } from "@/components/trove-app";
import { Landing } from "@/components/landing";
import { SignIn } from "@/components/sign-in";
import { authenticate } from "@/server/auth";
import { capabilities, appUrl } from "@/lib/config";
import { safeReturnPath } from "@/lib/routes";
import "../landing.css";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug = [] } = await params,
    route = slug.join("/");
  if (!route) return <Landing />;
  if (route === "dashboard" || route === "sign-in") {
    const query = await searchParams,
      raw = typeof query.returnTo === "string" ? query.returnTo : undefined;
    const cookie = (await headers()).get("cookie") || "";
    let signedIn = false;
    try {
      await authenticate(new Request(appUrl(), { headers: { cookie } }));
      signedIn = true;
    } catch (error) {
      if (![401, 403].includes((error as { status?: number }).status || 0))
        throw error;
    }
    if (route === "dashboard" && !signedIn)
      redirect("/sign-in?returnTo=%2Fdashboard");
    if (route === "sign-in") {
      if (signedIn) {
        if (typeof query.auth_error === "string")
          redirect(
            `/account?auth_error=${encodeURIComponent(query.auth_error)}`,
          );
        redirect(safeReturnPath(raw));
      }
      return <SignIn googleAuth={capabilities().googleAuth} />;
    }
  }
  if (
    ![
      "dashboard",
      "discover",
      "workspace",
      "purchases",
      "seller",
      "connect",
      "account",
      "privacy",
      "terms",
      "reset-password",
    ].includes(route) &&
    !(
      slug.length === 2 &&
      slug[0] === "purchases" &&
      /^[a-zA-Z0-9_-]+$/.test(slug[1])
    )
  )
    notFound();
  return <TroveApp />;
}
