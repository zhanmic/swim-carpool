import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

/** Default deletion password for teams created before this feature shipped. */
export const DEFAULT_EXISTING_TEAM_DELETE_PASSWORD = "delma dolphin";

export function hashTeamPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyTeamPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !password) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
