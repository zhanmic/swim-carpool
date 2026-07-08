import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

export function generateTeamApiKey(): string {
  return `sc_${randomBytes(24).toString("base64url")}`;
}

export function hashTeamApiKey(apiKey: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(apiKey, salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyTeamApiKey(apiKey: string, stored: string | null | undefined): boolean {
  if (!stored || !apiKey) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  const hash = scryptSync(apiKey, salt, KEY_LEN, SCRYPT_PARAMS);
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
