import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "Trove — Better data. Clearer answers.",
  description:
    "Discover, compare, and purchase precisely scoped data for your next research task. Human-approved spending, transparent sources, and traceable receipts.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
