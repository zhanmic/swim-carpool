import { timingSafeEqual } from "crypto";

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;

  const provided = Buffer.from(password);
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) return false;

  return timingSafeEqual(provided, secret);
}
