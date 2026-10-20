import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/server/auth";
import { validateAuthorization } from "@/server/agent-oauth";
import { appUrl } from "@/lib/config";
import { AuthorizeConnection } from "@/components/authorize-connection";
import "../../landing.css";
export const dynamic = "force-dynamic";
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  let validated: Awaited<ReturnType<typeof validateAuthorization>>;
  try {
    if (Object.values(raw).some((v) => Array.isArray(v)))
      throw new Error("Repeated connection parameters are not allowed.");
    validated = await validateAuthorization(raw);
  } catch (e) {
    return (
      <AuthorizeConnection
        error={e instanceof Error ? e.message : "Invalid connection request."}
      />
    );
  }
  const query = new URLSearchParams(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  let actor;
  try {
    actor = await authenticate(
      new Request(appUrl(), {
        headers: { cookie: (await headers()).get("cookie") || "" },
      }),
    );
  } catch (e) {
    if (![401, 403].includes((e as { status?: number }).status || 0)) throw e;
    redirect(
      `/sign-in?returnTo=${encodeURIComponent(`/oauth/authorize?${query}`)}`,
    );
  }
  return (
    <AuthorizeConnection
      connection={{
        name: validated.client.name,
        redirectUri: validated.request.redirect_uri,
        email: actor.email,
        userId: actor.id,
        scopes: validated.scopes,
        request: validated.request,
      }}
    />
  );
}
