import { notFound } from "next/navigation";
import { TroveApp } from "@/components/trove-app";
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const route = slug.join("/");
  if (
    ![
      "",
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
