// One browser/OAuth return policy. API and external destinations are never accepted.
export function safeReturnPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/dashboard";
  const url = new URL(value, "https://trove.invalid");
  return url.origin === "https://trove.invalid" &&
    ([
      "/dashboard",
      "/discover",
      "/workspace",
      "/connect",
      "/account",
      "/purchases",
      "/seller",
      "/oauth/authorize",
    ].includes(url.pathname) ||
      /^\/purchases\/[a-zA-Z0-9_-]+$/.test(url.pathname))
    ? url.pathname + url.search
    : "/dashboard";
}
