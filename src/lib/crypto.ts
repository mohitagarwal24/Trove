import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
export const hash = (input: string) =>
  createHash("sha256").update(input).digest("hex");
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await derive(password, salt)).toString("hex");
}
export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [salt, digest] = stored.split(":");
  if (!salt || !digest || !/^[a-f0-9]{128}$/i.test(digest)) return false;
  const candidate = await derive(password, salt),
    expected = Buffer.from(digest, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
function key() {
  const value = process.env.RESULT_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error(
      "RESULT_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters.",
    );
  return Buffer.from(value, "hex");
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((b) => b.toString("base64"))
    .join(".");
}
export function decrypt<T = unknown>(value: string): T {
  const [iv, tag, data] = value.split(".").map((x) => Buffer.from(x, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
  ) as T;
}
