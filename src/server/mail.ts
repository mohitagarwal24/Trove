import { assert } from "@/lib/errors";
export const emailConfigured = () =>
  !!(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.MAIL_FROM
  );
export async function sendResetEmail(to: string, url: string) {
  await sendEmail(
    to,
    "Reset your Trove password",
    `Reset your password:\n\n${url}\n\nThis link expires in 30 minutes and can be used once. If you didn't request it, ignore this email.`,
  );
}
export async function sendVerificationEmail(to: string, code: string) {
  await sendEmail(
    to,
    "Verify your Trove email",
    `Your Trove verification code is:\n\n${code}\n\nIt expires in 10 minutes and can be used once. Enter it in the browser where you requested it. If you didn't request it, ignore this email.`,
  );
}
async function sendEmail(to: string, subject: string, body: string) {
  // HTTPS works on free hosting, where outbound SMTP ports are blocked.
  assert(
    emailConfigured(),
    "EMAIL_UNAVAILABLE",
    "Email delivery is temporarily unavailable. Please try again later.",
    503,
  );
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const token = await tokenResponse.json();
  assert(
    tokenResponse.ok && token.access_token,
    "EMAIL_UNAVAILABLE",
    "Email delivery is temporarily unavailable. Please try again later.",
    503,
  );
  const from = process.env.MAIL_FROM!;
  assert(
    !/[\r\n]/.test(from + to),
    "INVALID_ADDRESS",
    "Email address is invalid.",
  );
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }),
      signal: AbortSignal.timeout(15000),
    },
  );
  assert(
    response.ok,
    "EMAIL_UNAVAILABLE",
    "Email delivery is temporarily unavailable. Please try again later.",
    503,
  );
}
