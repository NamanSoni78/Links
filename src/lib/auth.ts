/**
 * Links — authentication core.
 * PBKDF2 password hashing (WebCrypto, no native deps) + jose JWT
 * sessions in an httpOnly cookie + short-lived reset tokens.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { get } from "./db";
import type { SessionUser } from "./types";

const SESSION_COOKIE = "links_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

function secretKey(): Uint8Array {
  const s =
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
      ? process.env.AUTH_SECRET
      : "links-insecure-dev-secret";
  return new TextEncoder().encode(s);
}

/* ── secret hashing (passwords + OTP codes) ─────────────────── */

function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
function fromB64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

async function pbkdf2(value: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashSecret(value: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(value, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifySecret(value: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterStr || !saltB64 || !hashB64) return false;
  const actual = await pbkdf2(value, fromB64(saltB64), parseInt(iterStr, 10));
  const expected = fromB64(hashB64);
  if (actual.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ── session tokens ─────────────────────────────────────────── */

export async function createSession(userId: string, email: string): Promise<void> {
  const token = await new SignJWT({ email, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Returns the signed-in user, or null.
 * Verifies the JWT *and* re-checks the user row so deleted /
 * locked accounts lose access immediately.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "session" || !payload.sub) return null;
    const row = await get<{ id: string; email: string; email_verified: number }>(
      "SELECT id, email, email_verified FROM users WHERE id = ?",
      [payload.sub]
    );
    if (!row || !row.email_verified) return null;
    return { id: row.id, email: row.email };
  } catch {
    return null;
  }
}

